import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Review {
    id: number;
    status: string;
    due_on: string;
    rating: number | null;
    comment: string | null;
    enrollment?: { user?: { name: string }; course?: { title: string } };
}

export default function Behavior({ reviews }: { reviews: { data: Review[] } }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'ติดตามการนำไปใช้', href: '/km/learn/behavior' }]}>
            <Head title="ติดตามการนำไปใช้" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">ประเมินการนำไปใช้หลัง 3 เดือน</h1>
                <p className="text-muted-foreground">เฉพาะหลักสูตรที่ติ๊กให้ติดตาม บันทึกผลจากหัวหน้างาน</p>
                {reviews.data.map((review) => <ReviewCard key={review.id} review={review} />)}
                {reviews.data.length === 0 && <p>ยังไม่มีรายการ</p>}
            </div>
        </AppLayout>
    );
}

function ReviewCard({ review }: { review: Review }) {
    const [rating, setRating] = useState(review.rating || 3);
    const [comment, setComment] = useState(review.comment || '');

    return (
        <Card>
            <CardContent className="space-y-2 pt-6">
                <p className="font-medium">{review.enrollment?.user?.name} · {review.enrollment?.course?.title}</p>
                <p className="text-sm text-muted-foreground">ครบกำหนด {review.due_on} · {review.status === 'done' ? 'บันทึกแล้ว' : 'รอติดตาม'}</p>
                {review.status !== 'done' && (
                    <>
                        <select className="h-10 rounded-md border px-3 text-sm" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ระดับ {level}</option>)}
                        </select>
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="นำความรู้ไปใช้ในงานอย่างไร" />
                        <Button onClick={() => router.put(route('km.learn.behavior.store', review.id), { rating, comment })}>บันทึก</Button>
                    </>
                )}
                {review.status === 'done' && <p className="text-sm">ระดับ {review.rating} · {review.comment}</p>}
            </CardContent>
        </Card>
    );
}
