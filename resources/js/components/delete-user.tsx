import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

// Components...
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import HeadingSmall from '@/components/heading-small';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <div className="space-y-6">
            <HeadingSmall title="ลบบัญชี" description="ลบบัญชีและข้อมูลทั้งหมดของคุณ" />
            <div className="space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                    <p className="font-medium">คำเตือน</p>
                    <p className="text-sm">กรุณาดำเนินการอย่างระมัดระวัง การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">ลบบัญชี</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>คุณแน่ใจหรือไม่ที่จะลบบัญชีของคุณ?</DialogTitle>
                        <DialogDescription>
                            เมื่อบัญชีของคุณถูกลบ ข้อมูลและทรัพยากรทั้งหมดจะถูกลบอย่างถาวร กรุณากรอกรหัสผ่านของคุณเพื่อยืนยันว่าคุณต้องการลบบัญชีอย่างถาวร
                        </DialogDescription>
                        <form className="space-y-6" onSubmit={deleteUser}>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="sr-only">
                                    รหัสผ่าน
                                </Label>

                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="กรอกรหัสผ่าน"
                                    autoComplete="current-password"
                                />

                                <InputError message={errors.password} />
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary" onClick={closeModal}>
                                        ยกเลิก
                                    </Button>
                                </DialogClose>

                                <Button variant="destructive" disabled={processing} asChild>
                                    <button type="submit">ลบบัญชี</button>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
