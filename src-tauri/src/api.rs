use tauri::command;

use crate::{models::PiConnection, services};

#[command]
pub async fn connect_raspberry_pi(
    ip: String,
    username: String,
    password: String,
) -> Result<bool, String> {
    services::connect_to_pi(ip, username, password).await
}

#[command]
pub async fn get_connected_pis() -> Result<Vec<PiConnection>, String> {
    services::get_connected_pis().await
}
