import React, { useState } from 'react';
import { Modal } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Copy,
    Check,
    Terminal,
    Download,
    ShieldCheck,
    Globe,
    HelpCircle,
    FileCode,
    Monitor,
    Lock,
    ExternalLink,
    AlertCircle,
    Sparkles,
    CheckCircle2,
    HardDrive,
    Key,
    Info,
} from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    serverLanIp?: string;
}

export default function AssetAgentInstallModal({ open, onClose, serverLanIp = '192.168.1.214' }: Props) {
    const [activeTab, setActiveTab] = useState<'download' | 'guide'>('download');
    const [copiedOneLiner, setCopiedOneLiner] = useState(false);
    const [copiedCertCmd, setCopiedCertCmd] = useState(false);

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
    const downloadPs1Url = `${effectiveBaseUrl}/im/agent/install.ps1?raw=1`;
    const downloadRustDeskUrl = `${effectiveBaseUrl}/im/agent/rustdesk.exe`;
    const downloadFortinetCaUrl = `${effectiveBaseUrl}/im/agent/fortinet-ca.cer`;

    const certInstallCmd = `certutil -addstore -f "ROOT" "%USERPROFILE%\\Downloads\\Fortinet_CA_SSL.cer"`;

    const handleCopyOneLiner = () => {
        navigator.clipboard.writeText(installCommand);
        setCopiedOneLiner(true);
        setTimeout(() => setCopiedOneLiner(false), 2500);
    };

    const handleCopyCertCmd = () => {
        navigator.clipboard.writeText(certInstallCmd);
        setCopiedCertCmd(true);
        setTimeout(() => setCopiedCertCmd(false), 2500);
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
            <div className="space-y-5">
                {/* Intro banner */}
                <div className="flex items-start gap-3 rounded-2xl bg-sky-50/80 p-4 border border-sky-100">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                        <h4 className="font-bold text-sky-900">
                            FSHH Computer & Security Radar Agent — โรงพยาบาลค่ายสุรสิงหนาท
                        </h4>
                        <p className="mt-0.5 text-sky-700 leading-relaxed text-xs">
                            ติดตั้งครั้งเดียวได้ครบ 3 ระบบ: <b>1. ดึงสเปกฮาร์ดแวร์ล่าสุด (CPU-Z/Speccy Level)</b>, <b>2. ตรวจจับความปลอดภัย & มัลแวร์ (Security Radar)</b>, และ <b>3. รีโมทช่วยเหลือทางไกล (FSHH Remote Support)</b>
                        </p>
                    </div>
                </div>

                {/* Server Host / IP Configurator */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-sky-600" />
                            <span>IP หรือ Domain แม่ข่ายสำหรับส่งข้อมูล:</span>
                        </label>
                        {isLocalhost && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                กำลังเปิดจาก localhost → ปรับเป็น fshh-app.online อัตโนมัติ
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            value={targetHost}
                            onChange={(e) => setTargetHost(e.target.value.trim())}
                            className="bg-white font-mono text-sm rounded-xl font-bold text-slate-800 h-9"
                            placeholder="เช่น fshh-app.online หรือ 192.168.1.214"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="text-[11px] text-slate-400">เลือกด่วน:</span>
                        <button
                            type="button"
                            onClick={() => setTargetHost('fshh-app.online')}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                                targetHost === 'fshh-app.online'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            🌐 fshh-app.online (แนะนำสูงสุด - รองรับทั้งภายในและภายนอก รพ.)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetHost(serverLanIp || '192.168.1.214')}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                                targetHost === (serverLanIp || '192.168.1.214')
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            🏢 {serverLanIp || '192.168.1.214'} (เฉพาะวง LAN แม่ข่ายภายใน)
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('download')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px ${
                            activeTab === 'download'
                                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Download className="h-4 w-4" />
                        <span>ช่องทางดาวน์โหลดไฟล์ (Download Hub)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('guide')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px ${
                            activeTab === 'guide'
                                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <HelpCircle className="h-4 w-4" />
                        <span>คู่มือการติดตั้ง & นำเข้าใบรับรอง (Guide & FAQ)</span>
                    </button>
                </div>

                {/* Tab 1: Download Hub */}
                {activeTab === 'download' && (
                    <div className="space-y-4">
                        {/* Primary Recommended: Batch Script Installer */}
                        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/30 p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> แนะนำสูงสุดสำหรับผู้ใช้ทั่วไป
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-emerald-600 text-white">
                                            <Download className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span>1. ตัวติดตั้งอัตโนมัติ (install-fshh-agent.bat)</span>
                                                <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                                                    1-Click Setup
                                                </span>
                                            </h4>
                                            <p className="text-xs text-slate-600">
                                                ดับเบิลคลิกเพื่อรัน มีหน้าจอถาม <b>"ชื่อแผนก"</b> และ <b>"ชื่อผู้รับผิดชอบ"</b> แล้วนำเข้าใบรับรอง Fortinet และลงทะเบียนเครื่องอัตโนมัติ
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <a
                                        href={downloadBatUrl}
                                        download="install-fshh-agent.bat"
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>ดาวน์โหลด install-fshh-agent.bat</span>
                                    </a>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-2 text-[11px] text-emerald-900 font-medium">
                                <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span>วิธีใช้: ดาวน์โหลดแล้วคลิกขวาเลือก <b>"Run as administrator" (เรียกใช้ในฐานะผู้ดูแลระบบ)</b> จากนั้นพิมพ์ชื่อแผนก/ผู้รับผิดชอบ ระบบจะลงทะเบียนและปิดหน้าต่างให้อัตโนมัติ</span>
                            </div>
                        </div>

                        {/* Other Download Channels Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Card 2: smh-agent.ps1 */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                                            <FileCode className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-slate-800 text-xs">smh-agent.ps1</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        ไฟล์สคริปต์หลัก PowerShell สำหรับผู้ดูแลระบบที่ต้องการตรวจสอบโค้ดหรือนำไปปรับแต่งตามนโยบาย
                                    </p>
                                </div>
                                <div className="pt-3 mt-2 border-t border-slate-100">
                                    <a
                                        href={downloadPs1Url}
                                        download="smh-agent.ps1"
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                                    >
                                        <Download className="h-3.5 w-3.5 text-sky-600" />
                                        <span>ดาวน์โหลด .ps1</span>
                                    </a>
                                </div>
                            </div>

                            {/* Card 3: RustDesk Remote */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                                            <Monitor className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-slate-800 text-xs">FSHH Remote Support</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        โปรแกรมรีโมทช่วยเหลือระยะไกล (rustdesk.exe x64) มีระบบถามยินยอมผู้ใช้หน้าเครื่องก่อนเสมอ
                                    </p>
                                </div>
                                <div className="pt-3 mt-2 border-t border-slate-100">
                                    <a
                                        href={downloadRustDeskUrl}
                                        download="rustdesk.exe"
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                                    >
                                        <Download className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>ดาวน์โหลด rustdesk.exe</span>
                                    </a>
                                </div>
                            </div>

                            {/* Card 4: Fortinet Root CA Certificate */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-amber-900 text-xs">Fortinet CA SSL (.cer)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        ใบรับรองความปลอดภัย รพ.ค่ายสุรสิงหนาท สำหรับแก้ปัญหาเบราว์เซอร์แจ้งเตือนไม่ปลอดภัย / SSL Warning
                                    </p>
                                </div>
                                <div className="pt-3 mt-2 border-t border-amber-200/60">
                                    <a
                                        href={downloadFortinetCaUrl}
                                        download="Fortinet_CA_SSL.cer"
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition shadow-xs"
                                    >
                                        <Download className="h-3.5 w-3.5 text-amber-600" />
                                        <span>ดาวน์โหลด .cer</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* PowerShell One-Liner Terminal Option */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                                    <Terminal className="h-4 w-4 text-sky-600" />
                                    <span>ทางเลือกสำหรับช่าง IT: ติดตั้งผ่านคำสั่ง PowerShell ทันที</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">irm | iex</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3 font-mono text-xs text-sky-300 shadow-inner">
                                <Terminal className="h-4 w-4 shrink-0 text-slate-500" />
                                <span className="flex-1 select-all break-all">{installCommand}</span>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={handleCopyOneLiner}
                                    className={`rounded-lg transition shrink-0 ${
                                        copiedOneLiner
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                    }`}
                                >
                                    {copiedOneLiner ? (
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
                    </div>
                )}

                {/* Tab 2: User Guide & Certificate Installation */}
                {activeTab === 'guide' && (
                    <div className="space-y-5 text-xs text-slate-700">
                        {/* 3 Step Installation Guide */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>3 ขั้นตอนการติดตั้งง่ายๆ บนเครื่องคอมพิวเตอร์ปลายทาง</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-xs">
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[11px]">1</span>
                                        <span>ดาวน์โหลดไฟล์</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        กดดาวน์โหลดไฟล์ <b>install-fshh-agent.bat</b> ไว้ในเครื่อง (โฟลเดอร์ Downloads หรือ Desktop)
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-xs">
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[11px]">2</span>
                                        <span>รันแบบสิทธิ์แอดมิน</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        คลิกขวาที่ไฟล์ .bat เลือก <b>"Run as administrator"</b> (หากหน้าต่าง UAC ปรากฏ ให้กด <b>"Yes"</b>)
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-xs">
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[11px]">3</span>
                                        <span>กรอกแผนก & ผู้รับผิดชอบ</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        หน้าจอจะให้พิมพ์ <b>ชื่อแผนก</b> (เช่น OPD, ER, เภสัชกรรม) และ <b>ชื่อผู้รับผิดชอบ</b> แล้วระบบจะลงทะเบียนและปิดหน้าต่างให้อัตโนมัติ
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Fortinet Certificate Guide */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                                    <Key className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-950 text-sm">
                                        วิธีนำเข้าใบรับรองความปลอดภัยเครือข่ายโรงพยาบาล (Fortinet CA SSL Certificate)
                                    </h4>
                                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                                        หากเครื่องในโรงพยาบาลพบปัญหาเบราว์เซอร์แจ้งเตือน <i>"Your connection is not private"</i> หรือเปิดเว็บโรงพยาบาลไม่ได้ ให้ติดตั้งใบรับรอง Fortinet ตามขั้นตอนด้านล่างนี้:
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="rounded-xl bg-white p-3 border border-amber-200/80 space-y-2">
                                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                        <span>แบบที่ 1: ติดตั้งผ่านหน้าต่าง Windows (สำหรับผู้ใช้งาน)</span>
                                    </span>
                                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pl-1">
                                        <li>ดาวน์โหลดไฟล์ <b>Fortinet_CA_SSL.cer</b> แล้วดับเบิลคลิกเปิดไฟล์</li>
                                        <li>คลิกปุ่ม <b>"Install Certificate..."</b></li>
                                        <li>เลือก Store Location: <b>"Local Machine"</b> แล้วกด Next</li>
                                        <li>เลือก <b>"Place all certificates in the following store"</b></li>
                                        <li>กด Browse แล้วเลือกโฟลเดอร์ <b>"Trusted Root Certification Authorities"</b></li>
                                        <li>กด Next และคลิก <b>Finish</b></li>
                                    </ol>
                                </div>

                                <div className="rounded-xl bg-white p-3 border border-amber-200/80 space-y-2">
                                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                        <span>แบบที่ 2: ติดตั้งผ่านคำสั่ง Command Prompt (Admin)</span>
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        เปิด Command Prompt หรือ PowerShell (Run as administrator) แล้ววางคำสั่ง:
                                    </p>
                                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-2 font-mono text-[10px] text-amber-300">
                                        <span className="flex-1 break-all select-all">{certInstallCmd}</span>
                                        <Button
                                            size="sm"
                                            type="button"
                                            onClick={handleCopyCertCmd}
                                            className="h-6 px-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
                                        >
                                            {copiedCertCmd ? 'คัดลอกแล้ว' : 'คัดลอก'}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        * หมายเหตุ: ไฟล์ <code>install-fshh-agent.bat</code> เวอร์ชันใหม่จะทำการนำเข้าใบรับรองนี้ให้อัตโนมัติอยู่แล้ว
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* FAQ and Troubleshooting */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-sky-600" />
                                <span>คำถามที่พบบ่อยและการแก้ไขปัญหา (FAQ & Troubleshooting)</span>
                            </h4>
                            <div className="space-y-2.5">
                                <div className="border-b border-slate-100 pb-2">
                                    <div className="font-semibold text-slate-800 text-xs">
                                        Q: Windows SmartScreen ขึ้นเตือน "Windows protected your PC"?
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        A: เป็นระบบป้องกันของ Windows สำหรับไฟล์สคริปต์ใหม่ ให้คลิกข้อความ <b>"More info" (ข้อมูลเพิ่มเติม)</b> จากนั้นกดปุ่ม <b>"Run anyway" (เรียกใช้ต่อไป)</b>
                                    </div>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <div className="font-semibold text-slate-800 text-xs">
                                        Q: มีการติดตั้ง RustDesk อยู่ในเครื่องแล้ว จะเกิดปัญหาหรือไม่?
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        A: ไม่เกิดปัญหา ตัวติดตั้งจะตรวจพบว่ามีโปรแกรมอยู่แล้ว และจะเชื่อมโยง Service ID มาใช้งานร่วมกับระบบ FSHH Remote Support ทันทีโดยไม่ติดตั้งซ้ำ
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-800 text-xs">
                                        Q: ตรวจสอบได้อย่างไรว่าเครื่องติดตั้งสำเร็จและออนไลน์แล้ว?
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        A: กลับมาที่หน้า <b>"ทะเบียนคอมพิวเตอร์และอุปกรณ์ไอที"</b> ระบบจะแสดงเครื่องที่เพิ่งติดตั้งพร้อมป้ายกำกับสีเขียว <b>"ONLINE"</b> อยู่ด้านบนสุดทันที
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer specs note */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-slate-500">
                        ระบบ Agent ทำงานผ่าน Windows Scheduled Task เบื้องหลังแบบ Low Overhead ไม่หน่วงเครื่อง และส่งรายงานข้อมูลฮาร์ดแวร์เพื่อการบำรุงรักษาอย่างปลอดภัย
                    </span>
                </div>
            </div>
        </Modal>
    );
}
