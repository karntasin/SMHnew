import React, { useMemo, useState } from 'react';
import { ClipboardCheck, FileSearch, ClipboardList, TrendingUp } from 'lucide-react';
import { QualityPage, StatCard, Panel } from '@/components/quality/quality-ui';
import { cn } from '@/lib/utils';
import QaSubNav, { qaBreadcrumbs } from './QaSubNav';
import Reviews from './Reviews';
import Audits from './Audits';
import Improvements from './Improvements';

type Tab = 'reviews' | 'audits' | 'improvements';

export default function Index({ reviews, audits, improvements, indicators, departments, teams, preselectIndicatorId }: any) {
    const [tab, setTab] = useState<Tab>('reviews');
    const [openReviewForIndicator, setOpenReviewForIndicator] = useState<number | null>(
        preselectIndicatorId ? Number(preselectIndicatorId) : null,
    );

    const stats = useMemo(() => ({
        reviews: reviews?.length ?? 0,
        audits: audits?.length ?? 0,
        improvements: improvements?.length ?? 0,
        completedReviews: (reviews ?? []).filter((r: any) => r.status === 'Completed').length,
        indicatorReviews: (reviews ?? []).filter((r: any) => (r.subject_type || 'custom') === 'indicator').length,
        customReviews: (reviews ?? []).filter((r: any) => (r.subject_type || 'custom') === 'custom').length,
    }), [reviews, audits, improvements]);

    const tabs: { key: Tab; label: string }[] = [
        { key: 'reviews', label: 'ตารางการทบทวน (Reviews)' },
        { key: 'audits', label: 'การตรวจสอบภายใน (Audits)' },
        { key: 'improvements', label: 'แผนพัฒนาคุณภาพ (CQI/AAR)' },
    ];

    return (
        <QualityPage
            tone="violet"
            icon={ClipboardCheck}
            badge="ศูนย์พัฒนาคุณภาพ · QA"
            title="ระบบติดตามการทบทวน"
            subtitle="ทบทวนตัวชี้วัดคุณภาพ หรือเปิดเรื่องทบทวนใหม่ พร้อมติดตามผลและข้อเสนอแนะ"
            breadcrumbs={qaBreadcrumbs}
            headTitle="Quality Assurance"
            subNav={<QaSubNav />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="การทบทวนทั้งหมด" value={stats.reviews} icon={FileSearch} tone="violet" />
                <StatCard label="ทบทวนตัวชี้วัด" value={stats.indicatorReviews} sub={`${stats.customReviews} เรื่องใหม่`} icon={ClipboardCheck} tone="emerald" />
                <StatCard label="การตรวจสอบ (Audit)" value={stats.audits} icon={ClipboardList} tone="sky" />
                <StatCard label="โครงการ CQI/AAR" value={stats.improvements} icon={TrendingUp} tone="amber" />
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                            tab === t.key
                                ? 'border-violet-400 bg-violet-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200',
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'reviews' && (
                <Panel
                    title="ตารางการทบทวน (Reviews)"
                    description="เลือกเชื่อมโยงตัวชี้วัดคุณภาพ หรือสร้างหัวข้อทบทวนเรื่องใหม่"
                >
                    <Reviews
                        reviews={reviews}
                        indicators={indicators || []}
                        departments={departments || []}
                        teams={teams || []}
                        preselectIndicatorId={openReviewForIndicator}
                        onPreselectConsumed={() => setOpenReviewForIndicator(null)}
                    />
                </Panel>
            )}
            {tab === 'audits' && (
                <Panel title="การตรวจสอบภายใน (Audits)" description="บันทึกผลการตรวจสอบภายใน">
                    <Audits audits={audits} />
                </Panel>
            )}
            {tab === 'improvements' && (
                <Panel title="แผนพัฒนาคุณภาพ (CQI/AAR)" description="โครงการพัฒนาคุณภาพอย่างต่อเนื่อง">
                    <Improvements improvements={improvements} />
                </Panel>
            )}
        </QualityPage>
    );
}
