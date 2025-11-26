import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  iconClassName?: string;
}

export default function AppLogo({ className, iconClassName }: AppLogoProps) {
  const setting = usePage().props.setting as {
    nama_app?: string;
    logo?: string;
  } | null;

  const defaultAppName = 'SMH';
  const defaultLogo = '';

  const appName = setting?.nama_app || defaultAppName;
  const logo = setting?.logo || defaultLogo;

  return (
    <div className={cn("flex items-center gap-3 overflow-hidden py-1", className)}>
      <div className={cn("relative flex aspect-square size-14 shrink-0 items-center justify-center rounded-xl bg-white/90 dark:bg-sidebar-primary/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 hover:scale-105 hover:shadow-md group", iconClassName)}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <img
          src={logo ? `/storage/${logo}` : '/logosmh.png'}
          alt="Logo"
          className="size-10 object-contain drop-shadow-sm transition-transform group-hover:rotate-3"
        />
      </div>
      <div className="grid flex-1 text-left leading-tight">
        <span className="truncate font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          {appName}
        </span>
        <span className="truncate text-xs font-medium text-muted-foreground">
          Hospital Dashboard
        </span>
      </div>
    </div>
  );
}
