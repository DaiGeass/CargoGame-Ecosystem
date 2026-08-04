// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

#[cfg(target_os = "windows")]
fn shared_root() -> Result<PathBuf, String> {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        return Ok(PathBuf::from(local).join("cargas-ecosystem"));
    }

    let profile = std::env::var("USERPROFILE")
        .map_err(|_| "No se encontró LOCALAPPDATA ni USERPROFILE".to_string())?;

    Ok(PathBuf::from(profile)
        .join("AppData")
        .join("Local")
        .join("cargas-ecosystem"))
}

#[cfg(not(target_os = "windows"))]
fn shared_root() -> Result<PathBuf, String> {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        return Ok(PathBuf::from(xdg).join("cargas-ecosystem"));
    }

    let home = std::env::var("HOME").map_err(|_| "No se encontró HOME".to_string())?;
    Ok(PathBuf::from(home).join(".local").join("share").join("cargas-ecosystem"))
}

fn safe_join(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let rel_path = PathBuf::from(rel);

    if rel_path.is_absolute() {
        return Err("Ruta absoluta no permitida".to_string());
    }

    for part in rel_path.components() {
        if matches!(part, std::path::Component::ParentDir) {
            return Err("No se permite '..' en rutas compartidas".to_string());
        }
    }

    Ok(root.join(rel_path))
}

fn ensure_structure() -> Result<(), String> {
    let root = shared_root()?;

    for folder in [
        "data",
        "data/presence",
        "data/api",
        "data/bridge",
        "data/bridge/inbox",
        "data/bridge/inbox/game",
        "data/bridge/inbox/devtool",
        "data/bridge/inbox/moddingtool",
        "data/saves",
        "mods",
        "dlc",
        "assets",
        "assets/music",
        "assets/sfx",
        "assets/images",
    ] {
        fs::create_dir_all(root.join(folder)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn current_program(app: &tauri::AppHandle, requested: Option<String>) -> String {
    if let Some(p) = requested {
        if p == "game" || p == "devtool" || p == "moddingtool" {
            return p;
        }
    }

    let name = app.package_info().name.to_lowercase();
    let identifier = app.config().identifier.to_lowercase();
    let blob = format!("{} {}", name, identifier);

    if blob.contains("modding") {
        "moddingtool".to_string()
    } else if blob.contains("dev") {
        "devtool".to_string()
    } else {
        "game".to_string()
    }
}

fn inbox_dir(program: &str) -> Result<PathBuf, String> {
    let root = shared_root()?;
    let dir = root.join("data").join("bridge").join("inbox").join(program);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn clean_filename(raw: &str) -> String {
    let s: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect();

    if s.is_empty() {
        format!("msg_{}_{}", now_ms(), std::process::id())
    } else {
        s
    }
}


struct LanState {
    inbox: Arc<Mutex<Vec<serde_json::Value>>>,
    clients: Option<Arc<Mutex<Vec<Arc<Mutex<TcpStream>>>>>>,
    client: Option<Arc<Mutex<TcpStream>>>,
    stop: Option<Arc<AtomicBool>>,
}

impl Default for LanState {
    fn default() -> Self {
        Self {
            inbox: Arc::new(Mutex::new(Vec::new())),
            clients: None,
            client: None,
            stop: None,
        }
    }
}

static LAN_STATE: OnceLock<Mutex<LanState>> = OnceLock::new();

fn lan_state() -> &'static Mutex<LanState> {
    LAN_STATE.get_or_init(|| Mutex::new(LanState::default()))
}

fn write_json_line(stream: &Arc<Mutex<TcpStream>>, value: &serde_json::Value) -> Result<(), String> {
    let line = serde_json::to_string(value).map_err(|e| e.to_string())? + "\n";
    let mut guard = stream.lock().map_err(|_| "No se pudo bloquear stream".to_string())?;
    guard.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    guard.flush().map_err(|e| e.to_string())?;
    Ok(())
}

fn broadcast_to_clients(
    clients: &Arc<Mutex<Vec<Arc<Mutex<TcpStream>>>>>,
    value: &serde_json::Value,
) {
    let list = match clients.lock() {
        Ok(v) => v.clone(),
        Err(_) => return,
    };

    for stream in list {
        let _ = write_json_line(&stream, value);
    }
}

fn spawn_lan_reader(
    stream: TcpStream,
    inbox: Arc<Mutex<Vec<serde_json::Value>>>,
    relay_clients: Option<Arc<Mutex<Vec<Arc<Mutex<TcpStream>>>>>>,
) {
    thread::spawn(move || {
        let mut reader = BufReader::new(stream);

        loop {
            let mut line = String::new();

            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
                        if let Ok(mut q) = inbox.lock() {
                            q.push(value.clone());
                        }

                        // Si somos host, también repetimos el mensaje a los demás clientes.
                        if let Some(clients) = &relay_clients {
                            broadcast_to_clients(clients, &value);
                        }
                    }
                }
                Err(_) => break,
            }
        }
    });
}

