import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Building2,
    ClipboardList,
    Construction,
    Heart,
    Shield,
    Upload,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from './DataHubSubNav';
import ClaimModuleSubNav from './ClaimModuleSubNav';
import { Button } from '@/components/ui/button';

interface Scheme {
    key: string;
    title: string;
    short: string;
    subtitle: string;
    description: string;
    import_label: string;
    import_hint: string;
    icon: string;
    tone: string;
    status: string;
    dashboard_route: string;
    import_route: string;
    dashboard_url: string;
    import_url: string;
}

interface Props {
    scheme: Scheme;
    page: 'dashboard' | 'import';
}

const iconMap = {
    ClipboardList,
    Building2,
    Shield,
    Heart,
    Upload,
} as const;

export default function SchemePlaceholder({ scheme, page }: Props) {
    const Icon = iconMap[scheme.icon as keyof typeof iconMap] || Construction;
    const isImport = page === 'import';

    return (
        <QualityPage
            tone={(scheme.tone as 'emerald' | 'sky' | 'violet' | 'rose') || 'emerald'}
            icon={Icon}
            badge="Financial Data Hub"
            title={isImport ? scheme.import_label : scheme.title}
            subtitle={isImport ? scheme.import_hint : scheme.description}
            breadcrumbs={dataHubBreadcrumbs({
                title: isImport ? scheme.import_label : scheme.short,
                href: isImport ? scheme.import_url : scheme.dashboard_url,
            })}
            headTitle={isImport ? scheme.import_label : scheme.title}
            subNav={<DataHubSubNav active={scheme.dashboard_route} />}
        >
            <ClaimModuleSubNav
                dashboardUrl={scheme.dashboard_url}
                importUrl={scheme.import_url}
                importLabel={scheme.import_label}
                active={page}
            />

            <Panel
                title={isImport ? 'หน้าต่างนำเข้าเฉพาะสิทธิ์นี้' : 'หน้าต่างตรวจสอบข้อมูล'}
                description="โครงโมดูลพร้อมแล้ว รอเชื่อมต่อแหล่งข้อมูลและกฎการเปรียบเทียบ"
            >
                <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <Construction className="h-7 w-7" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{scheme.title}</h3>
                            <StatusPill
                                label="เตรียมรองรับ"
                                className="border-amber-200 bg-amber-50 text-amber-800"
                            />
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">
                            {isImport
                                ? `หน้านี้สงวนไว้สำหรับนำเข้าไฟล์ของสิทธิ์${scheme.short} โดยเฉพาะ ไม่รวมกับจ่ายตรง / อปท. / ประกันสังคม / บัตรทอง อื่น`
                                : `หน้านี้สงวนไว้สำหรับตรวจและเปรียบเทียบข้อมูลสิทธิ์${scheme.short} กับ HOSxP โดยแยกการนำเข้าและรายงานออกจากสิทธิ์อื่น`}
                        </p>
                        <ul className="list-inside list-disc text-sm text-slate-500">
                            <li>การนำเข้าไฟล์อยู่หน้านี้เท่านั้น ไม่ใช้หน้ากลางรวม</li>
                            <li>ผลเปรียบเทียบและรายงานจะแสดงในโมดูลนี้เมื่อเปิดใช้งาน</li>
                            <li>โครงสร้าง route / เมนู / สิทธิ์พร้อมต่อยอดได้ทันที</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('finance.data-hub')}>กลับภาพรวมศูนย์ข้อมูลการเงิน</Link>
                    </Button>
                    {!isImport && (
                        <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                            <Link href={scheme.import_url}>
                                <Upload className="mr-2 h-4 w-4" />
                                {scheme.import_label}
                            </Link>
                        </Button>
                    )}
                </div>
            </Panel>
        </QualityPage>
    );
}
