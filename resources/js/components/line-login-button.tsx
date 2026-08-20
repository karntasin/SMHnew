import { MessageCircle } from 'lucide-react';

export default function LineLoginButton({
    intent = 'login',
    label,
}: {
    intent?: 'login' | 'register';
    label?: string;
}) {
    const href = intent === 'register'
        ? `${route('auth.line')}?intent=register`
        : route('auth.line');

    return (
        <a
            href={href}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-[#05b34c]"
        >
            <MessageCircle className="h-5 w-5" />
            {label ?? (intent === 'register' ? 'สมัครสมาชิกด้วย LINE' : 'เข้าสู่ระบบด้วย LINE')}
        </a>
    );
}
