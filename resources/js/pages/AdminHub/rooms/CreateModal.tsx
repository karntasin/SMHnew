import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users } from 'lucide-react';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';

interface Room {
    id: number;
    name: string;
    capacity: number;
    location?: string | null;
    color: string;
    image_url?: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rooms: Room[];
    defaultRoomId?: number | null;
}

export default function CreateModal({ open, onOpenChange, rooms, defaultRoomId = null }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        room_id: '',
        start_date: '',
        start_time: '',
        end_time: '',
        attendees_count: '',
        description: '',
    });

    useEffect(() => {
        if (open && defaultRoomId) {
            setData('room_id', String(defaultRoomId));
        }
    }, [open, defaultRoomId]);

    const selectedRoom = rooms.find((room) => String(room.id) === String(data.room_id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('rooms.bookings.store'), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>จองห้องประชุมใหม่</DialogTitle>
                    <DialogDescription>กรอกรายละเอียดเพื่อทำการจองห้องประชุม</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {selectedRoom && (
                        <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/70 p-2">
                            <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
                                {selectedRoom.image_url ? (
                                    <img src={selectedRoom.image_url} alt={selectedRoom.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-slate-400">ไม่มีรูป</div>
                                )}
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">{selectedRoom.name}</div>
                                <div className="text-xs text-slate-500">
                                    {selectedRoom.capacity} ที่นั่ง
                                    {selectedRoom.location ? ` · ${selectedRoom.location}` : ''}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="title">หัวข้อการประชุม <span className="text-red-500">*</span></Label>
                        <Input
                            id="title"
                            placeholder="เช่น ประชุมประจำเดือน, สัมภาษณ์งาน"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="room">เลือกห้องประชุม <span className="text-red-500">*</span></Label>
                        <Select value={data.room_id} onValueChange={(val) => setData('room_id', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกห้องประชุม" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map((room) => (
                                    <SelectItem key={room.id} value={String(room.id)}>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: room.color }} />
                                            <span>{room.name}</span>
                                            <span className="text-xs text-muted-foreground">({room.capacity} ที่นั่ง)</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.room_id && <p className="text-sm text-red-500">{errors.room_id}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>วันที่ <span className="text-red-500">*</span></Label>
                            <ThaiDatePicker
                                value={data.start_date}
                                onChange={(value) => setData('start_date', value)}
                                placeholder="เลือกวันที่จอง"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>จำนวนผู้เข้าร่วม</Label>
                            <div className="relative">
                                <Users className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    className="pl-8"
                                    placeholder="ระบุจำนวนคน"
                                    value={data.attendees_count}
                                    onChange={(e) => setData('attendees_count', e.target.value)}
                                />
                            </div>
                            {errors.attendees_count && <p className="text-sm text-red-500">{errors.attendees_count}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>เวลาเริ่ม <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="time"
                                    className="pl-8"
                                    value={data.start_time}
                                    onChange={(e) => setData('start_time', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>เวลาสิ้นสุด <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="time"
                                    className="pl-8"
                                    value={data.end_time}
                                    onChange={(e) => setData('end_time', e.target.value)}
                                    required
                                />
                            </div>
                            {errors.end_time && <p className="text-sm text-red-500">{errors.end_time}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                        <Textarea
                            id="description"
                            placeholder="รายละเอียดอื่นๆ หรืออุปกรณ์ที่ต้องการเพิ่มเติม"
                            className="h-24"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-sky-600 hover:bg-sky-700">
                            ยืนยันการจอง
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
