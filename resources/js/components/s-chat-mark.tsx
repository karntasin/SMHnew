type SChatMarkProps = {
    className?: string;
};

export default function SChatMark({ className }: SChatMarkProps) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="sChatBg" x1="6" y1="0" x2="58" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#1a3d5c" />
                    <stop offset="0.42" stopColor="#0c1b30" />
                    <stop offset="1" stopColor="#070b14" />
                </linearGradient>
                <linearGradient id="sChatInk" x1="14" y1="10" x2="50" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#f8feff" />
                    <stop offset="0.22" stopColor="#a5f3fc" />
                    <stop offset="0.55" stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="sChatRim" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#e0fbff" stopOpacity="0.95" />
                    <stop offset="0.45" stopColor="#22d3ee" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#6366f1" stopOpacity="0.28" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#sChatBg)" />
            <rect x="0.9" y="0.9" width="62.2" height="62.2" rx="15.2" fill="none" stroke="url(#sChatRim)" strokeWidth="1.15" />
            <path
                d="M11 43.5c7 11 33 13 43 2.5"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.28"
                strokeWidth="1.35"
                strokeLinecap="round"
            />
            <path
                d="M45.6 18.6c-2.2-5.8-17.4-8.2-23.4-3.2-5.2 4.3-3.4 10.2 3.6 12.4 8.2 2.6 15.4 4.6 15.2 11.2-.2 6.8-9.2 10.6-17.8 7.2"
                fill="none"
                stroke="url(#sChatInk)"
                strokeWidth="5.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="18.2" cy="47.6" r="1.7" fill="#e0fbff" />
        </svg>
    );
}
