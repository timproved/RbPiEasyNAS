use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct PiConnection {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub username: String,
    pub connected: bool,
    pub storage_devices: Vec<StorageDevice>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StorageDevice {
    pub id: String,
    pub name: String,
    pub mount_point: String,
    pub size_total: u64,
    pub size_free: u64,
}
