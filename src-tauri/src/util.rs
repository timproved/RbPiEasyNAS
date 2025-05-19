use ssh2::Session;
use uuid::Uuid;

use crate::models::StorageDevice;

pub fn get_storage_devices(session: &Session) -> Result<Vec<StorageDevice>, String> {
    // Execute df command to get filesystem info
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("Failed to create channel: {}", e))?;

    channel
        .exec("df -h | grep /dev/")
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let mut output = String::new();
    use std::io::Read;
    channel
        .read_to_string(&mut output)
        .map_err(|e| format!("Failed to read output: {}", e))?;

    channel
        .wait_close()
        .map_err(|e| format!("Channel close error: {}", e))?;

    // Process the output to extract storage devices
    let mut devices = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 6 {
            // parts[0] = device, parts[5] = mount point

            // Extract numerical size and free space
            let size_str = parts[1].replace("G", "");
            let free_str = parts[3].replace("G", "");

            let size_total = match size_str.parse::<f64>() {
                Ok(size) => (size * 1_000_000_000.0) as u64, // Convert GB to bytes
                Err(_) => 0,
            };

            let size_free = match free_str.parse::<f64>() {
                Ok(size) => (size * 1_000_000_000.0) as u64, // Convert GB to bytes
                Err(_) => 0,
            };

            devices.push(StorageDevice {
                id: Uuid::new_v4().to_string(),
                name: parts[0].to_string(),
                mount_point: parts[5].to_string(),
                size_total,
                size_free,
            });
        }
    }

    // Also get mounted external drives
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("Failed to create channel: {}", e))?;

    channel
        .exec("lsblk -o NAME,SIZE,MOUNTPOINT | grep -E 'sd[a-z]'")
        .map_err(|e| format!("Failed to execute lsblk command: {}", e))?;

    let mut output = String::new();
    channel
        .read_to_string(&mut output)
        .map_err(|e| format!("Failed to read output: {}", e))?;

    for line in output.lines() {
        let parts: Vec<&str> = line.trim().split_whitespace().collect();
        if parts.len() >= 3 {
            // This is an external drive with a mount point
            devices.push(StorageDevice {
                id: Uuid::new_v4().to_string(),
                name: format!("External Drive ({})", parts[0]),
                mount_point: parts[2].to_string(),
                size_total: 0, // We'd need to parse the size properly
                size_free: 0,  // Would need another command to get free space
            });
        }
    }

    Ok(devices)
}
