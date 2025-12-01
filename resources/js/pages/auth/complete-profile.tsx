import { Head, useForm, router, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Camera, User, Mail, Building2, X, Star, Search, AlertCircle } from 'lucide-react';

interface Department {
    id: number;
    name: string;
}

interface UserData {
    id: number;
    name: string;
    email: string;
    line_display_name: string | null;
    line_picture_url: string | null;
    avatar: string | null;
}

interface Props {
    user: UserData;
    departments: Department[];
}

export default function CompleteProfile({ user, departments }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar || user.line_picture_url);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    
    const { errors } = usePage().props as { errors: Record<string, string> };

    const { data, setData } = useForm({
        name: user.name || '',
        email: user.email || '',
        avatar: null as File | null,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('avatar', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const toggleDepartment = (deptId: number) => {
        setSelectedIds(prev => {
            const newIds = prev.includes(deptId)
                ? prev.filter(id => id !== deptId)
                : [...prev, deptId];
            
            // Auto-set primary if first selection or if primary was removed
            if (newIds.length === 1) {
                setPrimaryId(newIds[0]);
            } else if (!newIds.includes(primaryId as number)) {
                setPrimaryId(newIds.length > 0 ? newIds[0] : null);
            }
            
            return newIds;
        });
    };

    const removeDepartment = (deptId: number) => {
        setSelectedIds(prev => {
            const newIds = prev.filter(id => id !== deptId);
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
        setIsSubmitting(true);
        setSubmitError(null);
        
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email);
        
        selectedIds.forEach(id => {
            formData.append('department_ids[]', id.toString());
        });
        
        if (primaryId) {
            formData.append('primary_department_id', primaryId.toString());
        }
        
        if (data.avatar) {
            formData.append('avatar', data.avatar);
        }

        router.post(route('profile.complete.update'), formData, {
            forceFormData: true,
            onSuccess: () => {
                // Force full page reload to dashboard
                window.location.href = '/dashboard';
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Form errors:', errors);
                setSubmitError('กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง');
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const selectedDepartments = departments.filter(d => selectedIds.includes(d.id));
    const filteredDepartments = departments.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Head title="กรอกข้อมูลโปรไฟล์" />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">ยินดีต้อนรับ!</h1>
                        <p className="text-gray-600 mt-2">กรุณากรอกข้อมูลเพื่อเริ่มต้นใช้งานระบบ</p>
                        {user.line_display_name && (
                            <p className="text-sm text-gray-500 mt-1">
                                ชื่อ LINE: <span className="font-medium text-green-600">{user.line_display_name}</span>
                            </p>
                        )}
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <form onSubmit={submit} className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                        {previewUrl ? (
                                            <img 
                                                src={previewUrl} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover"
                                            />
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

                            {/* Name Field */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    ชื่อ-นามสกุล (ชื่อจริง) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="กรอกชื่อ-นามสกุลจริงของคุณ"
                                    className="h-12"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    อีเมล <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="example@hospital.go.th"
                                    className="h-12"
                                    required
                                />
                                <InputError message={errors.email} />
                                {user.email?.includes('@line.login') && (
                                    <p className="text-xs text-amber-600">
                                        กรุณาเปลี่ยนเป็นอีเมลจริงของคุณ
                                    </p>
                                )}
                            </div>

                            {/* Department Multi-Select Field */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    แผนก/หน่วยงาน (เลือกได้หลายแผนก) <span className="text-red-500">*</span>
                                </Label>
                                
                                {/* Selected Departments */}
                                {selectedDepartments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                                        {selectedDepartments.map((dept) => (
                                            <Badge 
                                                key={dept.id}
                                                variant={primaryId === dept.id ? "default" : "secondary"}
                                                className="flex items-center gap-1 cursor-pointer hover:opacity-80 py-1.5 px-3"
                                                onClick={() => handleSetPrimary(dept.id)}
                                            >
                                                {primaryId === dept.id && (
                                                    <Star className="w-3 h-3 fill-current" />
                                                )}
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
                                
                                {/* Department List with Search */}
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
                                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                ไม่พบแผนกที่ค้นหา
                                            </div>
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

                            {/* Error Message */}
                            {submitError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {submitError}
                                </div>
                            )}
                            
                            {/* Show validation errors from server */}
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

                            {/* Submit Button */}
                            <Button 
                                type="submit" 
                                className="w-full h-12 text-base font-medium"
                                disabled={isSubmitting || selectedIds.length === 0}
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเริ่มใช้งาน'}
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้ภายในระบบเท่านั้น
                    </p>
                </div>
            </div>
        </>
    );
}
