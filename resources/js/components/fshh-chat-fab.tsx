import { MessageCircle } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export default function FshhChatFab() {
    const { fshhChat } = usePage<SharedData>().props;

    if (!fshhChat?.enabled || !fshhChat.openUrl) {
        return null;
    }

    return (
        <a
            href={fshhChat.openUrl}
            target="_blank"
            rel="noreferrer"
            title="เปิด FSHH Chat"
            aria-label="เปิด FSHH Chat"
            className="fixed right-4 bottom-4 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755] text-white shadow-lg shadow-emerald-700/30 transition hover:scale-105 hover:bg-[#05b34c] focus:outline-none focus:ring-4 focus:ring-[#06C755]/40 sm:right-6 sm:bottom-6"
        >
            <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
            <span className="sr-only">FSHH Chat</span>
        </a>
    );
}
