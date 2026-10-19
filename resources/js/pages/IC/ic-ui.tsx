import { Button } from '@/components/ui/button';
import { Panel } from '@/components/quality/quality-ui';
import { appPath } from '@/lib/asset';
import { FileDown, Pencil } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export interface IcChart {
    title: string;
    kind: 'line' | 'bar';
    unit?: string;
    target?: number | null;
    points: { label: string; value: number }[];
}

export function icPdfUrl(module: string, start?: string, end?: string) {
    const params = new URLSearchParams({ module });
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);
    return appPath(`/ic/reports/pdf?${params.toString()}`);
}

export function IcPdfButton({
    module,
    start,
    end,
    label = 'รายงาน PDF',
}: {
    module: string;
    start?: string;
    end?: string;
    label?: string;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => window.open(icPdfUrl(module, start, end), '_blank')}
        >
            <FileDown className="h-4 w-4" />
            {label}
        </Button>
    );
}

export function IcEditButton({ onClick }: { onClick: () => void }) {
    return (
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-xl px-2" onClick={onClick}>
            <Pencil className="h-4 w-4" />
        </Button>
    );
}

export function IcCharts({ charts }: { charts?: IcChart[] }) {
    const rows = (charts ?? []).filter((chart) => chart.points.length > 0);
    if (rows.length === 0) return null;

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((chart) => (
                <Panel key={chart.title} title={chart.title} description={chart.unit}>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {chart.kind === 'bar' ? (
                                <BarChart data={chart.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} height={48} />
                                    <YAxis tick={{ fontSize: 11 }} width={36} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <LineChart data={chart.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} width={36} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </Panel>
            ))}
        </div>
    );
}

export function dateInput(value?: string | null) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

export function dateTimeInput(value?: string | null) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
