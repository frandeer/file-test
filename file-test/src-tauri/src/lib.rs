// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use dirs::data_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
pub struct AppState {
    pub last_file_path: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize, Default)]
struct AppConfig {
    last_file_path: Option<String>,
    mcp_list: Option<serde_json::Value>,
}

fn config_path() -> Option<PathBuf> {
    data_dir().map(|mut dir| {
        dir.push("file-test"); // 앱 이름 등으로 하위폴더 구분 권장
        dir.push("config.json");
        dir
    })
}

fn save_full_config(config: &AppConfig) {
    if let Some(config_path) = config_path() {
        let _ = fs::create_dir_all(config_path.parent().unwrap());
        let _ = fs::write(config_path, serde_json::to_string(config).unwrap());
    }
}

fn load_full_config() -> AppConfig {
    if let Some(config_path) = config_path() {
        if let Ok(data) = fs::read_to_string(config_path) {
            if let Ok(cfg) = serde_json::from_str::<AppConfig>(&data) {
                return cfg;
            }
        }
    }
    AppConfig::default()
}

fn save_config(path: &Option<String>) {
    let mut config = load_full_config();
    config.last_file_path = path.clone();
    save_full_config(&config);
}

fn load_config() -> Option<String> {
    load_full_config().last_file_path
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_file(path: String, state: State<AppState>) -> Result<String, String> {
    match fs::read_to_string(&path) {
        Ok(content) => {
            *state.last_file_path.lock().unwrap() = Some(path.clone());
            save_config(&Some(path));
            Ok(content)
        }
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    match fs::write(&path, content) {
        Ok(_) => {
            println!("File saved successfully: {}", path);
            Ok(())
        }
        Err(e) => {
            eprintln!("Failed to save file: {}", e);
            Err(format!("Failed to save file: {}", e))
        }
    }
}

#[tauri::command]
fn get_last_file(state: State<AppState>) -> Option<String> {
    if let Some(path) = &*state.last_file_path.lock().unwrap() {
        Some(path.clone())
    } else {
        load_config()
    }
}

#[tauri::command]
fn read_last_file(state: State<AppState>) -> Result<String, String> {
    if let Some(path) = get_last_file(state) {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
    } else {
        Err("No previous file".to_string())
    }
}

#[tauri::command]
fn reset_last_file(state: State<AppState>) {
    *state.last_file_path.lock().unwrap() = None;
    save_config(&None);
}

#[tauri::command]
fn save_mcp_list(mcp_list: serde_json::Value) {
    let mut config = load_full_config();
    config.mcp_list = Some(mcp_list);
    save_full_config(&config);
}

#[tauri::command]
fn load_mcp_list() -> Option<serde_json::Value> {
    load_full_config().mcp_list
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_file,
            save_file,
            get_last_file,
            read_last_file,
            reset_last_file,
            save_mcp_list,
            load_mcp_list,
            reset_last_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
