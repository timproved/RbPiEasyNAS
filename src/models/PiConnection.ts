import { StorageDevice } from "./StorageDevice";

export interface PiConnection {
	id: string;
	name: string;
	ip: string;
	username: string;
	connected: boolean;
	storage_devices: StorageDevice[];
}