#[tauri::command]
fn lan_stop() -> Result<bool, String> {
    let state_lock = lan_state();
    let mut state = state_lock.lock().map_err(|_| "No se pudo bloquear LAN state".to_string())?;

    if let Some(stop) = &state.stop {
        stop.store(true, Ordering::SeqCst);
    }

    if let Some(client) = &state.client {
        if let Ok(stream) = client.lock() {
            let _ = stream.shutdown(Shutdown::Both);
        }
    }

    if let Some(clients) = &state.clients {
        if let Ok(list) = clients.lock() {
            for c in list.iter() {
                if let Ok(stream) = c.lock() {
                    let _ = stream.shutdown(Shutdown::Both);
                }
            }
        }
    }

    *state = LanState::default();
    Ok(true)
}

#[tauri::command]
fn lan_start_host(port: u16) -> Result<bool, String> {
    let _ = lan_stop();

    let listener = TcpListener::bind(("0.0.0.0", port))
        .map_err(|e| format!("No se pudo abrir puerto {}: {}", port, e))?;

    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;

    let inbox = Arc::new(Mutex::new(Vec::<serde_json::Value>::new()));
    let clients = Arc::new(Mutex::new(Vec::<Arc<Mutex<TcpStream>>>::new()));
    let stop = Arc::new(AtomicBool::new(false));

    {
        let state_lock = lan_state();
        let mut state = state_lock.lock().map_err(|_| "No se pudo bloquear LAN state".to_string())?;
        state.inbox = inbox.clone();
        state.clients = Some(clients.clone());
        state.client = None;
        state.stop = Some(stop.clone());
    }

    thread::spawn(move || {
        println!("[LAN] Host escuchando en 0.0.0.0:{}", port);

        while !stop.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((stream, addr)) => {
                    println!("[LAN] Cliente conectado: {}", addr);
                    let _ = stream.set_nodelay(true);

                    match stream.try_clone() {
                        Ok(writer) => {
                            let writer_arc = Arc::new(Mutex::new(writer));
                            if let Ok(mut list) = clients.lock() {
                                list.push(writer_arc);
                            }

                            spawn_lan_reader(stream, inbox.clone(), Some(clients.clone()));
                        }
                        Err(err) => {
                            eprintln!("[LAN] No se pudo clonar stream: {}", err);
                        }
                    }
                }
                Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(err) => {
                    eprintln!("[LAN] Error aceptando conexión: {}", err);
                    thread::sleep(Duration::from_millis(200));
                }
            }
        }

        println!("[LAN] Host detenido");
    });

    Ok(true)
}

