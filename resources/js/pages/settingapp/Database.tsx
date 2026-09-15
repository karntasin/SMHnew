import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Globe, Play, Square, Copy, CheckCircle2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';

interface NgrokStatus {
    running: boolean;
    public_url: string | null;
    callback_url: string;
    webhook_url: string;
    pid?: number | null;
    binary?: string;
    binary_exists?: boolean;
    addr?: string;
    has_authtoken?: boolean;
    driver?: string;
    skips_interstitial?: boolean;
    error?: string;
    mode?: 'named' | 'quick';
    message?: string;
}

interface Props {
    env: {
        DB_HOST: string;
        DB_PORT: string;
        DB_DATABASE: string;
        DB_USERNAME: string;
        DB_PASSWORD?: string;
        
        HOSXP_DB_HOST: string;
        HOSXP_DB_PORT: string;
        HOSXP_DB_DATABASE: string;
        HOSXP_DB_USERNAME: string;
        HOSXP_DB_PASSWORD?: string;

        LINE_INTEGRATION_ENABLED?: boolean;
        LINE_LOGIN_CHANNEL_ID: string;
        LINE_LOGIN_CHANNEL_SECRET: string;
        LINE_OAUTH_REDIRECT?: string;
        LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: string;
        LINE_MESSAGING_CHANNEL_SECRET?: string;
        LINE_WELCOME_MESSAGE?: string;
        LINE_OA_ADD_FRIEND_URL?: string;
        NGROK_AUTHTOKEN?: string;
        NGROK_ADDR?: string;
        NGROK_BIN?: string;

        CLOUDFLARE_TUNNEL_MODE?: string;
        CLOUDFLARE_PUBLIC_HOSTNAME?: string;
        CLOUDFLARE_TUNNEL_CONFIG?: string;
    };
    ngrok?: NgrokStatus;
    hasNgrokAuthtoken?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Application Settings', href: '/settingsapp' },
    { title: 'Database & Integrations', href: '/settingsapp/database' },
];

