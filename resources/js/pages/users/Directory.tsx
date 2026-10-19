import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Printer, Search, Users } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'การจัดการผู้ใช้งาน', href: '/users' },
    { title: 'รายงานรายชื่อ', href: '/users/directory' },
];

type PageId = 'groups' | 'no-department' | 'no-team' | 'unique';

interface Member {
    id: number;
    name: string;
    position?: string | null;
    is_primary?: boolean;
}

interface UniqueMember extends Member {
    departments: string[];
    teams: string[];
}

interface Group {
    id: number | null;
    name: string;
    code?: string | null;
    unassigned?: boolean;
    members: Member[];
}

interface Props {
    summary: {
        total_users: number;
        department_count: number;
        team_count: number;
    };
    departments: Group[];
    teams: Group[];
    unassigned_department: Member[];
    unassigned_team: Member[];
    unique_members: UniqueMember[];
}

const pages: { id: PageId; label: string }[] = [
    { id: 'groups', label: 'ตามแผนกและทีม' },
    { id: 'no-department', label: 'ไม่มีชื่อในแผนก' },
    { id: 'no-team', label: 'ไม่มีชื่อในทีม' },
    { id: 'unique', label: 'รายชื่อรวม' },
];

function matchesQuery(member: Member, query: string) {
    const haystack = `${member.name} ${member.position || ''}`.toLowerCase();
    return haystack.includes(query);
}

function matchesUnique(member: UniqueMember, query: string) {
    const haystack = `${member.name} ${member.position || ''} ${member.departments.join(' ')} ${member.teams.join(' ')}`.toLowerCase();
    return haystack.includes(query);
}

function filterGroups(groups: Group[], query: string) {
    if (!query) {
        return groups;
    }

    return groups
        .map((group) => ({
            ...group,
            members: group.members.filter((member) => matchesQuery(member, query)),
        }))
        .filter((group) => group.members.length > 0);
}

function affiliationText(names: string[]) {
    return names.length > 0 ? names.join(', ') : 'ไม่ระบุ';
}

