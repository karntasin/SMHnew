import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import AppearanceDropdown from '@/components/appearance-dropdown';
import { usePage, router } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
  const { locale } = usePage().props as any;

  const handleLanguageChange = (value: string) => {
      router.post(route('locale.update'), { locale: value }, {
          preserveScroll: true,
      });
  };

  return (
    <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between px-6 md:px-4 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      {/* Left: Sidebar + Breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
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

        <AppearanceDropdown />
      </div>
    </header>
  );
}
