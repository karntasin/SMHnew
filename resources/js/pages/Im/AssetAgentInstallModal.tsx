import React, { useState } from 'react';
import { Modal } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Terminal, Download, ShieldCheck, Cpu, AlertTriangle, Globe } from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    serverLanIp?: string;
}

export default function AssetAgentInstallModal({ open, onClose, serverLanIp = '192.168.1.214' }: Props) {
    const [copied, setCopied] = useState(false);

    // Initial detection of host
    const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1'
    );

    // Default to domain or LAN IP if on localhost, otherwise current hostname
    const initialHost = isLocalhost ? 'fshh-app.online' : (typeof window !== 'undefined' ? window.location.host : 'fshh-app.online');
    const [targetHost, setTargetHost] = useState(initialHost);

    const isDomainHost = targetHost.includes('fshh-app.online') || (!targetHost.includes('192.168.') && !targetHost.includes('localhost') && !targetHost.includes('127.0.0.1'));
    const scheme = isDomainHost ? 'https:' : (typeof window !== 'undefined' ? window.location.protocol : 'http:');
    const subPath = isDomainHost ? '' : (typeof window !== 'undefined' && window.location.pathname.startsWith('/sss/my-app/public') ? '/sss/my-app/public' : '');

    const effectiveBaseUrl = `${scheme}//${targetHost}${subPath}`;
    const installCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm "${effectiveBaseUrl}/im/agent/install.ps1" | iex`;
    const downloadBatUrl = `${effectiveBaseUrl}/im/agent/download-bat?host=${encodeURIComponent(targetHost)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(installCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="ติดตั้ง Agent บนเครื่องคอมพิวเตอร์ (Windows 10 / 11)"
            wide
            footer={
                <Button variant="outline" className="rounded-xl" onClick={onClose}>
                    ปิดหน้าต่าง
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Intro banner */}
                <div className="flex items-start gap-3 rounded-2xl bg-sky-50/80 p-4 border border-sky-100">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                        <Cpu className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                        <h4 className="font-bold text-sky-900">โปรแกรมดึงสเปกและรีโมทช่วยเหลือ (FSHH Agent & Remote Support)</h4>
                        <p className="mt-0.5 text-sky-700 leading-relaxed">
                            Fort Surasinghanat Hospital (โรงพยาบาลค่ายสุรสิงหนาท) - ติดตั้งครั้งเดียวได้ทั้งระบบรายงานสเปกฮาร์ดแวร์ล่าสุด (CPU-Z)
                            และระบบรีโมทช่วยเหลือผ่านหน้าเว็บ (One-Click Consent) โดยมีหน้าต่างถามความยินยอมผู้ใช้งานหน้าเครื่องก่อนเสมอ
                        </p>
                    </div>
                </div>

                {/* Server Host / IP Configurator */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-sky-600" />
                            <span>IP หรือ Domain ของเครื่องแม่ข่าย (สำหรับเครื่องลูกข่ายเชื่อมต่อเข้ามา):</span>
                        </label>
                        {isLocalhost && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                ตรวจพบเปิดจาก localhost → แปลงเป็น LAN IP อัตโนมัติ
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            value={targetHost}
                            onChange={(e) => setTargetHost(e.target.value.trim())}
                            className="bg-white font-mono text-sm rounded-xl font-bold text-slate-800"
                            placeholder="เช่น fshh-app.online หรือ 192.168.1.214"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[11px] text-slate-400">เลือกเร็ว:</span>
                        <button
                            type="button"
                            onClick={() => setTargetHost('fshh-app.online')}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${targetHost === 'fshh-app.online' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            🌐 fshh-app.online (แนะนำสูงสุด - ติดตั้งได้ทุกที่ผ่าน HTTPS)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetHost(serverLanIp || '192.168.1.214')}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${targetHost === (serverLanIp || '192.168.1.214') ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            🏢 {serverLanIp || '192.168.1.214'} (เฉพาะวง LAN ภายใน)
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                        * เครื่องลูกข่ายเครื่องอื่นในหน่วยงานต้องสามารถเข้าถึง IP/Domain นี้ได้ผ่านระบบเครือข่าย LAN
                    </p>
                </div>

                {/* Method 1: PowerShell Command (Recommended) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs text-sky-700 font-semibold">1</span>
                            <span>วิธีที่ 1: ติดตั้งผ่าน PowerShell (แนะนำ - เร็วที่สุด)</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                            คลิกเดียวจบ
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        เปิดโปรแกรม <b>PowerShell</b> (หรือ Windows Terminal) บนเครื่องลูกข่าย แล้ววางคำสั่งด้านล่างนี้:
                    </p>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3 font-mono text-xs text-sky-300 shadow-inner">
                        <Terminal className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="flex-1 select-all break-all">{installCommand}</span>
                        <Button
                            size="sm"
                            type="button"
                            onClick={handleCopy}
                            className={`rounded-lg transition shrink-0 ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                        >
                            {copied ? (
                                <>
                                    <Check className="mr-1.5 h-3.5 w-3.5" /> คัดลอกแล้ว!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1.5 h-3.5 w-3.5" /> คัดลอกคำสั่ง
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Method 2: Download .bat file */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-700 font-semibold">2</span>
                            <span>วิธีที่ 2: ดาวน์โหลดไฟล์ตัวติดตั้ง (.bat)</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        สำหรับผู้ใช้งานทั่วไปที่ต้องการดับเบิลคลิกไฟล์ติดตั้ง สามารถดาวน์โหลดไฟล์แล้วนำไปรันบนเครื่องเป้าหมาย:
                    </p>

                    <div>
                        <a
                            href={downloadBatUrl}
                            download="install-smh-agent.bat"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                        >
                            <Download className="h-4 w-4 text-sky-600" />
                            <span>ดาวน์โหลด install-smh-agent.bat (สำหรับ {targetHost})</span>
                        </a>
                    </div>
                </div>

                {/* Specifications collected info */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span>ข้อมูลที่ถูกจัดเก็บและรายงาน</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                        <li><b>สเปกฮาร์ดแวร์ล่าสุด</b>: CPU (Cores/Threads/Clock/Socket), RAM (Slots/Speed/ยี่ห้อ), Mainboard, BIOS, Disks, GPU, OS Build, IP/Subnet</li>
                        <li><b>ตรวจสอบสถานะสด (Real-Time)</b>: ดูได้สดเฉพาะตอนที่แอดมินคลิกเปิดดูเครื่องนั้นๆ ไม่มีการบันทึก Log การใช้งานย้อนหลัง</li>
                        <li><b>การตั้งค่า</b>: ติดตั้งเป็น Scheduled Task ทำงานเบื้องหลังอัตโนมัติเมื่อเปิดเครื่อง</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
}