export default function DatabaseSettings({ env, ngrok, hasNgrokAuthtoken = false }: Props) {
    const { data, setData, post, processing } = useForm({
        ...env,
        LINE_INTEGRATION_ENABLED: Boolean(env.LINE_INTEGRATION_ENABLED),
        NGROK_AUTHTOKEN: '',
    });

    const [testing, setTesting] = useState<string | null>(null);
    const [ngrokBusy, setNgrokBusy] = useState(false);
    const [ngrokStatus, setNgrokStatus] = useState<NgrokStatus | undefined>(ngrok);
    const [copied, setCopied] = useState<string | null>(null);

    const copyText = async (value: string, key: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
            toast.success('คัดลอกแล้ว');
        } catch {
            toast.error('คัดลอกไม่สำเร็จ');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('setting.database.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Settings updated successfully!'),
            onError: () => toast.error('Failed to update settings.'),
        });
    };

    const testConnection = async (type: 'app' | 'hosxp' | 'line') => {
        setTesting(type);
        try {
            const { data: result } = await axios.post(route('setting.database.test'), { type, config: data });
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error: unknown) {
            const message = isAxiosError(error)
                ? (error.response?.data?.message || (error.response?.status === 419 ? 'หมดเวลาเซสชัน กรุณารีเฟรชหน้าแล้วลองใหม่' : error.message))
                : 'An error occurred while testing the connection.';
            toast.error(message);
        } finally {
            setTesting(null);
        }
    };

    const controlTunnel = async (action: 'start' | 'stop', driver: 'cloudflare' | 'ngrok' = 'cloudflare') => {
        setNgrokBusy(true);
        if (action === 'start' && driver === 'cloudflare') {
            toast.info('กำลังเปิดอุโมงค์ ครั้งแรกอาจดาวน์โหลดโปรแกรมสักครู่');
        }
        try {
            const { data: result } = await axios.post(
                route(action === 'start' ? 'setting.ngrok.start' : 'setting.ngrok.stop'),
                action === 'start' ? { driver } : {},
            );
            setNgrokStatus(result);
            if (result.success) {
                toast.success(result.message || (action === 'start' ? 'เปิดอุโมงค์แล้ว' : 'ปิดอุโมงค์แล้ว'));
                if (result.callback_url) {
                    setData('LINE_OAUTH_REDIRECT', result.callback_url);
                }
            } else {
                toast.error(result.error || result.message || 'ดำเนินการไม่สำเร็จ');
            }
        } catch (error: unknown) {
            const payload = isAxiosError(error) ? error.response?.data : null;
            if (payload && typeof payload === 'object') {
                setNgrokStatus(payload as NgrokStatus);
            }
            const message = isAxiosError(error) && error.response?.status === 419
                ? 'หมดเวลาเซสชัน กรุณารีเฟรชหน้าแล้วลองใหม่'
                : (payload?.error || payload?.message || 'เชื่อมต่ออุโมงค์ไม่สำเร็จ');
            toast.error(message);
        } finally {
            setNgrokBusy(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Database & Integrations">
            <Head title="Database & Integrations" />
            <div className="flex-1 p-4 md:p-6">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Database & Integrations</CardTitle>
                        <CardDescription>
                            Configure database connections and external service integrations.
                        </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit}>
                            <Tabs defaultValue="app-db" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
                                    <TabsTrigger value="app-db">App Database</TabsTrigger>
                                    <TabsTrigger value="hosxp">HOSxP Database</TabsTrigger>
                                    <TabsTrigger value="line">LINE</TabsTrigger>
                                    <TabsTrigger value="ngrok">อุโมงค์ HTTPS</TabsTrigger>
                                </TabsList>

                                {/* App Database Tab */}
                                <TabsContent value="app-db" className="space-y-4">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                                                <div className="mt-2 text-sm text-yellow-700">
                                                    <p>Changing these settings will update your .env file and may break the application if incorrect. Proceed with caution.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="DB_HOST">Host</Label>
                                            <Input id="DB_HOST" value={data.DB_HOST} onChange={e => setData('DB_HOST', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="DB_PORT">Port</Label>
                                            <Input id="DB_PORT" value={data.DB_PORT} onChange={e => setData('DB_PORT', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="DB_DATABASE">Database Name</Label>
                                            <Input id="DB_DATABASE" value={data.DB_DATABASE} onChange={e => setData('DB_DATABASE', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="DB_USERNAME">Username</Label>
                                            <Input id="DB_USERNAME" value={data.DB_USERNAME} onChange={e => setData('DB_USERNAME', e.target.value)} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="DB_PASSWORD">Password</Label>
                                            <Input id="DB_PASSWORD" type="password" value={data.DB_PASSWORD} onChange={e => setData('DB_PASSWORD', e.target.value)} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <Button type="button" variant="outline" onClick={() => testConnection('app')} disabled={!!testing}>
                                            {testing === 'app' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Test Connection
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* HOSxP Database Tab */}
                                <TabsContent value="hosxp" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="HOSXP_DB_HOST">Host</Label>
                                            <Input id="HOSXP_DB_HOST" value={data.HOSXP_DB_HOST} onChange={e => setData('HOSXP_DB_HOST', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="HOSXP_DB_PORT">Port</Label>
                                            <Input id="HOSXP_DB_PORT" value={data.HOSXP_DB_PORT} onChange={e => setData('HOSXP_DB_PORT', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="HOSXP_DB_DATABASE">Database Name</Label>
                                            <Input id="HOSXP_DB_DATABASE" value={data.HOSXP_DB_DATABASE} onChange={e => setData('HOSXP_DB_DATABASE', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="HOSXP_DB_USERNAME">Username</Label>
                                            <Input id="HOSXP_DB_USERNAME" value={data.HOSXP_DB_USERNAME} onChange={e => setData('HOSXP_DB_USERNAME', e.target.value)} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="HOSXP_DB_PASSWORD">Password</Label>
                                            <Input id="HOSXP_DB_PASSWORD" type="password" value={data.HOSXP_DB_PASSWORD} onChange={e => setData('HOSXP_DB_PASSWORD', e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button type="button" variant="outline" onClick={() => testConnection('hosxp')} disabled={!!testing}>
                                            {testing === 'hosxp' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Test Connection
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* LINE Integration Tab */}
                                <TabsContent value="line" className="space-y-4">
                                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 space-y-2">
                                        <p>สมัครด้วย LINE แล้วกรอกเลขบัตร/แผนกบนเว็บ ระบบจะส่งข้อความผ่าน Messaging API หลังสมัครครบ</p>
                                        <p className="font-medium text-amber-800">
                                            LINE จะขึ้น 400 ถ้ายังไม่ได้วาง Callback URL นี้ใน LINE Developers → LINE Login → Callback URL ให้ตรงทุกตัวอักษร (รวม https และ path)
                                        </p>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm font-medium">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(data.LINE_INTEGRATION_ENABLED)}
                                            onChange={(e) => setData('LINE_INTEGRATION_ENABLED', e.target.checked)}
                                        />
                                        เปิดใช้งาน LINE Login / สมัครสมาชิก
                                    </label>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_LOGIN_CHANNEL_ID">Login Channel ID</Label>
                                            <Input id="LINE_LOGIN_CHANNEL_ID" value={data.LINE_LOGIN_CHANNEL_ID} onChange={e => setData('LINE_LOGIN_CHANNEL_ID', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_LOGIN_CHANNEL_SECRET">Login Channel Secret</Label>
                                            <Input id="LINE_LOGIN_CHANNEL_SECRET" type="password" value={data.LINE_LOGIN_CHANNEL_SECRET} onChange={e => setData('LINE_LOGIN_CHANNEL_SECRET', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_OAUTH_REDIRECT">Callback URL (ต้องตรงกับ LINE Developers)</Label>
                                            <div className="flex gap-2">
                                                <Input id="LINE_OAUTH_REDIRECT" value={data.LINE_OAUTH_REDIRECT || ''} onChange={e => setData('LINE_OAUTH_REDIRECT', e.target.value)} />
                                                <Button type="button" variant="outline" onClick={() => copyText(data.LINE_OAUTH_REDIRECT || '', 'callback')}>
                                                    {copied === 'callback' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_MESSAGING_CHANNEL_ACCESS_TOKEN">Messaging Channel Access Token</Label>
                                            <Input id="LINE_MESSAGING_CHANNEL_ACCESS_TOKEN" type="password" value={data.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN} onChange={e => setData('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_MESSAGING_CHANNEL_SECRET">Messaging Channel Secret (สำหรับ webhook)</Label>
                                            <Input id="LINE_MESSAGING_CHANNEL_SECRET" type="password" value={data.LINE_MESSAGING_CHANNEL_SECRET || ''} onChange={e => setData('LINE_MESSAGING_CHANNEL_SECRET', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_OA_ADD_FRIEND_URL">ลิงก์แอดเพื่อน OA (ไม่บังคับ)</Label>
                                            <Input id="LINE_OA_ADD_FRIEND_URL" value={data.LINE_OA_ADD_FRIEND_URL || ''} onChange={e => setData('LINE_OA_ADD_FRIEND_URL', e.target.value)} placeholder="https://line.me/R/ti/p/@xxxx" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="LINE_WELCOME_MESSAGE">ข้อความต้อนรับ (ใช้ {'{name}'} ได้)</Label>
                                            <Input id="LINE_WELCOME_MESSAGE" value={data.LINE_WELCOME_MESSAGE || ''} onChange={e => setData('LINE_WELCOME_MESSAGE', e.target.value)} placeholder="สวัสดี คุณ{name} สมัครสมาชิกสำเร็จแล้ว" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button type="button" variant="outline" onClick={() => testConnection('line')} disabled={!!testing}>
                                            {testing === 'line' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            ทดสอบ LINE Messaging API
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="ngrok" className="space-y-4">
                                    <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 space-y-2">
                                        <p className="font-semibold">Subdomain มาจากไหน?</p>
                                        <p>
                                            ไม่ได้สุ่มให้ — คุณต้องมี <strong>โดเมนใน Cloudflare</strong> ก่อน (เช่น <code className="text-xs">hospital.go.th</code>)
                                            แล้วไปที่{' '}
                                            <strong>Zero Trust → Networks → Tunnels → Create → Public Hostname</strong>
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Subdomain</strong> = ชื่อที่คุณตั้งเอง เช่น <code className="text-xs">smh</code></li>
                                            <li><strong>Domain</strong> = เลือกจาก dropdown โดเมนที่มีใน Cloudflare</li>
                                            <li>ได้ URL เช่น <code className="text-xs">https://smh.hospital.go.th</code></li>
                                        </ul>
                                        <p className="text-xs text-sky-800">
                                            โหมด <strong>named</strong> = subdomain ถาวร (แนะนำเปิดอินเทอร์เน็ต) · โหมด <strong>quick</strong> = ลิงก์ชั่วคราว *.trycloudflare.com
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="CLOUDFLARE_TUNNEL_MODE">โหมด Tunnel</Label>
                                            <select
                                                id="CLOUDFLARE_TUNNEL_MODE"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={data.CLOUDFLARE_TUNNEL_MODE || 'quick'}
                                                onChange={e => setData('CLOUDFLARE_TUNNEL_MODE', e.target.value)}
                                            >
                                                <option value="named">named — subdomain ถาวร (Cloudflare Zero Trust)</option>
                                                <option value="quick">quick — ลิงก์ชั่วคราว trycloudflare</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="CLOUDFLARE_PUBLIC_HOSTNAME">Public Hostname (subdomain.โดเมน)</Label>
                                            <Input
                                                id="CLOUDFLARE_PUBLIC_HOSTNAME"
                                                value={data.CLOUDFLARE_PUBLIC_HOSTNAME || ''}
                                                onChange={e => setData('CLOUDFLARE_PUBLIC_HOSTNAME', e.target.value)}
                                                placeholder="smh.hospital.go.th"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="CLOUDFLARE_TUNNEL_CONFIG">ไฟล์ config.yml (named tunnel)</Label>
                                            <Input
                                                id="CLOUDFLARE_TUNNEL_CONFIG"
                                                value={data.CLOUDFLARE_TUNNEL_CONFIG || ''}
                                                onChange={e => setData('CLOUDFLARE_TUNNEL_CONFIG', e.target.value)}
                                                placeholder="deploy/cloudflare/config.yml"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="NGROK_AUTHTOKEN">ngrok Authtoken (ใช้เฉพาะถ้าเปิด ngrok) {hasNgrokAuthtoken ? '(มีค่าเดิมแล้ว เว้นว่างถ้าไม่เปลี่ยน)' : ''}</Label>
                                            <Input id="NGROK_AUTHTOKEN" type="password" value={data.NGROK_AUTHTOKEN || ''} onChange={e => setData('NGROK_AUTHTOKEN', e.target.value)} placeholder={hasNgrokAuthtoken ? '••••••••' : 'วาง authtoken จาก ngrok.com'} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="NGROK_ADDR">พอร์ต Apache ภายใน (vhost 127.0.0.1)</Label>
                                            <Input id="NGROK_ADDR" value={data.NGROK_ADDR || '8081'} onChange={e => setData('NGROK_ADDR', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="NGROK_BIN">ตำแหน่ง ngrok.exe</Label>
                                            <Input id="NGROK_BIN" value={data.NGROK_BIN || ''} onChange={e => setData('NGROK_BIN', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <Globe className="h-4 w-4 text-sky-600" />
                                            สถานะ: {ngrokStatus?.running ? <span className="text-emerald-600">กำลังทำงาน</span> : <span className="text-slate-500">ปิดอยู่</span>}
                                            {ngrokStatus?.mode === 'named' && (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">subdomain ถาวร</span>
                                            )}
                                            {ngrokStatus?.driver === 'cloudflare' && ngrokStatus?.running && ngrokStatus?.mode !== 'named' && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">ไม่มี Visit Site</span>
                                            )}
                                            {ngrokStatus?.driver === 'ngrok' && ngrokStatus?.running && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">มีหน้า Visit Site</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Public URL</div>
                                            <div className="flex gap-2">
                                                <Input readOnly value={ngrokStatus?.public_url || '-'} />
                                                <Button type="button" variant="outline" disabled={!ngrokStatus?.public_url} onClick={() => copyText(ngrokStatus?.public_url || '', 'public')}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">LINE Callback URL — วางใน LINE Login</div>
                                            <div className="flex gap-2">
                                                <Input readOnly value={ngrokStatus?.callback_url || ''} />
                                                <Button type="button" variant="outline" onClick={() => copyText(ngrokStatus?.callback_url || '', 'cb')}>
                                                    {copied === 'cb' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Webhook URL — วางใน Messaging API</div>
                                            <div className="flex gap-2">
                                                <Input readOnly value={ngrokStatus?.webhook_url || ''} />
                                                <Button type="button" variant="outline" onClick={() => copyText(ngrokStatus?.webhook_url || '', 'wh')}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {ngrokStatus?.message && (
                                            <p className="text-xs text-slate-600">{ngrokStatus.message}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                                        {data.CLOUDFLARE_TUNNEL_MODE !== 'named' && (
                                            <Button type="button" variant="outline" onClick={() => controlTunnel('stop')} disabled={ngrokBusy}>
                                                {ngrokBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                                                ปิดอุโมงค์
                                            </Button>
                                        )}
                                        {data.CLOUDFLARE_TUNNEL_MODE !== 'named' && (
                                            <>
                                                <Button type="button" variant="outline" onClick={() => controlTunnel('start', 'ngrok')} disabled={ngrokBusy}>
                                                    {ngrokBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                                    เปิด ngrok
                                                </Button>
                                                <Button type="button" onClick={() => controlTunnel('start', 'cloudflare')} disabled={ngrokBusy} className="bg-emerald-600 hover:bg-emerald-700">
                                                    {ngrokBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                                    เปิด Cloudflare (quick)
                                                </Button>
                                            </>
                                        )}
                                        {data.CLOUDFLARE_TUNNEL_MODE === 'named' && (
                                            <Button type="button" onClick={() => controlTunnel('start', 'cloudflare')} disabled={ngrokBusy} className="bg-sky-600 hover:bg-sky-700">
                                                {ngrokBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                                ซิงก์ URL / ตรวจ Named Tunnel
                                            </Button>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <Separator className="my-6" />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
