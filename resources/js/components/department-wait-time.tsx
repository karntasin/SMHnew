import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle, BellRing, Building2, Clock3, FlaskConical, Pill, Timer, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export interface WaitStage {
    code: string;
    name: string;
    hint?: string;
    avg: number;
    measured: number;
    over_target: number;
}

export interface WaitBand {
    code: string;
    name: string;
    total: number;
    alert?: boolean;
}

export interface WaitQueueRow {
    vn: string;
    hn: string;
    name: string;
    arrived_at: string;
    stage: string;
    er_type?: string;
    waited: number | null;
    in_hospital?: number | null;
    lab_start?: string;
    alert: boolean;
}

const DEFAULT_RELOAD_KEYS = ['summary', 'wait_bands', 'wait_stages', 'wait_queue', 'wait_lab_queue', 'wait_pharmacy_queue'];

interface Props {
    title: string;
    description: string;
    pdfHref: string;
    mode: 'opd' | 'er' | 'clinic';
    targetMinutes: number;
    avgMinutes: number;
    withinRate: number;
    withinCount: number;
    measured: number;
    overTarget: number;
    waitingNow: number;
    waitingOver60: number;
    waitingLab?: number;
    waitingLabOver60?: number;
    waitingPharmacy?: number;
    waitingPharmacyOver60?: number;
    avgInHospitalMinutes?: number;
    avgLabMinutes?: number;
    avgPharmacyMinutes?: number;
    stages: WaitStage[];
    bands: WaitBand[];
    queue: WaitQueueRow[];
    labQueue?: WaitQueueRow[];
    pharmacyQueue?: WaitQueueRow[];
    reloadKeys?: string[];
}

