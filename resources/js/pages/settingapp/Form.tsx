import React, { useRef, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type BreadcrumbItem } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, FolderOpen, HardDrive } from 'lucide-react';
import { appPath, storageUrl } from '@/lib/asset';

const DEFAULT_WARNA = '#7C3AED';

interface SettingApp {
  nama_app: string;
  deskripsi: string;
  warna: string;
  logo: string;
  favicon: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  backup_path?: string;
  backup_hosxp?: boolean;
}

interface Props {
  setting: SettingApp | null;
  available_drives?: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Application Settings', href: '/settingsapp' },
];

export default function SettingForm({ setting, available_drives = [] }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    nama_app: setting?.nama_app || '',
    deskripsi: setting?.deskripsi || '',
    warna: setting?.warna || '#7C3AED',
    seo: {
      title: setting?.seo?.title || '',
      description: setting?.seo?.description || '',
      keywords: setting?.seo?.keywords || '',
    },
    backup_path: setting?.backup_path || '',
    backup_hosxp: setting?.backup_hosxp || false,
    logo: null as File | null,
    favicon: null as File | null,
  });

  const [useCustomPath, setUseCustomPath] = useState(!!setting?.backup_path);
  const [pathStatus, setPathStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [pathMessage, setPathMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const logoPreview = useRef<string | null>(setting?.logo ? storageUrl(setting.logo) : null);
  const faviconPreview = useRef<string | null>(setting?.favicon ? storageUrl(setting.favicon) : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If custom path is disabled, clear the value before submitting
    if (!useCustomPath) {
      data.backup_path = '';
    }

    post('/settingsapp', {
      forceFormData: true,
      preserveScroll: true,
    });
  };

  const checkPath = () => {
    if (!data.backup_path) return;
    
    setIsChecking(true);
    setPathStatus('idle');
    setPathMessage('');
    
    // Using fetch for JSON response
    fetch(appPath('/settingsapp/check-path'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
        },
        body: JSON.stringify({ path: data.backup_path })
    })
    .then(res => res.json())
    .then(data => {
        setPathStatus(data.valid ? 'valid' : 'invalid');
        setPathMessage(data.message);
        if (data.valid) toast.success('Path is valid!');
        else toast.error('Path is invalid!');
    })
    .catch(err => {
        console.error(err);
        setPathStatus('invalid');
        setPathMessage('Network error or server error.');
    })
    .finally(() => setIsChecking(false));
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs} title="Application Settings">
      <Head title="Application Settings" />
      <div className="flex-1 p-4 md:p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">Application Settings</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Configure application identity, theme color, logo, and SEO metadata.</p>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nama App */}
              <div className="space-y-1">
                <Label htmlFor="nama_app">Application Name</Label>
                <Input
                  id="nama_app"
                  value={data.nama_app}
                  onChange={(e) => setData('nama_app', e.target.value)}
                  className={errors.nama_app ? 'border-red-500' : ''}
                />
                {errors.nama_app && <p className="text-sm text-red-500">{errors.nama_app}</p>}
              </div>

              {/* Deskripsi */}
              <div className="space-y-1">
                <Label htmlFor="deskripsi">Description</Label>
                <Textarea
                  id="deskripsi"
                  value={data.deskripsi}
                  onChange={(e) => setData('deskripsi', e.target.value)}
                />
              </div>

              {/* Warna Tema */}
              <div className="space-y-1">
                <Label htmlFor="warna">Theme Color</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="warna"
                    type="color"
                    value={data.warna}
                    onChange={(e) => setData('warna', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setData('warna', DEFAULT_WARNA)}
                  >
                    Reset Default
                  </Button>
                </div>
              </div>

              {/* Backup Path Configuration */}
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Backup Storage Location</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose where to store system backups.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="custom-path-mode" className="text-sm font-normal">
                      {useCustomPath ? 'Custom Path' : 'Default Storage'}
                    </Label>
                    <Switch
                      id="custom-path-mode"
                      checked={useCustomPath}
                      onCheckedChange={(checked) => {
                        setUseCustomPath(checked);
                        if (!checked) {
                          setData('backup_path', '');
                          setPathStatus('idle');
                        }
                      }}
                    />
                  </div>
                </div>

                {useCustomPath && (
                  <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                    {available_drives.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Available Drives (Server)</Label>
                        <div className="flex flex-wrap gap-2">
                          {available_drives.map(drive => (
                            <Button
                              key={drive}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setData('backup_path', drive + '/Backups')}
                            >
                              <HardDrive className="mr-1 h-3 w-3" />
                              {drive}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="backup_path"
                          placeholder="e.g. D:/Backups/HospitalApp"
                          value={data.backup_path}
                          onChange={(e) => {
                            setData('backup_path', e.target.value);
                            setPathStatus('idle');
                          }}
                          className={pathStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : pathStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={checkPath}
                        disabled={!data.backup_path || isChecking}
                      >
                        {isChecking ? 'Checking...' : 'Check Path'}
                      </Button>
                    </div>

                    {pathStatus !== 'idle' && (
                      <div className={`flex items-center gap-2 text-sm ${pathStatus === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
                        {pathStatus === 'valid' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{pathMessage}</span>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Ensure the web server process has write permissions to this directory.
                    </p>
                  </div>
                )}
                
                {!useCustomPath && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background p-2 rounded border border-dashed">
                    <FolderOpen className="h-4 w-4" />
                    <span>Default location: <code>storage/app/private/Laravel</code></span>
                  </div>
                )}

                <Separator className="my-4" />
                
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="backup_hosxp">Include HOSXP Database</Label>
                        <p className="text-sm text-muted-foreground">
                            Backup the external HOSXP database along with the application data.
                        </p>
                    </div>
                    <Switch
                        id="backup_hosxp"
                        checked={data.backup_hosxp}
                        onCheckedChange={(checked) => setData('backup_hosxp', checked)}
                    />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-1">
                <Label htmlFor="logo">Logo (Max 2MB)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setData('logo', file);
                    if (file) logoPreview.current = URL.createObjectURL(file);
                  }}
                />
                {logoPreview.current && (
                  <img src={logoPreview.current} alt="Preview Logo" className="mt-2 h-16 rounded" />
                )}
              </div>

              {/* Favicon Upload */}
              <div className="space-y-1">
                <Label htmlFor="favicon">Favicon (Max 1MB)</Label>
                <Input
                  id="favicon"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setData('favicon', file);
                    if (file) faviconPreview.current = URL.createObjectURL(file);
                  }}
                />
                {faviconPreview.current && (
                  <img src={faviconPreview.current} alt="Preview Favicon" className="mt-2 h-10 rounded" />
                )}
              </div>

              {/* SEO Section */}
              <Separator />
              <h3 className="text-lg font-semibold">SEO Settings</h3>

              <div className="space-y-1">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={data.seo.title}
                  onChange={(e) => setData('seo', { ...data.seo, title: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={data.seo.description}
                  onChange={(e) => setData('seo', { ...data.seo, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="seo_keywords">SEO Keywords (separate with commas)</Label>
                <Input
                  id="seo_keywords"
                  value={data.seo.keywords}
                  onChange={(e) => setData('seo', { ...data.seo, keywords: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={processing} className="px-6">
                  {processing ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}