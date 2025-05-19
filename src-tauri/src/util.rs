use ssh2::Session;
use uuid::Uuid;

use crate::models::StorageDevice;

pub fn get_storage_devices(session: &Session) -> Result<Vec<StorageDevice>, String> {
    let mut devices = Vec::new();

    // First get all mounted drives with df
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("Failed to create channel: {}", e))?;

    channel
        .exec("df -h")
        .map_err(|e| format!("Failed to execute df command: {}", e))?;

    let mut output = String::new();
    use std::io::Read;
    channel
        .read_to_string(&mut output)
        .map_err(|e| format!("Failed to read output: {}", e))?;

    println!("Raw df output: '{}'", output);

    // Process df output
    for line in output.lines().skip(1) {
        // Skip header line
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 6 {
            let device_name = parts[0].to_string();

            // Only include external drives (those starting with /dev/sd)
            if device_name.starts_with("/dev/sd") {
                println!("Found external device: {}", device_name);

                // Parse size and free space
                let size_str = parts[1].replace("G", "").replace("T", "000");
                let free_str = parts[3].replace("G", "").replace("T", "000");

                let mut size_total: u64 = 1; // Default to avoid division by zero
                let mut size_free: u64 = 0;

                // Try to parse size values, handling both GB and TB
                if let Ok(size) = size_str.parse::<f64>() {
                    size_total = (size * 1_000_000_000.0) as u64;
                }

                if let Ok(free) = free_str.parse::<f64>() {
                    size_free = (free * 1_000_000_000.0) as u64;
                }

                // Make sure free isn't larger than total
                if size_free > size_total {
                    size_free = size_total;
                }

                // Create the device
                devices.push(StorageDevice {
                    id: Uuid::new_v4().to_string(),
                    name: format!("External Drive ({})", device_name),
                    mount_point: parts[5].to_string(),
                    size_total,
                    size_free,
                });

                println!(
                    "Added device: {} with size: {} bytes, free: {} bytes",
                    device_name, size_total, size_free
                );
            }
        }
    }

    // Print the final results
    println!("Found {} external devices:", devices.len());
    for (i, device) in devices.iter().enumerate() {
        println!("Device {}: {} ({})", i + 1, device.name, device.mount_point);
        println!(
            "  Size: {} bytes, Free: {} bytes ({}% free)",
            device.size_total,
            device.size_free,
            (device.size_free as f64 / device.size_total as f64 * 100.0) as u64
        );
    }

    Ok(devices)
}
