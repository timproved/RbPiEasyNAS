import { FileItem } from "@/models/FileItem";
import { PiConnection } from "@/models/PiConnection";
import { invoke } from "@tauri-apps/api/core";

export async function connectRaspberryPi(ip: string, username: string, password: string) {
	return invoke('connect_raspberry_pi', { ip, username, password });
}

export async function getConnectedPis(): Promise<PiConnection[]> {
	return invoke('get_connected_pis');
}

// File operations functions
export async function listDirectory(piId: string, path: string): Promise<FileItem[]> {
	return invoke('list_directory', { piId, path });
}

export async function createDirectory(piId: string, path: string, directoryName: string): Promise<void> {
	return invoke('create_directory', { piId, path, directoryName });
}

export async function deleteFileOrDirectory(piId: string, path: string, isDir: boolean): Promise<void> {
	return invoke('delete_file_or_directory', { piId, path, isDir });
}

export async function uploadFile(piId: string, localPath: string, remotePath: string): Promise<void> {
	return invoke('upload_file', { piId, localPath, remotePath });
}

export async function downloadFile(piId: string, remotePath: string, localPath: string): Promise<void> {
	return invoke('download_file', { piId, remotePath, localPath });
}

export async function renameFileOrDirectory(piId: string, oldPath: string, newName: string): Promise<void> {
	return invoke('rename_file_or_directory', { piId, oldPath, newName });
}

export async function executeCommand(piId: string, command: string): Promise<string> {
	return invoke('execute_command', { piId, command });
}
