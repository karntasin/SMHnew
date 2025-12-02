import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { SVGAttributes } from 'react';

interface AppLogoIconProps extends SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function AppLogoIcon({ size = 'md', className, ...props }: AppLogoIconProps) {
  const setting = usePage().props.setting as {
    logo?: string;
  } | null;

  const sizeClasses = {
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-14',
    xl: 'size-16',
  };

  const containerSizeClasses = {
    sm: 'size-10',
    md: 'size-12',
    lg: 'size-16',
    xl: 'size-20',
  };

  const logoSrc = setting?.logo ? `/storage/${setting.logo}` : '/logosmh.png';

  return (
    <div className={cn(
      "relative flex items-center justify-center",
      containerSizeClasses[size],
      // Single clean border
      "rounded-xl",
      "bg-gradient-to-br from-white via-white to-gray-50",
      "ring-2 ring-blue-500/50",
      "shadow-lg shadow-blue-500/20"
    )}>
      {/* Logo image - bigger */}
      <img
        src={logoSrc}
        alt="App Logo"
        className={cn(
          "relative z-10 object-contain",
          sizeClasses[size],
          "drop-shadow-md",
          className
        )}
        {...props as any}
      />
    </div>
  );
}
