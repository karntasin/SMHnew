import { Head, router, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import {
    Camera,
    User,
    Mail,
    Building2,
    X,
    Star,
    Search,
    AlertCircle,
    IdCard,
    Phone,
    Briefcase,
    CheckCircle2,
    MessageCircle,
} from 'lucide-react';
import { useStaffRosterLookup, StaffRosterLookupResult } from '@/hooks/use-staff-roster-lookup';

const UNSPECIFIED_POSITION = '__none__';

function resolvePositionValue(position: string | null | undefined, options: string[]): string {
    const normalized = (position ?? '').trim();
    if (normalized === '') {
        return UNSPECIFIED_POSITION;
    }

    const exact = options.find((option) => option === normalized);
    if (exact) {
        return exact;
    }

    const caseInsensitive = options.find((option) => option.trim().toLowerCase() === normalized.toLowerCase());
    return caseInsensitive ?? normalized;
}

function splitThaiName(full: string): { first: string; last: string } {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
        return { first: parts[0] ?? '', last: '' };
    }

    return {
        first: parts.slice(0, -1).join(' '),
        last: parts[parts.length - 1] ?? '',
    };
}

interface Department {
    id: number;
    name: string;
}

interface UserData {
    id: number;
    name: string;
    prefix?: string | null;
    email: string;
    cid?: string | null;
    phone?: string | null;
    position?: string | null;
    line_id?: string | null;
    line_display_name: string | null;
    line_picture_url: string | null;
    avatar: string | null;
}

interface Props {
    user: UserData;
    rosterMatch?: StaffRosterLookupResult | null;
    departments: Department[];
    positionOptions: string[];
    addFriendUrl?: string | null;
}

