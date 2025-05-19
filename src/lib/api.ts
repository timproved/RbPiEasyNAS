import { PiConnection } from "@/models/PiConnection";
import { invoke } from "@tauri-apps/api/core";

export async function connectRaspberryPi(ip: string, username: string, password: string) {
	return invoke('connect_raspberry_pi', { ip, username, password });
}

export async function getConnectedPis(): Promise<PiConnection[]> {
	return invoke('get_connected_pis');
}
