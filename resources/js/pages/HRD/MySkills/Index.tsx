import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Award, BookOpen } from 'lucide-react';

interface Skill {
    id: number;
    level: number;
    source: string;
    competency: {
        name: string;
        description: string;
    };
}

interface Props {
    skills: Skill[];
}

const breadcrumbs = [
    {
        title: 'Knowledge Management',
        href: '/km/dashboard',
    },
    {
        title: 'ระบบการเรียนรู้ (E-Learning)',
        href: '/km/learn/dashboard',
    },
    {
        title: 'ทักษะของฉัน',
        href: '/km/learn/my-skills',
    },
];

export default function MySkillsIndex({ skills }: Props) {
    const getLevelLabel = (level: number) => {
        switch (level) {
            case 1: return 'ระดับต้น (Beginner)';
            case 2: return 'ระดับกลาง (Intermediate)';
            case 3: return 'ระดับสูง (Advanced)';
            case 4: return 'ผู้เชี่ยวชาญ (Expert)';
            case 5: return 'ปรมาจารย์ (Master)';
            default: return 'ไม่ระบุ';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ทักษะของฉัน" />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">ทักษะและความสามารถ (Competencies)</h1>
                    <p className="text-muted-foreground">
                        รายการทักษะที่คุณได้รับการรับรองหรือผ่านการประเมิน
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {skills.length > 0 ? (
                        skills.map((skill) => (
                            <Card key={skill.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{skill.competency.name}</CardTitle>
                                        <Badge variant="outline">{skill.source}</Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {skill.competency.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">ระดับความชำนาญ</span>
                                            <span className="font-medium">{getLevelLabel(skill.level)}</span>
                                        </div>
                                        <Progress value={skill.level * 20} className="h-2" />
                                        <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                            <span>Level {skill.level}/5</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            <Award className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">ยังไม่มีข้อมูลทักษะ</h3>
                            <p>คุณยังไม่มีทักษะที่ได้รับการบันทึกในระบบ</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
