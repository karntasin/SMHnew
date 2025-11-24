import { usePage } from '@inertiajs/react';
import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
  const setting = usePage().props.setting as {
    logo?: string;
  } | null;

  // Fallback ke SVG default
  if (!setting?.logo) {
    return (
      <img
        src="/logosmh.png"
        alt="App Logo"
        className="size-8 object-contain"
        {...props as any}
      />
    );
  }

  return (
    <img
      src={`/storage/${setting.logo}`}
      alt="App Logo"
      className="h-8 w-8 object-contain"
    />
  );
}
