use lazy_static::lazy_static;
use ssh2::Session;
use std::{error, net::TcpStream, sync::Mutex, time::Duration};
use uuid::Uuid;

use crate::{models::PiConnection, util};

lazy_static! {
    static ref CONNECTIONS: Mutex<Vec<PiConnection>> = Mutex::new(Vec::new());
}

pub async fn get_connected_pis() -> Result<Vec<PiConnection>, String> {
    Ok(CONNECTIONS.lock().unwrap().clone())
}

pub async fn add_pi_connection(connection: PiConnection) -> Result<(), String> {
    CONNECTIONS.lock().unwrap().push(connection);
    Ok(())
}

pub async fn connect_to_pi(ip: String, username: String, password: String) -> Result<bool, String> {
    let tcp = match TcpStream::connect(format!("{}:22", ip)) {
        Ok(stream) => {
            stream
                .set_read_timeout(Some(Duration::from_secs(10)))
                .map_err(|e| format!("Failed to set timeout: {}", e))?;
            println!("Connected!");
            stream
        }
        Err(e) => return Err(format!("Failed to connect: {}", e)),
    };

    //Get Session
    let mut sess = Session::new().map_err(|e| format!("Failed to create Session: {}", e))?;

    //Assign TCP Stream to Session
    sess.set_tcp_stream(tcp);

    //Handshake
    sess.handshake()
        .map_err(|e| format!("SSH Handshake failed: {}", e))?;

    println!("Handshake!");

    //Authenitcate
    sess.userauth_password(&username, &password)
        .map_err(|e| format!("SSH Authentication with RB Failed: {}", e))?;

    println!("Auth!");

    //Since Auth was successful, get storage devices:
    let storage_devices = match util::get_storage_devices(&sess) {
        Ok(devices) => devices,
        Err(e) => {
            return Err(format!(
                "Connected but fialed to get storage devices: {}",
                e
            ))
        }
    };
    println!("Got devices!");

    //Map Conenction to Object
    let pi_connection = PiConnection {
        id: Uuid::new_v4().to_string(),
        name: format!("RbPi ({})", ip),
        ip,
        username,
        connected: true,
        storage_devices,
    };

    // Debug print the connection with storage devices
    println!(
        "Connection with {} storage devices being stored:",
        pi_connection.storage_devices.len()
    );
    for device in &pi_connection.storage_devices {
        println!("Device: {} at {}", device.name, device.mount_point);
    }

    //Store Connection
    match add_pi_connection(pi_connection).await {
        Ok(_) => Ok(true),
        Err(e) => return Err(format!("Failed to store connection: {}", e)),
    }
}