const formatNum = (n: number, digits = 0) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function formatWait(minutes: number): string {
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return `${m} นาที`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h} ชม. ${rem} นาที` : `${h} ชม.`;
}

function waitTone(minutes: number, target: number): string {
    if (minutes >= target) return 'text-rose-700 bg-rose-50 border-rose-200';
    if (minutes >= target * 0.75) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-emerald-800 bg-emerald-50 border-emerald-200';
}

export function DepartmentWaitTimePanel({
    title,
    description,
    pdfHref,
    mode,
    targetMinutes,
    avgMinutes,
    withinRate,
    withinCount,
    measured,
    overTarget,
    waitingNow,
    waitingOver60,
    waitingLab = 0,
    waitingLabOver60 = 0,
    waitingPharmacy = 0,
    waitingPharmacyOver60 = 0,
    avgInHospitalMinutes = 0,
    avgLabMinutes = 0,
    avgPharmacyMinutes = 0,
    stages,
    bands,
    queue,
    labQueue = [],
    pharmacyQueue = [],
    reloadKeys = DEFAULT_RELOAD_KEYS,
}: Props) {
    useEffect(() => {
        const id = window.setInterval(() => {
            router.reload({ only: reloadKeys, preserveScroll: true, preserveState: true });
        }, 45000);

        return () => window.clearInterval(id);
    }, [reloadKeys]);

    const chart = bands
        .filter((b) => b.code !== 'ข้อมูลผิดปกติ')
        .map((b) => ({ name: b.name, total: b.total, alert: Boolean(b.alert) }));
    const alerts = queue.filter((row) => row.alert);
    const primaryLabel =
        mode === 'er' ? 'เวลารอรับบริการ ER' : mode === 'clinic' ? 'เวลารอรับบริการ' : 'รอพบแพทย์ (คัดกรอง → แพทย์)';
    const waitingHint =
        mode === 'er'
            ? 'รายที่ยังไม่บันทึกบริการ ER (service12)'
            : mode === 'clinic'
              ? 'รายที่ยังไม่ปิดบริการ (service12)'
              : 'ยังไม่พบแพทย์ · นับรอจากเริ่มคัดกรอง';
    const overHint =
        mode === 'er' ? 'ลงทะเบียน → บันทึกบริการ ER' : mode === 'clinic' ? 'ลงทะเบียน → ปิดบริการ (20 → 12)' : 'รอพบแพทย์เกินเป้า (service4 → 5)';
    const waitColumnLabel = mode === 'opd' ? 'รอพบแพทย์' : 'รอมาแล้ว';
    const emptyWaitHint = mode === 'opd' ? 'ยังไม่เริ่มคัดกรอง' : 'ยังไม่เริ่มนับรอ';

    return (
        <section id="sec-wait_time" className="scroll-mt-6 space-y-4">
            {waitingOver60 > 0 ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-950 shadow-sm">
                    <BellRing className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-rose-600" />
                    <div>
                        <div className="font-bold">แจ้งเตือน: ผู้ป่วยรอเกิน {targetMinutes} นาที {formatNum(waitingOver60)} ราย</div>
                        <p className="text-sm text-rose-800/80">
                            มีผู้กำลังรอขณะนี้ {formatNum(waitingNow)} ราย
                            {mode === 'opd' ? ' — เวลารอพบแพทย์นับจากเริ่มคัดกรอง (service4)' : ' — นับจากลงทะเบียน (service20)'}
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-900/5 md:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                        <p className="text-sm text-slate-500">{description}</p>
                    </div>
                    <a href={pdfHref} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky-700 hover:underline">
                        PDF หัวข้อนี้
                    </a>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className={cn('rounded-2xl border px-4 py-3', waitingOver60 > 0 ? 'border-rose-200 bg-rose-50' : 'border-sky-100 bg-sky-50')}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <Users className="h-3.5 w-3.5" />
                            กำลังรอขณะนี้
                        </div>
                        <div className="text-2xl font-bold">{formatNum(waitingNow)}</div>
                        <div className="text-[11px] text-slate-500">{waitingHint}</div>
                    </div>
                    <div className={cn('rounded-2xl border px-4 py-3', waitingOver60 > 0 ? 'border-rose-300 bg-rose-100' : 'border-emerald-100 bg-emerald-50')}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            รอเกิน {targetMinutes} นาที
                        </div>
                        <div className={cn('text-2xl font-bold', waitingOver60 > 0 ? 'text-rose-700' : 'text-emerald-800')}>
                            {formatNum(waitingOver60)}
                        </div>
                        <div className="text-[11px] text-slate-500">{overHint}</div>
                    </div>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <Clock3 className="h-3.5 w-3.5" />
                            {primaryLabel} เฉลี่ย
                        </div>
                        <div className="text-2xl font-bold">{formatNum(avgMinutes, 1)}</div>
                        <div className="text-[11px] text-slate-500">นาที · จาก {formatNum(measured)} visit ที่วัดได้</div>
                    </div>
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <Timer className="h-3.5 w-3.5" />
                            ตามเป้า ≤ {targetMinutes} นาที
                        </div>
                        <div className="text-2xl font-bold">{formatNum(withinRate, 1)}%</div>
                        <div className="text-[11px] text-slate-500">
                            {formatNum(withinCount)} ตามเป้า · {formatNum(overTarget)} เกินเป้า
                        </div>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <Building2 className="h-3.5 w-3.5" />
                            เฉลี่ยอยู่ใน รพ.
                        </div>
                        <div className="text-2xl font-bold">{formatWait(avgInHospitalMinutes)}</div>
                        <div className="text-[11px] text-slate-500">ลงทะเบียน (service20) → ตอนนี้</div>
                    </div>
                    <div className={cn('rounded-2xl border px-4 py-3', waitingLabOver60 > 0 ? 'border-violet-300 bg-violet-100' : 'border-violet-100 bg-violet-50')}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <FlaskConical className="h-3.5 w-3.5" />
                            รอ LAB
                        </div>
                        <div className={cn('text-2xl font-bold', waitingLab > 0 ? 'text-violet-800' : 'text-slate-800')}>
                            {formatNum(waitingLab)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {waitingLabOver60 > 0
                                ? `เกิน ${targetMinutes} นาที ${formatNum(waitingLabOver60)} ราย`
                                : avgLabMinutes > 0
                                  ? `รอเฉลี่ย ${formatWait(avgLabMinutes)}`
                                  : 'รับ LAB → รายงานผล (13 → 14)'}
                        </div>
                    </div>
                    <div className={cn('rounded-2xl border px-4 py-3', waitingPharmacyOver60 > 0 ? 'border-amber-300 bg-amber-100' : 'border-amber-100 bg-amber-50')}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600">
                            <Pill className="h-3.5 w-3.5" />
                            รอจ่ายยา
                        </div>
                        <div className={cn('text-2xl font-bold', waitingPharmacy > 0 ? 'text-amber-900' : 'text-slate-800')}>
                            {formatNum(waitingPharmacy)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {waitingPharmacyOver60 > 0
                                ? `เกิน ${targetMinutes} นาที ${formatNum(waitingPharmacyOver60)} ราย`
                                : avgPharmacyMinutes > 0
                                  ? `รอเฉลี่ย ${formatWait(avgPharmacyMinutes)}`
                                  : 'เริ่ม Key ยา → จ่ายยา (6 → 16)'}
                        </div>
                    </div>
                </div>

                {stages.length > 0 ? (
                    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {stages.map((stage) => (
                            <div key={stage.code} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                <div className="text-sm font-semibold text-slate-800">{stage.name}</div>
                                <div className="mt-1 text-2xl font-bold text-slate-900">{formatNum(stage.avg, 1)}</div>
                                <div className="text-[11px] text-slate-500">นาทีเฉลี่ย · {formatNum(stage.measured)} ราย</div>
                                {stage.over_target > 0 ? (
                                    <div className="mt-1 text-[11px] font-semibold text-rose-600">
                                        เกิน {targetMinutes} นาที {formatNum(stage.over_target)} ราย
                                    </div>
                                ) : (
                                    <div className="mt-1 text-[11px] text-emerald-700">ไม่มีรายที่เกินเกณฑ์ในขั้นนี้</div>
                                )}
                                {stage.hint ? <div className="mt-1 text-[10px] leading-snug text-slate-400">{stage.hint}</div> : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                {chart.length === 0 ? (
                    <p className="text-sm text-slate-500">ไม่มีข้อมูลระยะเวลาในช่วงที่เลือก</p>
                ) : (
                    <div className="mb-6 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={55} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v: number) => formatNum(v)} />
                                <Bar dataKey="total" name="Visit" radius={[6, 6, 0, 0]}>
                                    {chart.map((item) => (
                                        <Cell key={item.name} fill={item.alert ? '#f43f5e' : '#0ea5e9'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-800">คิวที่กำลังรอวันนี้</h3>
                        <span className="text-[11px] text-slate-500">รีเฟรชอัตโนมัติทุก 45 วินาที</span>
                    </div>
                    {queue.length === 0 ? (
                        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">ขณะนี้ไม่มีผู้ป่วยที่กำลังรอเกินเงื่อนไข</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-slate-600">
                                        <th className="px-2 py-2 font-semibold">HN</th>
                                        <th className="px-2 py-2 font-semibold">ผู้ป่วย</th>
                                        <th className="px-2 py-2 font-semibold">มาถึง</th>
                                        <th className="px-2 py-2 font-semibold">สถานะ</th>
                                        {mode === 'er' ? <th className="px-2 py-2 font-semibold">ระดับฉุกเฉิน</th> : null}
                                        <th className="px-2 py-2 text-right font-semibold">อยู่ใน รพ.</th>
                                        <th className="px-2 py-2 text-right font-semibold">{waitColumnLabel}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.concat(queue.filter((row) => !row.alert)).map((row) => (
                                        <tr
                                            key={row.vn}
                                            className={cn('border-b border-slate-100', row.alert ? 'bg-rose-50/80' : 'bg-white')}
                                        >
                                            <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.hn}</td>
                                            <td className="px-2 py-2 font-medium text-slate-800">{row.name}</td>
                                            <td className="px-2 py-2 text-slate-600">{row.arrived_at || '-'}</td>
                                            <td className="px-2 py-2">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{row.stage}</span>
                                            </td>
                                            {mode === 'er' ? (
                                                <td className="px-2 py-2 text-xs text-slate-600">{row.er_type || '-'}</td>
                                            ) : null}
                                            <td className="px-2 py-2 text-right">
                                                <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                                                    {row.in_hospital != null ? formatWait(row.in_hospital) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                {row.waited == null ? (
                                                    <span className="text-xs text-slate-400">{emptyWaitHint}</span>
                                                ) : (
                                                    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', waitTone(row.waited, targetMinutes))}>
                                                        {row.alert ? '⚠ ' : ''}
                                                        {formatWait(row.waited)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-800">กำลังรอผล LAB วันนี้</h3>
                        <span className="text-[11px] text-violet-700">รับ LAB → รายงานผล (service13 → 14)</span>
                    </div>
                    {labQueue.length === 0 ? (
                        <p className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-800">ขณะนี้ไม่มีผู้ป่วยที่กำลังรอผล LAB</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-slate-600">
                                        <th className="px-2 py-2 font-semibold">HN</th>
                                        <th className="px-2 py-2 font-semibold">ผู้ป่วย</th>
                                        <th className="px-2 py-2 font-semibold">รับ LAB</th>
                                        <th className="px-2 py-2 text-right font-semibold">รอผลมาแล้ว</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labQueue.map((row) => (
                                        <tr
                                            key={`lab-${row.vn}`}
                                            className={cn('border-b border-slate-100', row.alert ? 'bg-violet-50/80' : 'bg-white')}
                                        >
                                            <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.hn}</td>
                                            <td className="px-2 py-2 font-medium text-slate-800">{row.name}</td>
                                            <td className="px-2 py-2 text-slate-600">{row.lab_start || row.arrived_at || '-'}</td>
                                            <td className="px-2 py-2 text-right">
                                                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', waitTone(row.waited ?? 0, targetMinutes))}>
                                                    {row.alert ? '⚠ ' : ''}
                                                    {formatWait(row.waited ?? 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-800">กำลังรอจ่ายยาวันนี้</h3>
                        <span className="text-[11px] text-amber-800">เริ่ม Key ยา → จ่ายยา (service6 → 16)</span>
                    </div>
                    {pharmacyQueue.length === 0 ? (
                        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">ขณะนี้ไม่มีผู้ป่วยที่กำลังรอจ่ายยา</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-slate-600">
                                        <th className="px-2 py-2 font-semibold">HN</th>
                                        <th className="px-2 py-2 font-semibold">ผู้ป่วย</th>
                                        <th className="px-2 py-2 font-semibold">เริ่ม Key ยา</th>
                                        <th className="px-2 py-2 text-right font-semibold">รอจ่ายยา</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pharmacyQueue.map((row) => (
                                        <tr
                                            key={`rx-${row.vn}`}
                                            className={cn('border-b border-slate-100', row.alert ? 'bg-amber-50/80' : 'bg-white')}
                                        >
                                            <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.hn}</td>
                                            <td className="px-2 py-2 font-medium text-slate-800">{row.name}</td>
                                            <td className="px-2 py-2 text-slate-600">{row.lab_start || row.arrived_at || '-'}</td>
                                            <td className="px-2 py-2 text-right">
                                                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', waitTone(row.waited ?? 0, targetMinutes))}>
                                                    {row.alert ? '⚠ ' : ''}
                                                    {formatWait(row.waited ?? 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
