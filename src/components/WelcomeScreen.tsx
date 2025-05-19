import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Server, HardDrive } from "lucide-react";
import { getConnectedPis, connectRaspberryPi } from '@/lib/api';
import { PiConnection } from '@/models/PiConnection';
import { formatBytesToGB, formatBytesToString } from '@/lib/utils';
const WelcomeScreen = () => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [connectedPis, setConnectedPis] = useState<PiConnection[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [ipAddress, setIpAddress] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');

	useEffect(() => {
		// Load any existing Pi connections on component mount
		const loadConnections = async () => {
			try {
				const pis = await getConnectedPis();
				console.log("Loaded Pis:", pis);
				if (pis && pis.length > 0) {
					console.log("First Pi storage devices:", pis[0].storage_devices);
				}
				setConnectedPis(pis);
			} catch (err) {
				console.error('Failed to load connections:', err);
			}
		};

		loadConnections();
	}, []);

	const handleAddPi = async () => {
		setLoading(true);
		setError(null);

		try {
			const success = await connectRaspberryPi(ipAddress, username, password);

			if (success) {
				// Refresh the connections list
				const pis = await getConnectedPis();
				setConnectedPis(pis);
				setIsDialogOpen(false);

				// Reset form
				setIpAddress('');
				setUsername('');
				setPassword('');
			} else {
				setError('Failed to connect to Raspberry Pi. Please check credentials and try again.');
			}
		} catch (err) {
			setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
			{connectedPis.length === 0 ? (
				<div className="text-center space-y-6 max-w-md">
					<Server className="mx-auto h-16 w-16 text-slate-400" />
					<h1 className="text-2xl font-bold tracking-tight">Welcome to Pi NAS Manager</h1>
					<p className="text-slate-500 dark:text-slate-400">
						Connect to your Raspberry Pi to start managing your NAS storage.
					</p>
					<Button
						onClick={() => setIsDialogOpen(true)}
						className="mt-4"
					>
						<PlusCircle className="mr-2 h-4 w-4" />
						Add Raspberry Pi Connection
					</Button>
				</div>
			) : (
				<div className="w-full max-w-4xl">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-2xl font-bold">Your Raspberry Pi Devices</h1>
						<Button
							onClick={() => setIsDialogOpen(true)}
							variant="outline"
						>
							<PlusCircle className="mr-2 h-4 w-4" />
							Add Connection
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{connectedPis.map((pi) => (
							<div
								key={pi.id}
								className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm"
							>
								<div className="flex items-center space-x-3 mb-4">
									<Server className="h-8 w-8 text-slate-500" />
									<div>
										<h2 className="font-medium">{pi.name || 'Raspberry Pi'}</h2>
										<p className="text-sm text-slate-500">{pi.ip}</p>
									</div>
								</div>

								<div className="space-y-2">
									<p className="text-sm font-medium">Storage Devices</p>
									{pi.storage_devices && pi.storage_devices.length > 0 ? (
										pi.storage_devices.map((device) => (
											<div
												key={device.id}
												className="flex items-center space-x-2 text-sm p-2 rounded bg-slate-100 dark:bg-slate-700"
											>
												<HardDrive className="h-4 w-4" />
												<span>{device.name}</span>
												<span className="text-slate-500 text-xs ml-auto">
													{formatBytesToString(device.size_free)} free of {formatBytesToString(device.size_total)}
												</span>
											</div>
										))
									) : (
										<p className="text-sm text-slate-500">No storage devices detected</p>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Add Raspberry Pi Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Connect to Raspberry Pi</DialogTitle>
						<DialogDescription>
							Enter the connection details for your Raspberry Pi.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="ip">IP Address</Label>
							<Input
								id="ip"
								placeholder="192.168.1.100"
								value={ipAddress}
								onChange={(e) => setIpAddress(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								placeholder="pi"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>

						{error && (
							<div className="text-sm font-medium text-red-500">
								{error}
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							onClick={() => setIsDialogOpen(false)}
							variant="outline"
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddPi}
							disabled={!ipAddress || !username || !password || loading}
						>
							{loading ? 'Connecting...' : 'Connect'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default WelcomeScreen;
