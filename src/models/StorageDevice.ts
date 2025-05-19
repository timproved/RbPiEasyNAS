export interface StorageDevice {
	id: string;
	name: string;
	mountPoint: string;
	size_total: number;
	size_free: number;
	sizeTotal?: number;
	sizeFree?: number;
}
