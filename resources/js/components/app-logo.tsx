import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AppLogoProps {
  className?: string;
  iconClassName?: string;
  collapsed?: boolean;
}

export default function AppLogo({ className, iconClassName, collapsed = false }: AppLogoProps) {
  const setting = usePage().props.setting as {
    nama_app?: string;
    logo?: string;
  } | null;
  const [isHovered, setIsHovered] = useState(false);

  const defaultAppName = 'SMH';
  const defaultLogo = '';

  const appName = setting?.nama_app || defaultAppName;
  const logo = setting?.logo || defaultLogo;

  return (
    <div 
      className={cn("flex items-center gap-4 overflow-hidden py-1", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Simple Single Border Logo Container */}
      <div className={cn(
        "relative flex shrink-0 items-center justify-center transition-all duration-500",
        collapsed ? "h-12 w-12" : "h-[72px] w-[72px]",
        // Single clean border with gradient
        "rounded-2xl",
        "bg-gradient-to-br from-white via-white to-gray-50",
        "dark:from-gray-800 dark:via-gray-700 dark:to-gray-800",
        // Border - using border instead of ring for better visibility
        "border-2 border-blue-500/70 dark:border-blue-400/70",
        // Shadow
        "shadow-lg shadow-blue-500/20 dark:shadow-blue-400/30",
        // Hover effects
        "hover:border-blue-500 dark:hover:border-blue-400",
        "hover:shadow-xl hover:shadow-blue-500/30",
        "hover:scale-105",
        iconClassName
      )}>
        {/* Subtle inner glow on hover */}
        <div className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-500",
          "bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5",
          isHovered ? "opacity-100" : "opacity-0"
        )} />
        
        {/* Logo image - BIGGER */}
        <img
          src={logo ? `/storage/${logo}` : '/logosmh.png'}
          alt="Logo"
          className={cn(
            "relative z-10 object-contain transition-all duration-500",
            collapsed ? "h-9 w-9" : "h-14 w-14",
            "drop-shadow-md",
            isHovered && "scale-110"
          )}
        />
      </div>

      {/* App Name */}
      {!collapsed && (
        <div className="grid flex-1 text-left leading-tight overflow-hidden">
          {/* Main app name */}
          <span className={cn(
            "truncate font-black text-2xl tracking-tight transition-all duration-300",
            "bg-gradient-to-r bg-clip-text text-transparent bg-[length:200%_auto]",
            "from-blue-600 via-purple-600 to-blue-600",
            "dark:from-blue-400 dark:via-purple-400 dark:to-blue-400",
            isHovered && "animate-gradient-x"
          )}>
            {appName}
          </span>
          
          {/* Subtitle */}
          <span className={cn(
            "truncate text-xs font-semibold tracking-wide uppercase transition-all duration-300",
            "text-gray-500 dark:text-gray-400",
            isHovered && "text-blue-600 dark:text-blue-400"
          )}>
            Hospital Dashboard
          </span>
        </div>
      )}
    </div>
  );
}
