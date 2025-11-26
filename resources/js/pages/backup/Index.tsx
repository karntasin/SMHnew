import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Upload, RefreshCw, Download, Trash2, MoreVertical, Database, FileArchive } from 'lucide-react';

interface Backup {
  name: string;
  size: number;
  last_modified: number;
  download_url: string;
}

interface Props {
  backups: Backup[];
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Backup & Restore', href: '/backup' },
];

export default function BackupIndex({ backups }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = (option: 'only-db' | 'full') => {
    const toastId = toast.loading('Creating backup...');
    router.post('/backup/run', { option }, {
      onSuccess: () => toast.success('Backup created successfully', { id: toastId }),
      onError: () => toast.error('Failed to create backup', { id: toastId }),
      preserveScroll: true,
    });
  };

  const handleDelete = (filename: string) => {
    router.delete(`/backup/delete/${filename}`, {
      onSuccess: () => toast.success('Backup deleted successfully'),
      onError: () => toast.error('Failed to delete backup'),
      preserveScroll: true,
    });
  };

  const handleRestore = (filename: string) => {
    const toastId = toast.loading('Restoring database...');
    router.post(`/backup/restore/${filename}`, {}, {
      onSuccess: () => toast.success('Database restored successfully', { id: toastId }),
      onError: () => toast.error('Failed to restore database', { id: toastId }),
      preserveScroll: true,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('backup_file', file);

    setIsUploading(true);
    const toastId = toast.loading('Uploading backup...');

    router.post('/backup/upload', formData, {
      onSuccess: () => {
        toast.success('Backup uploaded successfully', { id: toastId });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: () => {
        toast.error('Failed to upload backup', { id: toastId });
        setIsUploading(false);
      },
      preserveScroll: true,
    });
  };

  return (
    <AppLayout title="Backup & Restore" breadcrumbs={breadcrumbs}>
      <Head title="Backup & Restore" />

      <div className="p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">System Backups</CardTitle>
              <p className="text-muted-foreground text-sm">Manage database and file backups</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".zip"
                onChange={handleFileChange}
              />
              <Button variant="outline" onClick={handleUploadClick} disabled={isUploading}>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Backup'}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <FileArchive className="mr-2 h-4 w-4" />
                    Create Backup
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBackup('only-db')}>
                    <Database className="mr-2 h-4 w-4" />
                    Database Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBackup('full')}>
                    <FileArchive className="mr-2 h-4 w-4" />
                    Full Backup (DB + Files)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-4 space-y-4">
            {backups.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-muted/30 p-4 rounded-full inline-block mb-4">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No backups available.</p>
                <p className="text-xs text-muted-foreground mt-1">Create a new backup to get started.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {backups.map((backup, index) => (
                  <li
                    key={index}
                    className="flex flex-col md:flex-row md:items-center justify-between border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded mt-1">
                        <FileArchive className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-base">{backup.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                            {formatSize(backup.size)}
                          </span>
                          <span>•</span>
                          <span>{new Date(backup.last_modified * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Database?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will overwrite the current database with the data from <strong>{backup.name}</strong>.
                              <br /><br />
                              <span className="text-destructive font-bold">Warning: Current data will be lost!</span>
                              <br />
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => handleRestore(backup.name)}
                            >
                              Yes, Restore Database
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <a
                        href={backup.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{backup.name}</strong>?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(backup.name)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function formatSize(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
