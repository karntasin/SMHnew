import { Link } from '@inertiajs/react';
import { ArrowLeftRight, Banknote, FileCheck2, FileSpreadsheet, ShieldAlert, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    dashboardUrl: string;
    importUrl: string;
    compareUrl?: string;
    stmUrl?: string;
    smtUrl?: string;
    precheckUrl?: string;
    importLabel?: string;
    active: 'dashboard' | 'compare' | 'import' | 'stm' | 'precheck' | 'smt';
    disabledImport?: boolean;
}

export default function ClaimModuleSubNav({
    dashboardUrl,
    importUrl,
    compareUrl,
    stmUrl,
    smtUrl,
    precheckUrl,
    importLabel = 'นำเข้าไฟล์',
    active,
    disabledImport = false,
}: Props) {
    const items = [
        {
            key: 'dashboard' as const,
            label: 'ตรวจสอบ',
            hint: 'ภาพรวมสิทธิ์',
            href: dashboardUrl,
            icon: FileCheck2,
            disabled: false,
        },
        ...(compareUrl
            ? [
                  {
                      key: 'compare' as const,
                      label: 'เปรียบเทียบ',
                      hint: 'STM vs HOSxP',
                      href: compareUrl,
                      icon: ArrowLeftRight,
                      disabled: false,
                  },
              ]
            : []),
        ...(precheckUrl
            ? [
                  {
                      key: 'precheck' as const,
                      label: 'ตรวจก่อนเบิก',
                      hint: 'C Deny / ครบถ้วน',
                      href: precheckUrl,
                      icon: ShieldAlert,
                      disabled: false,
                  },
              ]
            : []),
        {
            key: 'import' as const,
            label: importLabel,
            hint: 'e-Claim / REP',
            href: importUrl,
            icon: Upload,
            disabled: disabledImport,
        },
        ...(stmUrl
            ? [
                  {
                      key: 'stm' as const,
                      label: 'นำเข้า STM',
                      hint: 'เลขที่นำเบิก',
                      href: stmUrl,
                      icon: FileSpreadsheet,
                      disabled: false,
                  },
              ]
            : []),
        ...(smtUrl
            ? [
                  {
                      key: 'smt' as const,
                      label: 'จ่ายเงิน SMT',
                      hint: 'สปสช. โอนเงิน',
                      href: smtUrl,
                      icon: Banknote,
                      disabled: false,
                  },
              ]
            : []),
    ];

    return (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;

                if (item.disabled) {
                    return (
                        <div
                            key={item.key}
                            className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 opacity-50"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-400">{item.label}</p>
                                <p className="truncate text-xs text-slate-400">{item.hint}</p>
                            </div>
                        </div>
                    );
                }

                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                            'group flex items-center gap-3 rounded-2xl border p-3.5 transition-all',
                            isActive
                                ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                                : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                        )}
                    >
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                                isActive
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                            )}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p
                                className={cn(
                                    'text-sm font-semibold',
                                    isActive ? 'text-emerald-900 font-bold' : 'text-slate-800 group-hover:text-emerald-800'
                                )}
                            >
                                {item.label}
                            </p>
                            <p
                                className={cn(
                                    'truncate text-xs',
                                    isActive ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-600'
                                )}
                            >
                                {item.hint}
                            </p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
