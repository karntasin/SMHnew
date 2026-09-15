import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { assetUrl, storageUrl } from '@/lib/asset';

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

  const appName = setting?.nama_app || 'SMH';
  const logo = setting?.logo || '';

  return (
    <div className={cn('flex min-w-0 items-center gap-3 overflow-hidden', className)}>
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-xl border-2 border-primary/60 bg-gradient-to-br from-white to-purple-50 shadow-md shadow-primary/10 dark:from-gray-800 dark:to-gray-900',
          collapsed ? 'size-9' : 'size-11',
          iconClassName,
        )}
      >
        <img
          src={logo ? storageUrl(logo) : assetUrl('logosmh.png')}
          alt="Logo"
          className={cn(
            'object-contain',
            collapsed ? 'size-6' : 'size-8',
          )}
        />
      </div>

      {!collapsed && (
        <div className="grid min-w-0 flex-1 text-left leading-tight">
          <span className="truncate text-base font-bold text-primary">
            {appName}
          </span>
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Hospital Dashboard
          </span>
        </div>
      )}
    </div>
  );
}
