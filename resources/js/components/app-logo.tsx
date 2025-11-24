import { usePage } from '@inertiajs/react';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
  const setting = usePage().props.setting as {
    nama_app?: string;
    logo?: string;
  } | null;

  const defaultAppName = 'SMH';
  const defaultLogo = '';

  const appName = setting?.nama_app || defaultAppName;
  const logo = setting?.logo || defaultLogo;

  return (
    <div className="flex items-center gap-2">
      <div className="flex aspect-square size-10 items-center justify-center rounded-lg text-sidebar-primary-foreground">
        <img
          src={logo ? `/storage/${logo}` : '/logosmh.png'}
          alt="Logo"
          className="size-10 object-contain"
        />
      </div>
      <div className="grid flex-1 text-left text-sm">
        <span className="mb-0.5 truncate leading-none font-bold text-lg">
          {appName}
        </span>
      </div>
    </div>
  );
}
