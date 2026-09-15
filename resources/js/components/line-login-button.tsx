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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:border-[#06C755]/40 hover:bg-[#06C755]/5 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
            <MessageCircle className="h-5 w-5 text-[#06C755]" />
            {label ?? (intent === 'register' ? 'สมัครสมาชิกด้วย LINE' : 'เข้าสู่ระบบด้วย LINE')}
        </a>
    );
}
