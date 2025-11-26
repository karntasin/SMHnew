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
import { Loader2, CheckCircle2, XCircle, Database, MessageSquare } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

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

        LINE_LOGIN_CHANNEL_ID: string;
        LINE_LOGIN_CHANNEL_SECRET: string;
        LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: string;
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Application Settings', href: '/settingsapp' },
    { title: 'Database & Integrations', href: '/settingsapp/database' },
];

export default function DatabaseSettings({ env }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        ...env
    });

    const [testing, setTesting] = useState<string | null>(null);

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
            const response = await fetch(route('setting.database.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({ type, config: data })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An error occurred while testing the connection.');
        } finally {
            setTesting(null);
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
                                <TabsList className="grid w-full grid-cols-3 mb-8">
                                    <TabsTrigger value="app-db">App Database</TabsTrigger>
                                    <TabsTrigger value="hosxp">HOSxP Database</TabsTrigger>
                                    <TabsTrigger value="line">LINE Integration</TabsTrigger>
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
                                            <Label htmlFor="LINE_MESSAGING_CHANNEL_ACCESS_TOKEN">Messaging Channel Access Token</Label>
                                            <Input id="LINE_MESSAGING_CHANNEL_ACCESS_TOKEN" type="password" value={data.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN} onChange={e => setData('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN', e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button type="button" variant="outline" onClick={() => testConnection('line')} disabled={!!testing}>
                                            {testing === 'line' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Test LINE API
                                        </Button>
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
