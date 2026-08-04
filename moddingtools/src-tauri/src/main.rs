// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
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

#[tauri::command]
fn get_system_info() -> String {
    "127.0.0.1".to_string()
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
            clean_old_bridge_messages
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación CARGAS ecosystem");
}