#[tauri::command]
fn lan_connect(host: String, port: u16) -> Result<bool, String> {
    let _ = lan_stop();

    let addr = format!("{}:{}", host, port);
    let stream = TcpStream::connect(&addr)
        .map_err(|e| format!("No se pudo conectar a {}: {}", addr, e))?;

    let _ = stream.set_nodelay(true);

    let writer = stream.try_clone().map_err(|e| e.to_string())?;
    let writer_arc = Arc::new(Mutex::new(writer));
    let inbox = Arc::new(Mutex::new(Vec::<serde_json::Value>::new()));
    let stop = Arc::new(AtomicBool::new(false));

    {
        let state_lock = lan_state();
        let mut state = state_lock.lock().map_err(|_| "No se pudo bloquear LAN state".to_string())?;
        state.inbox = inbox.clone();
        state.clients = None;
        state.client = Some(writer_arc);
        state.stop = Some(stop);
    }

    spawn_lan_reader(stream, inbox, None);
    println!("[LAN] Conectado a {}", addr);

    Ok(true)
}

#[tauri::command]
fn lan_send(message: serde_json::Value) -> Result<bool, String> {
    let state_lock = lan_state();
    let state = state_lock.lock().map_err(|_| "No se pudo bloquear LAN state".to_string())?;

    if let Some(clients) = &state.clients {
        broadcast_to_clients(clients, &message);
        return Ok(true);
    }

    if let Some(client) = &state.client {
        write_json_line(client, &message)?;
        return Ok(true);
    }

    Err("LAN no está conectado".to_string())
}

#[tauri::command]
fn lan_poll() -> Result<Vec<serde_json::Value>, String> {
    let inbox = {
        let state_lock = lan_state();
        let state = state_lock.lock().map_err(|_| "No se pudo bloquear LAN state".to_string())?;
        state.inbox.clone()
    };

    let mut q = inbox.lock().map_err(|_| "No se pudo bloquear inbox LAN".to_string())?;
    let out: Vec<serde_json::Value> = q.drain(..).collect();

    Ok(out)
}

#[derive(serde::Serialize, Clone)]
struct NetworkInterfaceInfo {
    name: String,
    ip: String,
    kind: String,
    recommended: bool,
}

fn classify_network_interface(name: &str, ip: &str) -> (String, bool) {
    let n = name.to_lowercase();

    if ip.starts_with("127.") {
        return ("loopback".to_string(), false);
    }

    if n.contains("hamachi")
        || n.contains("radmin")
        || n.contains("zerotier")
        || n.contains("tailscale")
        || n.contains("vpn")
        || ip.starts_with("25.")
        || ip.starts_with("26.")
    {
        return ("vpn".to_string(), true);
    }

    if ip.starts_with("192.168.")
        || ip.starts_with("10.")
        || ip.starts_with("172.16.")
        || ip.starts_with("172.17.")
        || ip.starts_with("172.18.")
        || ip.starts_with("172.19.")
        || ip.starts_with("172.20.")
        || ip.starts_with("172.21.")
        || ip.starts_with("172.22.")
        || ip.starts_with("172.23.")
        || ip.starts_with("172.24.")
        || ip.starts_with("172.25.")
        || ip.starts_with("172.26.")
        || ip.starts_with("172.27.")
        || ip.starts_with("172.28.")
        || ip.starts_with("172.29.")
        || ip.starts_with("172.30.")
        || ip.starts_with("172.31.")
    {
        return ("lan".to_string(), false);
    }

    ("other".to_string(), false)
}

#[tauri::command]
fn get_network_interfaces() -> Vec<NetworkInterfaceInfo> {
    let mut out: Vec<NetworkInterfaceInfo> = Vec::new();

    if let Ok(list) = local_ip_address::list_afinet_netifas() {
        for (name, ip) in list {
            let ip_s = ip.to_string();

            if ip_s.contains(':') {
                continue;
            }

            let (kind, recommended) = classify_network_interface(&name, &ip_s);

            out.push(NetworkInterfaceInfo {
                name,
                ip: ip_s,
                kind,
                recommended,
            });
        }
    }

    out.sort_by(|a, b| {
        b.recommended
            .cmp(&a.recommended)
            .then_with(|| a.kind.cmp(&b.kind))
            .then_with(|| a.name.cmp(&b.name))
    });

    out
}

