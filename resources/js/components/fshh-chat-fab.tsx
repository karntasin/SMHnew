import { usePage } from '@inertiajs/react';
import SChatMark from '@/components/s-chat-mark';
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
            title="เปิด S-Chat"
            aria-label="เปิด S-Chat"
            className="fixed right-4 bottom-4 z-[80] flex h-14 w-14 items-center justify-center drop-shadow-[0_10px_18px_rgba(8,20,40,0.55)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-300/40 sm:right-6 sm:bottom-6"
        >
            <SChatMark className="h-14 w-14" />
            <span className="sr-only">S-Chat</span>
        </a>
    );
}
