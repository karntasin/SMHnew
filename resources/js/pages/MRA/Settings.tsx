import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Settings,
  List,
  CheckCircle2,
  Zap,
  PenLine,
  Info,
} from 'lucide-react';

interface Criteria {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  audit_guide: string | null;
  data_type: 'auto' | 'manual' | 'both';
  max_score: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Category {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  criteria: Criteria[];
}

interface Props {
  categories: Category[];
}

export default function MraSettings({ categories }: Props) {
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: 'ตั้งค่า', href: '#' },
  ];

  const getDataTypeBadge = (dataType: string) => {
    switch (dataType) {
      case 'auto':
        return (
          <Badge variant="default" className="bg-green-500">
            <Zap className="h-3 w-3 mr-1" />
            Auto
          </Badge>
        );
      case 'manual':
        return (
          <Badge variant="secondary">
            <PenLine className="h-3 w-3 mr-1" />
            Manual
          </Badge>
        );
      case 'both':
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Both
          </Badge>
        );
      default:
        return <Badge variant="outline">{dataType}</Badge>;
    }
  };

  const totalCriteria = categories.reduce((sum, cat) => sum + cat.criteria.length, 0);
  const autoCriteria = categories.reduce((sum, cat) => 
    sum + cat.criteria.filter(c => c.data_type !== 'manual').length, 0);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="ตั้งค่า MRA" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mra">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบ MRA</h1>
              <p className="text-muted-foreground">
                จัดการหมวดหมู่และเกณฑ์การตรวจสอบ ตามมาตรฐาน สรพ. 2563
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <List className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <div className="text-2xl font-bold">{categories.length}</div>
              <div className="text-xs text-muted-foreground">หมวดหมู่</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-blue-500/50 mb-2" />
              <div className="text-2xl font-bold">{totalCriteria}</div>
              <div className="text-xs text-muted-foreground">เกณฑ์ทั้งหมด</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto text-green-500/50 mb-2" />
              <div className="text-2xl font-bold text-green-600">{autoCriteria}</div>
              <div className="text-xs text-muted-foreground">ตรวจอัตโนมัติ</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <PenLine className="h-8 w-8 mx-auto text-orange-500/50 mb-2" />
              <div className="text-2xl font-bold text-orange-600">{totalCriteria - autoCriteria}</div>
              <div className="text-xs text-muted-foreground">ตรวจ Manual</div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  เกี่ยวกับเกณฑ์การตรวจสอบ
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  เกณฑ์การตรวจสอบนี้จัดทำตามคู่มือการตรวจประเมินคุณภาพการบันทึกเวชระเบียน (MRA) 
                  ปี 2563 โดยสถาบันรับรองคุณภาพสถานพยาบาล (องค์การมหาชน) - สรพ.
                  ประกอบด้วย 9 หมวดหลัก รวม {totalCriteria} เกณฑ์
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories & Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              หมวดหมู่และเกณฑ์การตรวจสอบ
            </CardTitle>
            <CardDescription>
              รายละเอียดหมวดหมู่และเกณฑ์ตาม สรพ. 2563
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full" defaultValue={categories.map(c => c.code)}>
              {categories.map((category) => (
                <AccordionItem key={category.id} value={category.code}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {category.code}
                      </Badge>
                      <span className="font-semibold">{category.name}</span>
                      {category.name_en && (
                        <span className="text-sm text-muted-foreground">
                          ({category.name_en})
                        </span>
                      )}
                      <Badge variant="secondary" className="ml-2">
                        {category.criteria.length} เกณฑ์
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">รหัส</TableHead>
                          <TableHead>ชื่อเกณฑ์</TableHead>
                          <TableHead className="w-24">ประเภท</TableHead>
                          <TableHead className="w-20 text-center">คะแนน</TableHead>
                          <TableHead className="w-20 text-center">จำเป็น</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.criteria.map((criterion) => (
                          <TableRow key={criterion.id}>
                            <TableCell className="font-mono text-xs">
                              {criterion.code}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{criterion.name}</div>
                              {criterion.name_en && (
                                <div className="text-xs text-muted-foreground">
                                  {criterion.name_en}
                                </div>
                              )}
                              {criterion.audit_guide && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  💡 {criterion.audit_guide}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {getDataTypeBadge(criterion.data_type)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {criterion.max_score}
                            </TableCell>
                            <TableCell className="text-center">
                              {criterion.is_required ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-start">
          <Link href="/mra">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
