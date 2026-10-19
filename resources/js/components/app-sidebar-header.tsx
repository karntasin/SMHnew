import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import AppearanceDropdown from '@/components/appearance-dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { usePage, router } from '@inertiajs/react';
import { normalizeAppPath, resolveAppUrl } from '@/lib/asset';

function backTarget(breadcrumbs: BreadcrumbItemType[]): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const current = normalizeAppPath(window.location.pathname);

  for (let index = breadcrumbs.length - 1; index >= 0; index -= 1) {
    const href = breadcrumbs[index]?.href;
    if (!href || href === '#') {
      continue;
    }

    const path = normalizeAppPath(resolveAppUrl(href));
    if (path !== current) {
      return resolveAppUrl(href);
    }
  }

  return null;
}

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
  const { locale } = usePage().props as any;

  const handleLanguageChange = (value: string) => {
      router.post(route('locale.update'), { locale: value }, {
          preserveScroll: true,
      });
  };

  const handleBack = () => {
    const target = backTarget(breadcrumbs);
    if (target) {
      router.visit(target);
      return;
    }

    const current = normalizeAppPath(window.location.pathname);
    if (current.startsWith('/km/learn') && current !== '/km/learn/hub') {
      router.visit(resolveAppUrl('/km/learn/hub'));
      return;
    }

    if (current === '/km/learn/hub') {
      router.visit(resolveAppUrl('/quality'));
      return;
    }

    window.history.back();
  };

  return (
    <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between px-6 md:px-4 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      {/* Left: Sidebar + Breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={handleBack}
          title="ย้อนกลับ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      {/* Right: Language + Theme */}
      <div className="flex items-center gap-4">
        <Select value={locale} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[140px] h-9 bg-background">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
                <span className="flex items-center gap-2">
                    <span className="text-lg">🇺🇸</span> English
                </span>
            </SelectItem>
            <SelectItem value="th">
                <span className="flex items-center gap-2">
                    <span className="text-lg">🇹🇭</span> ไทย
                </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <NotificationDropdown />
        <AppearanceDropdown />
      </div>
    </header>
  );
}
