import React, { useEffect, useState } from 'react';
import { Modal } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import {
    Tv, ExternalLink, RefreshCw, Maximize2, Minimize2,
    ShieldCheck, AlertCircle, Download, Copy, Check, Monitor, Sparkles
} from 'lucide-react';
import axios from 'axios';

interface Props {
    open: boolean;
    onClose: () => void;
    asset: any;
    onOpenInstall?: () => void;
}

export default function AssetRemoteModal({ open, onClose, asset, onOpenInstall }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteData, setRemoteData] = useState<{
        protocol?: 'rustdesk' | 'meshcentral';
        remote_id?: string;
        rustdesk_url?: string;
        node_id?: string;
        remote_url?: string;
        asset_name: string;
        host: string;
        consent_policy?: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    const fetchConnection = async () => {
        if (!asset?.id) return;
        setLoading(true);
        setError(null);

        try {
            const res = await axios.get(`/im/remote/${asset.id}/connect`);
            if (res.data?.success) {
                setRemoteData(res.data);
                // If RustDesk protocol, trigger launch URL
                if (res.data.protocol === 'rustdesk' && res.data.rustdesk_url) {
                    try {
                        window.location.href = res.data.rustdesk_url;
                    } catch {}
                }
            } else {
                setError(res.data?.message || 'ไม่สามารถค้นหาการเชื่อมต่อรีโมทสำหรับเครื่องนี้ได้');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'คอมพิวเตอร์เครื่องนี้ยังไม่ได้ลงทะเบียน Remote ID ในระบบ กรุณารันตัวติดตั้ง .bat ที่เครื่องลูกข่าย';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && asset?.id) {
            setIsFullScreen(false);
            setCopied(false);
            fetchConnection();
        } else {
            setRemoteData(null);
            setError(null);
        }
    }, [open, asset?.id]);

    const handleCopyId = () => {
        if (!remoteData?.remote_id) return;
        navigator.clipboard.writeText(remoteData.remote_id.replace(/\s+/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatId = (id?: string) => {
        if (!id) return '';
        const clean = id.replace(/\s+/g, '');
        if (clean.length === 9) {
            return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        if (clean.length === 10) {
            return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        return clean;
    };

    if (!asset) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
                        <Tv className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">FSHH Remote Support (โรงพยาบาลค่ายสุรสิงหนาท)</span>
                            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                                {asset.name || asset.asset_code}
                            </span>
                        </div>
                        <p className="text-xs font-normal text-slate-500">
                            ระบบรีโมทระยะไกลความเร็วสูง ควบคุมเมาส์ คีย์บอร์ด และดูหน้าจอสด (One-Click Consent)
                        </p>
                    </div>
                </div>
            }
            extraWide={true}
        >
            <div className={`space-y-4 ${isFullScreen ? 'fixed inset-4 z-50 flex flex-col bg-white p-6 rounded-2xl shadow-2xl' : ''}`}>
                {/* Status & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            {remoteData?.protocol === 'rustdesk' ? 'RustDesk Remote Service พร้อมใช้งาน' : 'ระบบพร้อมเชื่อมต่อ'}
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600">
                            <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
                            <span>ผู้ใช้ปลายทางกด <b>"Accept / ยอมรับ"</b> ที่หน้าจอเพียงอย่างเดียว ไม่ต้องใช้รหัสผ่าน</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchConnection}
                            title="รีโหลดการเชื่อมต่อ"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            <span>รีเฟรช</span>
                        </button>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50">
                        <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mb-3" />
                        <p className="text-sm font-semibold text-slate-700">กำลังเชื่อมต่อกับระบบรีโมทและดึง Remote ID...</p>
                        <p className="text-xs text-slate-500 mt-1">กรุณารอสักครู่ กำลังตรวจสอบสถานะเครื่อง {asset.name || asset.asset_code}</p>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-3">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">เครื่องยังไม่พร้อมสำหรับการรีโมท</h4>
                        <p className="mt-1.5 max-w-md text-xs text-slate-600 leading-relaxed">
                            {error}
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={fetchConnection}
                                className="gap-1.5 text-xs rounded-xl"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                ลองใหม่อีกครั้ง
                            </Button>
                            {onOpenInstall && (
                                <Button
                                    onClick={() => {
                                        onClose();
                                        onOpenInstall();
                                    }}
                                    className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    ดาวน์โหลดตัวติดตั้ง Agent (.bat)
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* RustDesk Connection UI */}
                {remoteData?.protocol === 'rustdesk' && remoteData.remote_id && !loading && !error && (
                    <div className="space-y-4">
                        {/* Remote ID & Quick Launch Card */}
                        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-violet-700 font-medium text-xs">
                                        <Sparkles className="h-4 w-4" />
                                        <span>FSHH Remote Desktop ID</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                                        <span className="font-mono text-3xl md:text-4xl font-extrabold tracking-wider text-slate-800 select-all">
                                            {formatId(remoteData.remote_id)}
                                        </span>
                                        <button
                                            onClick={handleCopyId}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 transition shadow-xs"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-emerald-600">คัดลอกแล้ว!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span>คัดลอก ID</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        เครื่อง: <b className="text-slate-700">{asset.name || asset.asset_code}</b>
                                        {asset.system_spec?.ip_address && ` · IP: ${asset.system_spec.ip_address}`}
                                        {asset.assigned_user && ` · ผู้ใช้งาน: ${asset.assigned_user}`}
                                        {asset.department && ` (${asset.department})`}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                                    <a
                                        href={remoteData.rustdesk_url}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 text-sm shadow-md transition transform active:scale-95"
                                    >
                                        <Monitor className="h-4 w-4" />
                                        <span>เปิด RustDesk รีโมททันที</span>
                                    </a>
                                    <a
                                        href="/im/agent/rustdesk.exe"
                                        download="rustdesk.exe"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-3 text-xs transition shadow-xs"
                                        title="ดาวน์โหลด RustDesk หากเครื่อง Admin ยังไม่มีโปรแกรม"
                                    >
                                        <Download className="h-3.5 w-3.5 text-slate-500" />
                                        <span>โหลดโปรแกรมควบคุม</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step-by-step One-Click Consent Guide */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                                <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">1</span>
                                    <span>คลิกเปิดเชื่อมต่อ</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                    กดปุ่ม <b>"เปิด RustDesk รีโมททันที"</b> ด้านบน ระบบจะเรียกโปรแกรมขึ้นมาต่อหาเครื่องนี้โดยอัตโนมัติ
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
                                <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
                                    <span>กด Accept ที่หน้าจอ (One-Click)</span>
                                </div>
                                <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                                    หน้าจอเครื่องลูกข่ายจะขึ้นกล่องข้อความ ให้ผู้ใช้งานกดปุ่ม <b>"Accept" (ยอมรับ)</b> เพียงปุ่มเดียว <b>ไม่ต้องใส่รหัสผ่าน</b>
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                                <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">3</span>
                                    <span>ควบคุมหน้าจอได้ทันที</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                    หน้าจอจะเชื่อมต่อสดแบบ 60 FPS คมชัดสูง สามารถควบคุมเมาส์ คีย์บอร์ด แลกเปลี่ยนคลิปบอร์ด และส่งไฟล์ได้ทันที
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MeshCentral Web Fallback (if asset still uses MeshCentral) */}
                {remoteData?.protocol === 'meshcentral' && remoteData.remote_url && !loading && !error && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">
                                เชื่อมต่อผ่าน MeshCentral Web Session
                            </span>
                            <button
                                onClick={() => window.open(remoteData.remote_url, '_blank')}
                                className="inline-flex items-center gap-1 text-xs text-violet-700 font-medium hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                เปิดในแท็บใหม่
                            </button>
                        </div>
                        <div className={`relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-900 shadow-inner ${isFullScreen ? 'flex-1' : 'h-[600px]'}`}>
                            <iframe
                                key={iframeKey}
                                src={remoteData.remote_url}
                                title={`Remote Desktop - ${asset.name}`}
                                className="h-full w-full border-0"
                                allow="fullscreen; clipboard-read; clipboard-write; autoplay"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
