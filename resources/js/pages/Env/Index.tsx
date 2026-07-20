import React from 'react';
import { Leaf, AlertTriangle, CheckCircle } from 'lucide-react';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';

const breadcrumbs = [
    { title: 'ศูนย์คุณภาพ', href: '/quality' },
    { title: 'ENV', href: route('env.index') },
];

export default function Index() {
    return (
        <QualityPage
            tone="teal"
            icon={Leaf}
            badge="ศูนย์คุณภาพ · ENV"
            title="ภาพรวมสิ่งแวดล้อมและความปลอดภัย"
            subtitle="ระบบบริหารจัดการสิ่งแวดล้อมและความปลอดภัย"
            breadcrumbs={breadcrumbs}
            headTitle="ภาพรวม ENV"
            subNav={<EnvSubNav active="env.index" />}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                    label="ความเสี่ยงด้านสิ่งแวดล้อม"
                    value={0}
                    sub="รายการที่ต้องแก้ไข"
                    icon={AlertTriangle}
                    tone="rose"
                />
                <StatCard
                    label="การตรวจสอบความปลอดภัย"
                    value={0}
                    sub="รอบการเดินสำรวจเดือนนี้"
                    icon={CheckCircle}
                    tone="teal"
                />
            </div>

            <Panel title="สถานะระบบ" description="ภาพรวมโมดูลสิ่งแวดล้อมและความปลอดภัย">
                <EmptyState text="ระบบบริหารจัดการสิ่งแวดล้อมและความปลอดภัย (ENV) กำลังอยู่ระหว่างการพัฒนา" />
            </Panel>
        </QualityPage>
    );
}
