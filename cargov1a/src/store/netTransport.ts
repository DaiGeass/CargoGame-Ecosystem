// ============================================================
// NET TRANSPORT
// - LAN real por Tauri/TCP para Hamachi/Radmin/LAN
// - BroadcastChannel para pruebas locales en navegador
// - WebRTC se mantiene como fallback experimental
// ============================================================

export type TransportMessage = {
  type: string;
  from: string;
  to?: string;
  data: any;
  ts: number;
};

export type TransportListener = (msg: TransportMessage) => void;

export interface NetTransport {
  readonly kind: 'lan' | 'webrtc' | 'broadcast' | 'loopback';
  readonly isHost: boolean;
  send(msg: TransportMessage): void;
  onMessage(listener: TransportListener): () => void;
  close(): void;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args);
}

// ─── LAN real por Tauri/TCP ────────────────────────────────
export class LanTransport implements NetTransport {
  readonly kind = 'lan' as const;
  readonly isHost: boolean;

  private listeners: Set<TransportListener> = new Set();
  private selfId: string;
  private ready = false;
  private queue: TransportMessage[] = [];
  private pollTimer: number | null = null;

  constructor(opts: {
    selfId: string;
    isHost: boolean;
    hostIp?: string;
    hostPort?: number;
  }) {
    this.selfId = opts.selfId;
    this.isHost = opts.isHost;

    void this.start(opts);

    this.pollTimer = window.setInterval(() => {
      void this.poll();
    }, 80);
  }

  private async start(opts: { hostIp?: string; hostPort?: number }): Promise<void> {
    const port = Number(opts.hostPort || 9876);

    try {
      if (this.isHost) {
        await invokeTauri<boolean>('lan_start_host', { port });
        console.log(`[LAN] Host escuchando en 0.0.0.0:${port}`);
      } else {
        const host = opts.hostIp || '127.0.0.1';
        await invokeTauri<boolean>('lan_connect', { host, port });
        console.log(`[LAN] Cliente conectado a ${host}:${port}`);
      }

      this.ready = true;
      const pending = [...this.queue];
      this.queue = [];
      pending.forEach(m => this.send(m));
    } catch (err) {
      console.error('[LAN] Error iniciando transporte:', err);
    }
  }

  private async poll(): Promise<void> {
    if (!this.ready) return;

    try {
      const messages = await invokeTauri<TransportMessage[]>('lan_poll');

      for (const msg of messages || []) {
        if (!msg || msg.from === this.selfId) continue;
        if (msg.to && msg.to !== this.selfId) continue;

        this.listeners.forEach(listener => listener(msg));
      }
    } catch {
      // Silencioso para no llenar consola si se cierra el transporte.
    }
  }

  send(msg: TransportMessage): void {
    const full = { ...msg, from: this.selfId };

    if (!this.ready) {
      this.queue.push(full);
      return;
    }

    void invokeTauri<boolean>('lan_send', { message: full }).catch(err => {
      console.error('[LAN] Error enviando mensaje:', err);
    });
  }

  onMessage(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();

    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    void invokeTauri<boolean>('lan_stop').catch(() => {});
  }
}

// ─── BroadcastChannel: pruebas locales ─────────────────────
export class BroadcastTransport implements NetTransport {
  readonly kind = 'broadcast' as const;
  readonly isHost: boolean;

  private channel: BroadcastChannel;
  private listeners: Set<TransportListener> = new Set();
  private selfId: string;

  constructor(roomId: string, selfId: string, isHost: boolean) {
    this.isHost = isHost;
    this.selfId = selfId;
    this.channel = new BroadcastChannel(`cargas_room_${roomId}`);

    this.channel.onmessage = (ev) => {
      const msg = ev.data as TransportMessage;
      if (msg.from === this.selfId) return;
      if (msg.to && msg.to !== this.selfId) return;
      this.listeners.forEach(l => l(msg));
    };
  }

  send(msg: TransportMessage): void {
    this.channel.postMessage({ ...msg, from: this.selfId });
  }

  onMessage(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
    try { this.channel.close(); } catch {}
  }
}

// ─── WebRTC experimental ───────────────────────────────────
export class WebRTCTransport implements NetTransport {
  readonly kind = 'webrtc' as const;
  readonly isHost: boolean;

  private peer: any = null;
  private listeners: Set<TransportListener> = new Set();
  private selfId: string;
  private ready = false;
  private pendingQueue: TransportMessage[] = [];

  constructor(selfId: string, isHost: boolean) {
    this.selfId = selfId;
    this.isHost = isHost;
  }

  async init(onSignal: (signal: any) => void): Promise<void> {
    const SimplePeer = (await import('simple-peer')).default;

    this.peer = new SimplePeer({
      initiator: this.isHost,
      trickle: false,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    this.peer.on('signal', (signal: any) => onSignal(signal));
    this.peer.on('connect', () => {
      this.ready = true;
      this.pendingQueue.forEach(m => this.rawSend(m));
      this.pendingQueue = [];
    });

    this.peer.on('data', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString()) as TransportMessage;
        if (msg.from === this.selfId) return;
        this.listeners.forEach(l => l(msg));
      } catch {}
    });

    this.peer.on('error', (err: any) => {
      console.error('[WebRTC] error', err);
    });
  }

  applySignal(signal: any): void {
    if (this.peer) this.peer.signal(signal);
  }

  private rawSend(msg: TransportMessage): void {
    try {
      this.peer?.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[WebRTC] error enviando', err);
    }
  }

  send(msg: TransportMessage): void {
    const full = { ...msg, from: this.selfId };
    if (this.ready) this.rawSend(full);
    else this.pendingQueue.push(full);
  }

  onMessage(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
  }
}

// ─── Factory ───────────────────────────────────────────────
export function createTransport(opts: {
  roomId: string;
  selfId: string;
  isHost: boolean;
  preferLan?: boolean;
  preferWebRTC?: boolean;
  hostIp?: string;
  hostPort?: number;
}): NetTransport {
  // Para app instalada/Tauri: LAN real por TCP.
  if (opts.preferLan && isTauriRuntime()) {
    return new LanTransport({
      selfId: opts.selfId,
      isHost: opts.isHost,
      hostIp: opts.hostIp,
      hostPort: opts.hostPort,
    });
  }

  // Para navegador/dev local: BroadcastChannel.
  if (!opts.preferWebRTC && typeof BroadcastChannel !== 'undefined') {
    return new BroadcastTransport(opts.roomId, opts.selfId, opts.isHost);
  }

  return new WebRTCTransport(opts.selfId, opts.isHost);
}
