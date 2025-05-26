import React, { useState, useEffect } from 'react';
import { getConnectedPis } from './lib/api';
import WelcomeScreen from './components/WelcomeScreen';
import FileExplorer from './components/FileExplorer';
import { Button } from "@/components/ui/button";
import { Server, HardDrive, ArrowLeft } from "lucide-react";
import "./App.css"

interface PiConnection {
	id: string;
	name: string;
	ip: string;
	username: string;
	connected: boolean;
	storage_devices: StorageDevice[];
}

interface StorageDevice {
	id: string;
	name: string;
	mount_point: string;
	size_total: number;
	size_free: number;
}

function App() {
	const [connectedPis, setConnectedPis] = useState<PiConnection[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDevice, setSelectedDevice] = useState<{
		piId: string;
		piName: string;
		deviceId: string;
		deviceName: string;
		mountPoint: string;
		size_total: number;
		size_free: number;
	} | null>(null);

	useEffect(() => {
		loadConnections();
	}, []);

	const loadConnections = async () => {
		setLoading(true);
		try {
			const pis = await getConnectedPis();
			setConnectedPis(pis);
		} catch (err) {
			console.error('Failed to load connections:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleNewConnection = () => {
		loadConnections();
	};

	const handleDeviceSelect = (pi: PiConnection, device: StorageDevice) => {
		setSelectedDevice({
			piId: pi.id,
			piName: pi.name,
			deviceId: device.id,
			deviceName: device.name,
			mountPoint: device.mount_point,
			size_total: device.size_total,
			size_free: device.size_free
		});
	};

	const handleBackToDevices = () => {
		setSelectedDevice(null);
	};

	// If loading, show loading screen
	if (loading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<p>Loading...</p>
			</div>
		);
	}

	// If no Pis are connected, show welcome screen
	if (connectedPis.length === 0) {
		return <WelcomeScreen onNewConnection={handleNewConnection} />;
	}

	// If a device is selected, show file explorer
	if (selectedDevice) {
		return (
			<FileExplorer
				piId={selectedDevice.piId}
				piName={selectedDevice.piName}
				deviceId={selectedDevice.deviceId}
				deviceName={selectedDevice.deviceName}
				mountPoint={selectedDevice.mountPoint}
				size_total={selectedDevice.size_total}
				size_free={selectedDevice.size_free}
				onBack={handleBackToDevices}
			/>
		);
	}

	// Otherwise, show the device selection screen
	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
			<header className="mb-8">
				<h1 className="text-3xl font-bold">Pi NAS Manager</h1>
				<p className="text-slate-500 dark:text-slate-400">Select a storage device to manage</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{connectedPis.map((pi) => (
					<div key={pi.id} className="border rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
						<div className="p-4 border-b">
							<div className="flex items-center space-x-3">
								<Server className="h-8 w-8 text-primary" />
								<div>
									<h2 className="font-medium text-lg">{pi.name}</h2>
									<p className="text-sm text-slate-500">{pi.ip}</p>
								</div>
							</div>
						</div>

						<div className="p-4">
							<h3 className="text-sm font-medium mb-3">Storage Devices</h3>
							<div className="space-y-3">
								{pi.storage_devices && pi.storage_devices.length > 0 ? (
									pi.storage_devices.map((device) => (
										<button
											key={device.id}
											className="w-full flex items-center p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
											onClick={() => handleDeviceSelect(pi, device)}
										>
											<HardDrive className="h-5 w-5 text-slate-500 mr-3" />
											<div className="flex-1 min-w-0">
												<p className="font-medium truncate">{device.name}</p>
												<p className="text-xs text-slate-500 truncate">
													Mounted at: {device.mount_point}
												</p>
											</div>
											<div className="ml-3">
												<Button size="sm" variant="ghost">
													Open
												</Button>
											</div>
										</button>
									))
								) : (
									<p className="text-sm text-slate-500 p-3">No storage devices detected</p>
								)}
							</div>
						</div>

						<div className="p-4 border-t bg-slate-50 dark:bg-slate-800/50">
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => {
									// Here you could add functionality to refresh just this Pi's information
									loadConnections();
								}}
							>
								Refresh Connection
							</Button>
						</div>
					</div>
				))}

				<div className="border rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden flex flex-col items-center justify-center p-8 min-h-[200px]">
					<Button
						variant="outline"
						size="lg"
						className="flex items-center space-x-2"
						onClick={() => handleNewConnection()}
					>
						<Server className="h-5 w-5" />
						<span>Add Another Raspberry Pi</span>
					</Button>
				</div>
			</div>
		</div>
	);
}

export default App;
