import React, { useState, useEffect } from 'react';
import {
	Folder,
	FileText,
	Upload,
	Download,
	Trash2,
	Plus,
	Edit,
	ChevronLeft,
	RefreshCw,
	ArrowLeft,
	LayoutGrid,
	List,
	MoreHorizontal,
	Search,
	Home,
	SlidersHorizontal,
	CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { formatBytesToString } from '@/lib/utils';
import {
	listDirectory,
	createDirectory,
	deleteFileOrDirectory,
	uploadFile,
	downloadFile,
	renameFileOrDirectory,
} from '@/lib/api';
import { open } from '@tauri-apps/plugin-dialog';
import { downloadDir } from '@tauri-apps/api/path';
import { FileItem } from '@/models/FileItem';

interface FileExplorerProps {
	piId: string;
	piName: string;
	deviceId: string;
	deviceName: string;
	mountPoint: string;
	size_total: number;
	size_free: number;
	onBack: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
	piId,
	piName,
	deviceId,
	deviceName,
	mountPoint,
	size_total,
	size_free,
	onBack
}) => {
	// State
	const [currentPath, setCurrentPath] = useState(mountPoint);
	const [files, setFiles] = useState<FileItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
	const [breadcrumbs, setBreadcrumbs] = useState<Array<{ name: string, path: string }>>([]);

	// Dialog states
	const [newFolderDialog, setNewFolderDialog] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [renameDialog, setRenameDialog] = useState(false);
	const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
	const [newFileName, setNewFileName] = useState('');
	const [deleteDialog, setDeleteDialog] = useState(false);
	const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);

	// Load files when path changes
	useEffect(() => {
		loadFiles();
		updateBreadcrumbs();
	}, [currentPath]);

	// Update breadcrumbs based on current path
	const updateBreadcrumbs = () => {
		const parts = currentPath.split('/').filter(Boolean);
		const crumbs = [{ name: 'Root', path: mountPoint }];

		let currentBuildPath = mountPoint;

		for (const part of parts) {
			if (currentBuildPath === mountPoint && part === mountPoint.split('/').filter(Boolean).pop()) {
				continue; // Skip if it's the mount point itself
			}

			currentBuildPath = `${currentBuildPath}/${part}`.replace(/\/\//g, '/');
			crumbs.push({
				name: part,
				path: currentBuildPath
			});
		}

		setBreadcrumbs(crumbs);
	};

	// Load files from the current path
	const loadFiles = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await listDirectory(piId, currentPath);

			// Apply search filter if needed
			let filteredFiles = result;
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				filteredFiles = result.filter(file =>
					file.name.toLowerCase().includes(query)
				);
			}

			// Apply sorting
			filteredFiles = sortFiles(filteredFiles, sortBy, sortDirection);

			setFiles(filteredFiles);
			setSelectedFiles([]);
		} catch (err) {
			console.error('Failed to load files:', err);
			setError(`Failed to load files: ${err instanceof Error ? err.message : String(err)}`);
			setFiles([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Sort files based on criteria
	const sortFiles = (files: FileItem[], sortBy: string, direction: 'asc' | 'desc') => {
		return [...files].sort((a, b) => {
			// Always put directories first
			if (a.is_dir && !b.is_dir) return -1;
			if (!a.is_dir && b.is_dir) return 1;

			// Then sort by the specified criteria
			let comparison;

			switch (sortBy) {
				case 'size':
					comparison = a.size - b.size;
					break;
				case 'modified':
					comparison = a.modified - b.modified;
					break;
				case 'name':
				default:
					comparison = a.name.localeCompare(b.name);
			}

			return direction === 'asc' ? comparison : -comparison;
		});
	};

	// Handle file or folder click
	const handleFileClick = (file: FileItem) => {
		if (file.is_dir) {
			setCurrentPath(file.path);
		} else {
			// For regular files - could implement a preview here
			toggleFileSelection(file.path);
		}
	};

	// Go up one directory
	const navigateUp = () => {
		if (currentPath === mountPoint) return;

		const parts = currentPath.split('/').filter(Boolean);
		parts.pop();
		const parentPath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
		setCurrentPath(parentPath);
	};

	// Go to home (mount point)
	const navigateHome = () => {
		setCurrentPath(mountPoint);
	};

	// Toggle file selection for multi-select operations
	const toggleFileSelection = (path: string) => {
		setSelectedFiles(prev =>
			prev.includes(path)
				? prev.filter(p => p !== path)
				: [...prev, path]
		);
	};

	// Select/deselect all files
	const toggleSelectAll = () => {
		if (selectedFiles.length === files.length) {
			setSelectedFiles([]);
		} else {
			setSelectedFiles(files.map(file => file.path));
		}
	};

	// Create a new folder
	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) return;

		try {
			await createDirectory(
				piId,
				currentPath,
				newFolderName.trim()
			);

			setNewFolderDialog(false);
			setNewFolderName('');
			loadFiles();
		} catch (err) {
			setError(`Failed to create folder: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	// Rename a file or folder
	const handleRename = async () => {
		if (!fileToRename || !newFileName.trim()) return;

		try {
			await renameFileOrDirectory(
				piId,
				fileToRename.path,
				newFileName.trim()
			);

			setRenameDialog(false);
			setFileToRename(null);
			setNewFileName('');
			loadFiles();
		} catch (err) {
			setError(`Failed to rename: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	// Delete files or folders
	const handleDelete = async () => {
		if (filesToDelete.length === 0) return;

		try {
			for (const file of filesToDelete) {
				await deleteFileOrDirectory(
					piId,
					file.path,
					file.is_dir
				);
			}

			setDeleteDialog(false);
			setFilesToDelete([]);
			setSelectedFiles([]);
			loadFiles();
		} catch (err) {
			setError(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	// Upload files
	const handleUpload = async () => {
		try {
			// Open file picker
			const selected = await open({
				multiple: true,
				directory: false,
			});

			if (selected) {
				const filesToUpload = Array.isArray(selected) ? selected : [selected];

				for (const filePath of filesToUpload) {
					// Get filename from path
					const filename = filePath.split(/[\/\\]/).pop() || 'file';
					const remotePath = `${currentPath}/${filename}`;

					await uploadFile(
						piId,
						filePath,
						remotePath
					);
				}

				loadFiles();
			}
		} catch (err) {
			setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	// Download selected files
	const handleDownload = async () => {
		if (selectedFiles.length === 0) return;

		try {
			// Get download directory
			const downloadPath = await downloadDir();

			for (const filePath of selectedFiles) {
				const file = files.find(f => f.path === filePath);
				if (!file || file.is_dir) continue;

				// Extract filename from path
				const filename = file.name;
				const localPath = `${downloadPath}/${filename}`;

				await downloadFile(
					piId,
					file.path,
					localPath
				);
			}

			alert(`${selectedFiles.length} file(s) downloaded to ${await downloadDir()}`);
			setSelectedFiles([]);
		} catch (err) {
			setError(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	// Format date for display
	const formatDate = (timestamp: number) => {
		return new Date(timestamp * 1000).toLocaleString();
	};

	// Calculate used space percentage
	const usedSpacePercentage = ((size_total - size_free) / size_total) * 100;

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="bg-white dark:bg-slate-800 border-b p-3 flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Button variant="ghost" size="icon" onClick={onBack}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div>
						<h2 className="text-lg font-semibold">{deviceName}</h2>
						<div className="text-sm text-muted-foreground">
							{piName} • {formatBytesToString(size_free)} free of {formatBytesToString(size_total)}
						</div>
					</div>
				</div>

				<div className="flex items-center space-x-4">
					<div className="w-48">
						<div className="flex justify-between text-xs mb-1">
							<span>Storage</span>
							<span>{Math.round(usedSpacePercentage)}% used</span>
						</div>
						<Progress value={usedSpacePercentage} className="h-2" />
					</div>

					<Button variant="outline" size="sm" onClick={loadFiles}>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Toolbar */}
			<div className="bg-white dark:bg-slate-800 border-b p-2 flex flex-wrap items-center gap-2">
				<div className="flex items-center space-x-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" onClick={navigateHome} disabled={currentPath === mountPoint}>
									<Home className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Home</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" onClick={navigateUp} disabled={currentPath === mountPoint}>
									<ChevronLeft className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Up one level</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<Breadcrumb className="ml-2">
						{breadcrumbs.map((crumb, index) => (
							<BreadcrumbItem key={crumb.path}>
								<BreadcrumbLink onClick={() => setCurrentPath(crumb.path)}>
									{crumb.name}
								</BreadcrumbLink>
								{index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
							</BreadcrumbItem>
						))}
					</Breadcrumb>
				</div>

				<div className="ml-auto flex items-center space-x-2">
					<div className="relative w-48">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search files..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && loadFiles()}
							className="pl-8"
						/>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<SlidersHorizontal className="h-4 w-4 mr-2" />
								Sort
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => {
								setSortBy('name');
								setSortDirection('asc');
								loadFiles();
							}}>
								{sortBy === 'name' && sortDirection === 'asc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Name (A-Z)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => {
								setSortBy('name');
								setSortDirection('desc');
								loadFiles();
							}}>
								{sortBy === 'name' && sortDirection === 'desc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Name (Z-A)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => {
								setSortBy('size');
								setSortDirection('asc');
								loadFiles();
							}}>
								{sortBy === 'size' && sortDirection === 'asc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Size (smallest first)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => {
								setSortBy('size');
								setSortDirection('desc');
								loadFiles();
							}}>
								{sortBy === 'size' && sortDirection === 'desc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Size (largest first)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => {
								setSortBy('modified');
								setSortDirection('asc');
								loadFiles();
							}}>
								{sortBy === 'modified' && sortDirection === 'asc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Date (oldest first)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => {
								setSortBy('modified');
								setSortDirection('desc');
								loadFiles();
							}}>
								{sortBy === 'modified' && sortDirection === 'desc' && <CheckCircle2 className="h-4 w-4 mr-2" />}
								Date (newest first)
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
						<TabsList className="grid w-16 grid-cols-2">
							<TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
							<TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{/* Action Bar */}
			<div className="bg-white dark:bg-slate-800 border-b p-2 flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setNewFolderDialog(true)}
					>
						<Plus className="h-4 w-4 mr-2" />
						New Folder
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={handleUpload}
					>
						<Upload className="h-4 w-4 mr-2" />
						Upload
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={handleDownload}
						disabled={selectedFiles.length === 0 || selectedFiles.some(path => {
							const file = files.find(f => f.path === path);
							return file?.is_dir;
						})}
					>
						<Download className="h-4 w-4 mr-2" />
						Download
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const selectedItems = files.filter(file => selectedFiles.includes(file.path));
							if (selectedItems.length > 0) {
								setFilesToDelete(selectedItems);
								setDeleteDialog(true);
							}
						}}
						disabled={selectedFiles.length === 0}
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</Button>
				</div>

				<div className="text-sm text-muted-foreground">
					{selectedFiles.length > 0 ? (
						<Button variant="ghost" size="sm" onClick={toggleSelectAll}>
							{selectedFiles.length} selected • Deselect All
						</Button>
					) : (
						<Button variant="ghost" size="sm" onClick={toggleSelectAll}>
							Select All
						</Button>
					)}
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<Alert variant="destructive" className="m-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Main Content - File List */}
			<div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-900">
				<ScrollArea className="h-full w-full">
					{isLoading ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
								<p className="mt-2">Loading files...</p>
							</div>
						</div>
					) : files.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-80">
							<Folder className="h-16 w-16 text-muted-foreground mb-4" />
							<p className="text-muted-foreground">This folder is empty</p>
							<Button className="mt-4" onClick={() => setNewFolderDialog(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Create Folder
							</Button>
						</div>
					) : viewMode === 'grid' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
							{files.map((file) => (
								<div
									key={file.path}
									className={`relative border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-md cursor-pointer ${selectedFiles.includes(file.path) ? 'ring-2 ring-primary' : ''
										}`}
									onClick={() => handleFileClick(file)}
									onContextMenu={(e) => {
										e.preventDefault();
										// Could implement a context menu here
									}}
								>
									<div className="flex flex-col items-center">
										{file.is_dir ? (
											<Folder className="h-12 w-12 text-blue-500 mb-2" />
										) : (
											<FileText className="h-12 w-12 text-slate-500 mb-2" />
										)}
										<p className="text-center font-medium truncate w-full" title={file.name}>
											{file.name}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{file.is_dir ? 'Folder' : formatBytesToString(file.size)}
										</p>
									</div>

									<div className="absolute top-2 right-2">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={(e) => {
													e.stopPropagation();
													setFileToRename(file);
													setNewFileName(file.name);
													setRenameDialog(true);
												}}>
													<Edit className="h-4 w-4 mr-2" />
													Rename
												</DropdownMenuItem>
												{!file.is_dir && (
													<DropdownMenuItem onClick={(e) => {
														e.stopPropagation();
														setSelectedFiles([file.path]);
														handleDownload();
													}}>
														<Download className="h-4 w-4 mr-2" />
														Download
													</DropdownMenuItem>
												)}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="text-red-500"
													onClick={(e) => {
														e.stopPropagation();
														setFilesToDelete([file]);
														setDeleteDialog(true);
													}}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="space-y-1">
							<div className="grid grid-cols-12 gap-4 px-4 py-2 font-medium text-sm text-muted-foreground">
								<div className="col-span-6">Name</div>
								<div className="col-span-2">Size</div>
								<div className="col-span-3">Modified</div>
								<div className="col-span-1"></div>
							</div>

							{files.map((file) => (
								<div
									key={file.path}
									className={`grid grid-cols-12 gap-4 px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedFiles.includes(file.path) ? 'bg-primary/10' : ''
										}`}
									onClick={() => handleFileClick(file)}
								>
									<div className="col-span-6 flex items-center">
										{file.is_dir ? (
											<Folder className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
										) : (
											<FileText className="h-5 w-5 text-slate-500 mr-2 flex-shrink-0" />
										)}
										<span className="truncate" title={file.name}>{file.name}</span>
									</div>
									<div className="col-span-2 text-muted-foreground">
										{file.is_dir ? '—' : formatBytesToString(file.size)}
									</div>
									<div className="col-span-3 text-muted-foreground">
										{formatDate(file.modified)}
									</div>
									<div className="col-span-1 flex justify-end">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={(e) => {
													e.stopPropagation();
													setFileToRename(file);
													setNewFileName(file.name);
													setRenameDialog(true);
												}}>
													<Edit className="h-4 w-4 mr-2" />
													Rename
												</DropdownMenuItem>
												{!file.is_dir && (
													<DropdownMenuItem onClick={(e) => {
														e.stopPropagation();
														setSelectedFiles([file.path]);
														handleDownload();
													}}>
														<Download className="h-4 w-4 mr-2" />
														Download
													</DropdownMenuItem>
												)}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="text-red-500"
													onClick={(e) => {
														e.stopPropagation();
														setFilesToDelete([file]);
														setDeleteDialog(true);
													}}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</div>

			{/* New Folder Dialog */}
			<Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Folder</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="folder-name">Folder Name</Label>
							<Input
								id="folder-name"
								placeholder="New Folder"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								autoFocus
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setNewFolderDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename Dialog */}
			<Dialog open={renameDialog} onOpenChange={setRenameDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="new-name">New Name</Label>
							<Input
								id="new-name"
								value={newFileName}
								onChange={(e) => setNewFileName(e.target.value)}
								autoFocus
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setRenameDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleRename} disabled={!newFileName.trim()}>
							Rename
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Delete</DialogTitle>
					</DialogHeader>

					<div className="py-4">
						{filesToDelete.length === 1 ? (
							<p>Are you sure you want to delete "{filesToDelete[0].name}"?</p>
						) : (
							<p>Are you sure you want to delete {filesToDelete.length} items?</p>
						)}

						{filesToDelete.some(file => file.is_dir) && (
							<p className="text-red-500 mt-2">
								Warning: This will delete all contents of the selected folders.
							</p>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialog(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
export default FileExplorer;