function GroupCard({ group, tone }: { group: Group; tone: 'indigo' | 'teal' }) {
    const headerClass = group.unassigned
        ? 'border-slate-200 bg-slate-50'
        : tone === 'indigo'
          ? 'border-indigo-100 bg-indigo-50/80'
          : 'border-teal-100 bg-teal-50/80';
    const countClass = group.unassigned ? 'bg-slate-200 text-slate-700' : tone === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-teal-600 text-white';

    return (
        <section className="directory-card flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${headerClass}`}>
                <div className="min-w-0">
                    {group.code && <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{group.code}</p>}
                    <h3 className="text-base leading-snug font-semibold text-slate-900">{group.name}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${countClass}`}>{group.members.length}</span>
            </div>
            <div className="flex-1 px-2 py-2">
                {group.members.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">ยังไม่มีสมาชิก</p>
                ) : (
                    <ol className="space-y-0.5">
                        {group.members.map((member, index) => (
                            <li
                                key={`${group.id ?? 'none'}-${member.id}`}
                                className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                            >
                                <span className="mt-0.5 w-6 shrink-0 text-right text-xs text-slate-400 tabular-nums">{index + 1}.</span>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-medium text-slate-800">{member.name}</span>
                                        {member.is_primary && (
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                                                แผนกหลัก
                                            </Badge>
                                        )}
                                    </div>
                                    {member.position && <p className="text-muted-foreground text-xs">{member.position}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}

function EmptyNote({ children }: { children: string }) {
    return <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">{children}</p>;
}

function MemberTable({
    members,
    showAffiliations = false,
}: {
    members: Array<Member | UniqueMember>;
    showAffiliations?: boolean;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                    <tr>
                        <th className="w-14 px-3 py-2.5 text-right">ลำดับ</th>
                        <th className="px-3 py-2.5">ชื่อ</th>
                        <th className="px-3 py-2.5">ตำแหน่ง</th>
                        {showAffiliations && <th className="px-3 py-2.5">แผนก</th>}
                        {showAffiliations && <th className="px-3 py-2.5">ทีม</th>}
                    </tr>
                </thead>
                <tbody>
                    {members.map((member, index) => {
                        const unique = member as UniqueMember;

                        return (
                            <tr key={member.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-right text-slate-400 tabular-nums">{index + 1}</td>
                                <td className="px-3 py-2 font-medium text-slate-800">{member.name}</td>
                                <td className="text-muted-foreground px-3 py-2">{member.position || 'ไม่ระบุ'}</td>
                                {showAffiliations && <td className="px-3 py-2 text-slate-700">{affiliationText(unique.departments || [])}</td>}
                                {showAffiliations && <td className="px-3 py-2 text-slate-700">{affiliationText(unique.teams || [])}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value.toLocaleString('th-TH')}</p>
        </div>
    );
}

function ReportPage({ active, id, children }: { active: PageId; id: PageId; children: ReactNode }) {
    return <div className={cn('directory-page space-y-8', active !== id && 'hidden')}>{children}</div>;
}

export default function UserDirectory({ summary, departments, teams, unassigned_department, unassigned_team, unique_members }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState<PageId>('groups');
    const query = searchTerm.trim().toLowerCase();

    const visibleDepartments = useMemo(() => filterGroups(departments, query), [departments, query]);
    const visibleTeams = useMemo(() => filterGroups(teams, query), [teams, query]);
    const visibleUnassignedDepartment = useMemo(
        () => (query ? unassigned_department.filter((member) => matchesQuery(member, query)) : unassigned_department),
        [unassigned_department, query],
    );
    const visibleUnassignedTeam = useMemo(
        () => (query ? unassigned_team.filter((member) => matchesQuery(member, query)) : unassigned_team),
        [unassigned_team, query],
    );
    const visibleUnique = useMemo(
        () => (query ? unique_members.filter((member) => matchesUnique(member, query)) : unique_members),
        [unique_members, query],
    );

    const pageCounts: Partial<Record<PageId, number>> = {
        'no-department': unassigned_department.length,
        'no-team': unassigned_team.length,
        unique: unique_members.length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="รายงานรายชื่อตามแผนกและทีม">
                <style>{`
          @media print {
            .peer,
            header,
            .print-hide,
            .fixed {
              display: none !important;
            }
            body {
              background: #fff !important;
            }
            main {
              margin: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: 0 !important;
              box-shadow: none !important;
            }
            .directory-page {
              display: block !important;
            }
            .directory-page + .directory-page {
              break-before: page;
              page-break-before: always;
            }
            .directory-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 12px !important;
            }
            .directory-card,
            tr {
              break-inside: avoid;
              page-break-inside: avoid;
              box-shadow: none !important;
            }
          }
        `}</style>
            </Head>
            <div className="space-y-8 p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">รายงานรายชื่อตามแผนกและทีม</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            แยกเป็นรายชื่อตามแผนกและทีม ผู้ที่ยังไม่มีชื่อในแผนก ผู้ที่ยังไม่มีชื่อในทีม และรายชื่อรวมที่แสดงคนละครั้ง
                        </p>
                    </div>
                    <div className="print-hide flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href="/users">
                                <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้ารายชื่อ
                            </Link>
                        </Button>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" /> พิมพ์รายงาน
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryStat label="ผู้ใช้งานทั้งหมด" value={summary.total_users} />
                    <SummaryStat label="แผนก" value={summary.department_count} />
                    <SummaryStat label="ทีม HA" value={summary.team_count} />
                </div>

                <div className="print-hide flex flex-col gap-3">
                    <div className="relative max-w-md">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder="ค้นหาชื่อหรือตำแหน่ง..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pages.map((item) => (
                            <Button
                                key={item.id}
                                type="button"
                                variant={page === item.id ? 'default' : 'outline'}
                                className={cn('h-9', page === item.id && 'bg-indigo-600 hover:bg-indigo-700')}
                                onClick={() => setPage(item.id)}
                            >
                                {item.label}
                                {pageCounts[item.id] !== undefined && (
                                    <span className="ml-2 tabular-nums opacity-80">{pageCounts[item.id].toLocaleString('th-TH')}</span>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>

                <ReportPage active={page} id="groups">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold">รายชื่อตามแผนก</h2>
                            <span className="text-muted-foreground text-sm">({visibleDepartments.length})</span>
                        </div>
                        <p className="text-muted-foreground text-sm">ชื่อที่อยู่หลายแผนกจะแสดงซ้ำในทุกแผนกที่เกี่ยวข้อง</p>
                        {visibleDepartments.length === 0 ? (
                            <EmptyNote>{query ? 'ไม่พบรายชื่อแผนกที่ตรงกับคำค้น' : 'ยังไม่มีรายชื่อแผนก'}</EmptyNote>
                        ) : (
                            <div className="directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleDepartments.map((group) => (
                                    <GroupCard key={`dept-${group.id ?? 'none'}`} group={group} tone="indigo" />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-semibold">รายชื่อตามทีม HA</h2>
                            <span className="text-muted-foreground text-sm">({visibleTeams.length})</span>
                        </div>
                        <p className="text-muted-foreground text-sm">ชื่อที่อยู่หลายทีมจะแสดงซ้ำในทุกทีมที่เกี่ยวข้อง</p>
                        {visibleTeams.length === 0 ? (
                            <EmptyNote>{query ? 'ไม่พบรายชื่อทีมที่ตรงกับคำค้น' : 'ยังไม่มีรายชื่อทีม'}</EmptyNote>
                        ) : (
                            <div className="directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleTeams.map((group) => (
                                    <GroupCard key={`team-${group.id ?? 'none'}`} group={group} tone="teal" />
                                ))}
                            </div>
                        )}
                    </section>
                </ReportPage>

                <ReportPage active={page} id="no-department">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold">ผู้ที่ไม่มีชื่ออยู่ในแผนก</h2>
                            <span className="text-muted-foreground text-sm">({visibleUnassignedDepartment.length})</span>
                        </div>
                        {visibleUnassignedDepartment.length === 0 ? (
                            <EmptyNote>{query ? 'ไม่พบรายชื่อที่ตรงกับคำค้น' : 'ทุกคนมีชื่ออยู่ในแผนกแล้ว'}</EmptyNote>
                        ) : (
                            <MemberTable members={visibleUnassignedDepartment} />
                        )}
                    </section>
                </ReportPage>

                <ReportPage active={page} id="no-team">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-semibold">ผู้ที่ไม่มีชื่ออยู่ในทีม</h2>
                            <span className="text-muted-foreground text-sm">({visibleUnassignedTeam.length})</span>
                        </div>
                        {visibleUnassignedTeam.length === 0 ? (
                            <EmptyNote>{query ? 'ไม่พบรายชื่อที่ตรงกับคำค้น' : 'ทุกคนมีชื่ออยู่ในทีมแล้ว'}</EmptyNote>
                        ) : (
                            <MemberTable members={visibleUnassignedTeam} />
                        )}
                    </section>
                </ReportPage>

                <ReportPage active={page} id="unique">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold">รายชื่อรวม</h2>
                            <span className="text-muted-foreground text-sm">({visibleUnique.length})</span>
                        </div>
                        <p className="text-muted-foreground text-sm">แสดงผู้ใช้แต่ละคนครั้งเดียว พร้อมแผนกและทีมที่สังกัด</p>
                        {visibleUnique.length === 0 ? (
                            <EmptyNote>{query ? 'ไม่พบรายชื่อที่ตรงกับคำค้น' : 'ยังไม่มีรายชื่อ'}</EmptyNote>
                        ) : (
                            <MemberTable members={visibleUnique} showAffiliations />
                        )}
                    </section>
                </ReportPage>
            </div>
        </AppLayout>
    );
}
