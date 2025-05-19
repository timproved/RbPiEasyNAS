pub mod api;
pub mod models;
pub mod services;
pub mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            api::get_connected_pis,
            api::connect_raspberry_pi,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