#[tauri::command]
fn get_system_info() -> String {
    let interfaces = get_network_interfaces();

    if let Some(vpn) = interfaces.iter().find(|i| i.recommended) {
        return vpn.ip.clone();
    }

    if let Some(lan) = interfaces.iter().find(|i| i.kind == "lan") {
        return lan.ip.clone();
    }

    if let Some(any) = interfaces.iter().find(|i| i.kind != "loopback") {
        return any.ip.clone();
    }

    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

#[tauri::command]
fn get_shared_root() -> Result<String, String> {
    ensure_structure()?;
    Ok(shared_root()?.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_shared_structure() -> Result<(), String> {
    ensure_structure()
}

#[tauri::command]
fn read_shared_text(path: String) -> Result<Option<String>, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;

    if !full.exists() {
        return Ok(None);
    }

    fs::read_to_string(full).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_shared_text(path: String, content: String) -> Result<bool, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;

    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(full, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn list_shared_dir(path: String) -> Result<Vec<String>, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;

    let mut out = Vec::new();

    if !full.exists() {
        return Ok(out);
    }

    for entry in fs::read_dir(full).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            out.push(name.to_string());
        }
    }

    Ok(out)
}

#[tauri::command]
fn exists_shared(path: String) -> Result<bool, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;
    Ok(full.exists())
}

#[tauri::command]
fn create_shared_dir(path: String) -> Result<bool, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;
    fs::create_dir_all(full).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn remove_shared_file(path: String) -> Result<bool, String> {
    ensure_structure()?;
    let root = shared_root()?;
    let full = safe_join(&root, &path)?;

    if full.exists() && full.is_file() {
        fs::remove_file(full).map_err(|e| e.to_string())?;
    }

    Ok(true)
}

#[tauri::command]
fn write_bridge_message(message: serde_json::Value) -> Result<(), String> {
    ensure_structure()?;

    let from = message
        .get("from")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let to = message
        .get("to")
        .and_then(|v| v.as_str())
        .unwrap_or("broadcast");

    let id = message
        .get("id")
        .and_then(|v| v.as_str())
        .map(clean_filename)
        .unwrap_or_else(|| format!("msg_{}_{}", now_ms(), std::process::id()));

    let content = serde_json::to_string_pretty(&message).map_err(|e| e.to_string())?;

    let targets: Vec<String> = if to == "broadcast" {
        ["game", "devtool", "moddingtool"]
            .iter()
            .filter(|p| **p != from)
            .map(|p| p.to_string())
            .collect()
    } else {
        vec![to.to_string()]
    };

    for target in targets {
        let dir = inbox_dir(&target)?;
        fs::write(dir.join(format!("{}.json", id)), &content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn read_bridge_messages(app: tauri::AppHandle, program: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    ensure_structure()?;

    let program = current_program(&app, program);
    let dir = inbox_dir(&program)?;
    let mut messages = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) {
                        messages.push(value);
                    }
                }

                let _ = fs::remove_file(&path);
            }
        }
    }

    Ok(messages)
}

#[tauri::command]
fn clean_old_bridge_messages(max_age_ms: u64) -> Result<(), String> {
    ensure_structure()?;

    // Importantísimo: max_age_ms=0 NO borra todo, porque una app podría borrar
    // mensajes destinados a otra antes de que los lea.
    if max_age_ms == 0 {
        return Ok(());
    }

    let now = now_ms() as u64;

    for program in ["game", "devtool", "moddingtool"] {
        let dir = inbox_dir(program)?;

        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) {
                        let ts = value.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
                        if now.saturating_sub(ts) > max_age_ms {
                            let _ = fs::remove_file(&path);
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            ensure_structure()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_network_interfaces,
            get_shared_root,
            ensure_shared_structure,
            read_shared_text,
            write_shared_text,
            list_shared_dir,
            exists_shared,
            create_shared_dir,
            remove_shared_file,
            write_bridge_message,
            read_bridge_messages,
            lan_start_host,
            lan_connect,
            lan_send,
            lan_poll,
            lan_stop,
            clean_old_bridge_messages
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación CARGAS ecosystem");
}
