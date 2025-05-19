import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatBytesToGB(bytes: number): string {
	if (!bytes || isNaN(bytes)) return "0.0";

	const gb = bytes / 1_000_000_000;
	return gb.toFixed(1); // One decimal place
}

export function formatBytesToString(bytes: number): string {
	if (!bytes || isNaN(bytes)) return "0 B";

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let unitIndex = 0;
	let size = bytes;

	while (size >= 1000 && unitIndex < units.length - 1) {
		size /= 1000;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}
