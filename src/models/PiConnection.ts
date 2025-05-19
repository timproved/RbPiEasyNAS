export interface PiConnection {
  id: string;
  name: string;
  ip: string;
  username: string;
  connected: boolean;
  storageDevices: StorageDevice[];
}
