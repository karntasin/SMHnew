import AppLogoIcon from '@/components/app-logo-icon';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Hospital, Shield, Heart } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const { props } = usePage();
    const [mounted, setMounted] = useState(false);

    const setting = props?.setting as {
        nama_app: string;
        logo?: string;
        warna?: string;
        seo?: {
            title?: string;
            description?: string;
            keywords?: string;
        };
    };

    const primaryColor = setting?.warna || '#0ea5e9';
    const primaryForeground = '#ffffff';

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', primaryColor);
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        document.documentElement.style.setProperty('--primary-foreground', primaryForeground);
        document.documentElement.style.setProperty('--color-primary-foreground', primaryForeground);
        
        // Animation mount
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, [primaryColor, primaryForeground]);

    return (
        <div className="relative min-h-svh overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                {/* Animated Circles */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob dark:opacity-20"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 dark:opacity-20"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 dark:opacity-20"></div>
                <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-6000 dark:opacity-20"></div>
                
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2V36h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40 dark:opacity-10"></div>
            </div>

            {/* Floating Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <Hospital className="absolute top-[10%] left-[10%] w-8 h-8 text-blue-400/30 animate-float" />
                <Shield className="absolute top-[20%] right-[15%] w-6 h-6 text-purple-400/30 animate-float animation-delay-2000" />
                <Heart className="absolute bottom-[30%] left-[5%] w-7 h-7 text-pink-400/30 animate-float animation-delay-4000" />
                <Hospital className="absolute bottom-[15%] right-[10%] w-9 h-9 text-indigo-400/30 animate-float animation-delay-6000" />
            </div>

            {/* Main Content */}
            <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
                <div 
                    className={`w-full max-w-md transition-all duration-700 ease-out ${
                        mounted 
                            ? 'opacity-100 translate-y-0' 
                            : 'opacity-0 translate-y-8'
                    }`}
                >
                    {/* Card */}
                    <div className="relative rounded-2xl bg-white/80 backdrop-blur-xl shadow-2xl shadow-blue-500/10 dark:bg-gray-800/80 dark:shadow-none border border-white/20 dark:border-gray-700/50 overflow-hidden">
                        {/* Gradient Top Border */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        
                        <div className="p-8 sm:p-10">
                            <div className="flex flex-col gap-8">
                                {/* Logo and Header Section */}
                                <div className="flex flex-col items-center gap-6">
                                    <Link 
                                        href={route('home')} 
                                        className="group flex flex-col items-center gap-4 font-medium transition-all"
                                    >
                                        {/* Simple Single Border Logo */}
                                        <div className="relative">
                                            {/* Subtle glow on hover */}
                                            <div className="absolute inset-[-6px] rounded-2xl bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            {/* Logo container - single border */}
                                            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-white via-white to-gray-50 ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/20 transform transition-all duration-500 group-hover:scale-105 group-hover:ring-blue-500">
                                                <img
                                                    src={setting?.logo ? `/storage/${setting.logo}` : '/logosmh.png'}
                                                    alt="Logo"
                                                    className="size-16 object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* App name */}
                                        <div className="text-center">
                                            <span className="block text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] group-hover:animate-gradient-x dark:from-blue-400 dark:via-purple-400 dark:to-blue-400">
                                                {setting?.nama_app}
                                            </span>
                                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                                Hospital Dashboard
                                            </span>
                                        </div>
                                    </Link>

                                    <div className="space-y-2 text-center">
                                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                            {title}
                                        </h1>
                                        {description && (
                                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                                {description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Form Content */}
                                <div className="space-y-6">
                                    {children}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 px-8 py-5 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" />
                                © {new Date().getFullYear()} {setting?.nama_app} สงวนลิขสิทธิ์
                            </p>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className={`mt-6 flex justify-center gap-4 transition-all duration-700 delay-300 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur px-3 py-2 rounded-full">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span>ปลอดภัย 100%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur px-3 py-2 rounded-full">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span>เชื่อถือได้</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}