export default function CompleteProfile({ user, rosterMatch, departments, positionOptions, addFriendUrl }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const split = splitThaiName(user.name || '');
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar || user.line_picture_url);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const { result, loading, lookup } = useStaffRosterLookup('profile.roster-lookup');

    const { errors } = usePage().props as { errors: Record<string, string> };

    const [form, setForm] = useState({
        prefix: user.prefix || rosterMatch?.prefix || '',
        first_name: rosterMatch?.first_name || split.first,
        last_name: rosterMatch?.last_name || split.last,
        email: user.email || '',
        cid: user.cid || rosterMatch?.cid || '',
        phone: user.phone || rosterMatch?.phone || '',
        position: resolvePositionValue(rosterMatch?.position ?? user.position, positionOptions),
        avatar: null as File | null,
    });

    const dropdownPositions = useMemo(() => {
        const options = [...positionOptions];
        if (form.position && form.position !== UNSPECIFIED_POSITION && !options.includes(form.position)) {
            options.unshift(form.position);
        }
        return options;
    }, [positionOptions, form.position]);

    useEffect(() => {
        lookup({
            first_name: form.first_name,
            last_name: form.last_name,
            cid: form.cid,
        });
    }, [form.first_name, form.last_name, form.cid, lookup]);

    useEffect(() => {
        if (!result?.matched) {
            return;
        }

        setForm((prev) => ({
            ...prev,
            prefix: result.prefix?.trim() || prev.prefix,
            first_name: prev.first_name || result.first_name || '',
            last_name: prev.last_name || result.last_name || '',
            cid: prev.cid || result.cid || '',
            phone: result.phone || prev.phone,
            position: resolvePositionValue(result.position, positionOptions),
        }));
    }, [
        result?.matched,
        result?.prefix,
        result?.first_name,
        result?.last_name,
        result?.cid,
        result?.phone,
        result?.position,
        positionOptions,
    ]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm((prev) => ({ ...prev, avatar: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const toggleDepartment = (deptId: number) => {
        setSelectedIds((prev) => {
            const newIds = prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId];

            if (newIds.length === 1) {
                setPrimaryId(newIds[0]);
            } else if (!newIds.includes(primaryId as number)) {
                setPrimaryId(newIds.length > 0 ? newIds[0] : null);
            }

            return newIds;
        });
    };

    const removeDepartment = (deptId: number) => {
        setSelectedIds((prev) => {
            const newIds = prev.filter((id) => id !== deptId);
            if (primaryId === deptId) {
                setPrimaryId(newIds.length > 0 ? newIds[0] : null);
            }
            return newIds;
        });
    };

    const handleSetPrimary = (deptId: number) => {
        if (selectedIds.includes(deptId)) {
            setPrimaryId(deptId);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!result?.matched) {
            setSubmitError('ไม่พบข้อมูลในระบบ กรุณาติดต่อเจ้าหน้าที่สารสนเทศเพื่อสร้างข้อมูลให้');
            return;
        }
        if (!form.prefix.trim()) {
            setSubmitError('กรุณากรอกคำนำหน้า');
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);

        const formData = new FormData();
        formData.append('prefix', form.prefix.trim());
        formData.append('first_name', form.first_name);
        formData.append('last_name', form.last_name);
        formData.append('phone', form.phone);
        formData.append('position', form.position);
        if (form.email.trim() !== '') {
            formData.append('email', form.email.trim());
        }
        formData.append('cid', form.cid.replace(/\D/g, '').slice(0, 13));

        selectedIds.forEach((id) => {
            formData.append('department_ids[]', id.toString());
        });

        if (primaryId) {
            formData.append('primary_department_id', primaryId.toString());
        }

        if (form.avatar) {
            formData.append('avatar', form.avatar);
        }

        router.post(route('profile.complete.update'), formData, {
            forceFormData: true,
            onError: () => {
                setIsSubmitting(false);
                setSubmitError('กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง');
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const selectedDepartments = departments.filter((d) => selectedIds.includes(d.id));
    const filteredDepartments = departments.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <>
            <Head title="กรอกข้อมูลโปรไฟล์" />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">ยินดีต้อนรับ!</h1>
                        <p className="text-gray-600 mt-2">กรุณากรอกข้อมูลเพื่อเริ่มต้นใช้งานระบบ</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-12 h-12 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {user.line_picture_url ? 'ใช้รูปจาก LINE หรืออัพโหลดรูปใหม่' : 'อัพโหลดรูปโปรไฟล์'}
                                </p>
                                <InputError message={errors.avatar} className="mt-1" />
                            </div>

                            {user.line_id && (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                                    <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                                        <MessageCircle className="h-4 w-4" />
                                        ข้อมูลจาก LINE
                                    </p>
                                    {user.line_display_name && (
                                        <p className="text-sm text-green-900">
                                            ชื่อ LINE: <span className="font-medium">{user.line_display_name}</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-green-800 break-all">
                                        LINE User ID: <span className="font-mono">{user.line_id}</span>
                                    </p>
                                </div>
                            )}

                            {result?.matched && (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                                    <p className="flex items-center gap-2 font-medium">
                                        <CheckCircle2 className="h-4 w-4" />
                                        พบข้อมูลในระบบ — บทบาท: {result.role_name}
                                    </p>
                                </div>
                            )}

                            {result && !result.matched && !loading && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    <p className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {result.message}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="prefix">
                                    คำนำหน้า <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="prefix"
                                    value={form.prefix}
                                    onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
                                    placeholder="เช่น นาย, นาง, นางสาว, นพ."
                                    className="h-12"
                                    required
                                />
                                <InputError message={errors.prefix} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">
                                        ชื่อ <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="first_name"
                                        value={form.first_name}
                                        onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                                        className="h-12"
                                        required
                                    />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">
                                        นามสกุล <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="last_name"
                                        value={form.last_name}
                                        onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                                        className="h-12"
                                        required
                                    />
                                    <InputError message={errors.last_name} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    อีเมล (ไม่บังคับ)
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="example@hospital.go.th"
                                    className="h-12"
                                />
                                <p className="text-xs text-gray-500">แยกจากบัญชี LINE — กรอกเฉพาะเมื่อต้องการใช้งานอีเมลจริง</p>
                                <InputError message={errors.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cid" className="flex items-center gap-2">
                                    <IdCard className="w-4 h-4 text-gray-500" />
                                    เลขบัตรประชาชน (13 หลัก) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="cid"
                                    inputMode="numeric"
                                    maxLength={13}
                                    value={form.cid}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, cid: e.target.value.replace(/\D/g, '').slice(0, 13) }))
                                    }
                                    placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
                                    className="h-12 tracking-wider"
                                    required
                                />
                                <p className="text-xs text-gray-500">ระบบจะตรวจสอบกับข้อมูลบุคลากรในไฟล์บทบาท</p>
                                <InputError message={errors.cid} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    เบอร์โทร
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                    className="h-12"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position" className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-500" />
                                    ตำแหน่ง
                                </Label>
                                <Select
                                    value={form.position || UNSPECIFIED_POSITION}
                                    onValueChange={(value) => setForm((p) => ({ ...p, position: value }))}
                                >
                                    <SelectTrigger id="position" className="h-12">
                                        <SelectValue placeholder="เลือกตำแหน่ง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNSPECIFIED_POSITION}>ไม่ระบุตำแหน่ง</SelectItem>
                                        {dropdownPositions.map((position) => (
                                            <SelectItem key={position} value={position}>
                                                {position}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.position} />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    แผนก/หน่วยงาน (เลือกได้หลายแผนก) <span className="text-red-500">*</span>
                                </Label>

                                {selectedDepartments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                                        {selectedDepartments.map((dept) => (
                                            <Badge
                                                key={dept.id}
                                                variant={primaryId === dept.id ? 'default' : 'secondary'}
                                                className="flex items-center gap-1 cursor-pointer hover:opacity-80 py-1.5 px-3"
                                                onClick={() => handleSetPrimary(dept.id)}
                                            >
                                                {primaryId === dept.id && <Star className="w-3 h-3 fill-current" />}
                                                {dept.name}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeDepartment(dept.id);
                                                    }}
                                                    className="ml-1 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="border rounded-lg overflow-hidden">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="ค้นหาแผนก..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 border-0 border-b rounded-none focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredDepartments.map((dept) => (
                                            <label
                                                key={dept.id}
                                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <Checkbox
                                                    checked={selectedIds.includes(dept.id)}
                                                    onCheckedChange={() => toggleDepartment(dept.id)}
                                                />
                                                <span className="flex-1 text-sm">{dept.name}</span>
                                                {selectedIds.includes(dept.id) && primaryId === dept.id && (
                                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                                )}
                                            </label>
                                        ))}
                                        {filteredDepartments.length === 0 && (
                                            <div className="px-3 py-4 text-center text-gray-500 text-sm">ไม่พบแผนกที่ค้นหา</div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500">
                                    <Star className="w-3 h-3 inline-block mr-1 text-yellow-500 fill-current" />
                                    คลิกที่ Badge เพื่อตั้งเป็นแผนกหลัก | เลือกได้: {selectedIds.length} แผนก
                                </p>

                                {selectedIds.length === 0 && (
                                    <p className="text-sm text-red-500">กรุณาเลือกแผนกอย่างน้อย 1 แผนก</p>
                                )}
                            </div>

                            {submitError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {submitError}
                                </div>
                            )}

                            {Object.keys(errors).length > 0 && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <p className="font-medium mb-1">กรุณาแก้ไขข้อผิดพลาด:</p>
                                    <ul className="list-disc list-inside">
                                        {Object.values(errors).map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-medium"
                                disabled={isSubmitting || selectedIds.length === 0 || loading || !result?.matched}
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเริ่มใช้งาน'}
                            </Button>
                        </form>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้ภายในระบบเท่านั้น
                        {addFriendUrl && (
                            <>
                                <br />
                                <a href={addFriendUrl} target="_blank" rel="noreferrer" className="text-green-600 font-medium hover:underline">
                                    แอดเพื่อนบัญชีทางการ LINE เพื่อรับข้อความแจ้งเตือน
                                </a>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </>
    );
}
