import React from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Users, MapPin } from 'lucide-react';

interface Room {
    id: number;
    name: string;
    capacity: number;
    location: string;
    color: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rooms: Room[];
}

export default function CreateModal({ open, onOpenChange, rooms }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        room_id: '',
        start_date: '',
        start_time: '',
        end_time: '',
        attendees_count: '',
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('rooms.bookings.store'), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>จองห้องประชุมใหม่</DialogTitle>
                    <DialogDescription>
                        กรอกรายละเอียดเพื่อทำการจองห้องประชุม
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">หัวข้อการประชุม <span className="text-red-500">*</span></Label>
                        <Input 
                            id="title" 
                            placeholder="เช่น ประชุมประจำเดือน, สัมภาษณ์งาน" 
                            value={data.title}
                            onChange={e => setData('title', e.target.value)}
                            required
                        />
                        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="room">เลือกห้องประชุม <span className="text-red-500">*</span></Label>
                        <Select 
                            value={data.room_id} 
                            onValueChange={val => setData('room_id', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกห้องประชุม" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map(room => (
                                    <SelectItem key={room.id} value={String(room.id)}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: room.color }}></div>
                                            <span>{room.name}</span>
                                            <span className="text-muted-foreground text-xs">({room.capacity} ที่นั่ง)</span>
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
                            <div className="relative">
                                <Input 
                                    type="date" 
                                    value={data.start_date}
                                    onChange={e => setData('start_date', e.target.value)}
                                    required
                                />
                            </div>
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
                                    onChange={e => setData('attendees_count', e.target.value)}
                                />
                            </div>
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
                                    onChange={e => setData('start_time', e.target.value)}
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
                                    onChange={e => setData('end_time', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                        <Textarea 
                            id="description" 
                            placeholder="รายละเอียดอื่นๆ หรืออุปกรณ์ที่ต้องการเพิ่มเติม" 
                            className="h-24"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">ยืนยันการจอง</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
