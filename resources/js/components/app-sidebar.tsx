import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

import { usePage, Link } from '@inertiajs/react';
import AppLogo from './app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { iconMapper } from '@/lib/iconMapper';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, ExternalLink, Search, X, BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { isActivePath } from '@/lib/asset';
import { useTranslation } from '@/hooks/use-translation';

interface MenuItem {
  id: number;
  title: string;
  route: string | null;
  icon: string;
  children?: MenuItem[];
}

function filterMenus(items: MenuItem[], query: string): MenuItem[] {
  if (!query.trim()) return items;

  const lower = query.toLowerCase();

  return items.reduce<MenuItem[]>((acc, item) => {
    const children = item.children ? filterMenus(item.children, query) : [];
    const titleMatch = item.title.toLowerCase().includes(lower);

    if (titleMatch || children.length > 0) {
      acc.push({
        ...item,
        children: titleMatch ? item.children : children.length > 0 ? children : undefined,
      });
    }

    return acc;
  }, []);
}

function MenuLabel({ title, level }: { title: string; level: number }) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'min-w-0 flex-1 leading-snug break-words',
        level === 0 ? 'text-[13px] font-medium' : 'text-xs font-normal',
      )}
    >
      {t(title)}
    </span>
  );
}

function MenuIcon({
  icon,
  level,
  isActive,
}: {
  icon: string;
  level: number;
  isActive: boolean;
}) {
  const Icon = iconMapper(icon || 'Folder') as LucideIcon;
  const boxSize = level === 0 ? 'size-8' : level === 1 ? 'size-7' : 'size-6';
  const iconSize = level === 0 ? 'size-4' : 'size-3.5';

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg transition-colors',
        boxSize,
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : level === 0
            ? 'bg-sidebar-accent text-sidebar-foreground/70'
            : 'bg-sidebar-accent/70 text-sidebar-foreground/75',
      )}
    >
      <Icon className={iconSize} />
    </span>
  );
}

function RenderMenu({
  items,
  level = 0,
  searchQuery = '',
}: {
  items: MenuItem[];
  level?: number;
  searchQuery?: string;
}) {
  const { url: currentUrl } = usePage();
  const { state } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = state === 'collapsed';

  if (!Array.isArray(items)) return null;

  return (
    <>
      {items.map((menu) => {
        if (!menu) return null;

        const children = Array.isArray(menu.children) ? menu.children.filter(Boolean) : [];
        const hasChildren = children.length > 0;
        const isActive = menu.route ? isActivePath(currentUrl, menu.route) : false;

        if (!menu.route && !hasChildren) return null;

        const isChildActive = (menuItems: MenuItem[]): boolean =>
          menuItems.some((item) => {
            if (item.route && isActivePath(currentUrl, item.route)) return true;
            if (item.children) return isChildActive(item.children);
            return false;
          });

        const isExpanded = hasChildren && (isChildActive(children) || !!searchQuery.trim());
        const isExternal =
          menu.route &&
          (menu.route.startsWith('http://') || menu.route.startsWith('https://') || menu.route.includes('/admin/tv'));

        const itemClass = cn(
          'group/menu-item relative w-full gap-2.5 rounded-lg transition-colors',
          level === 0 ? 'px-2.5 py-2.5' : 'px-2 py-2',
          isActive
            ? 'bg-primary/12 text-primary font-semibold'
            : 'text-sidebar-foreground hover:bg-sidebar-accent',
          isActive && level === 0 && 'border-l-[3px] border-l-primary pl-[calc(0.625rem-3px)]',
        );

        if (hasChildren) {
          return (
            <Collapsible key={menu.id} asChild defaultOpen={isExpanded} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(itemClass, 'h-auto items-start')}
                    tooltip={isCollapsed ? t(menu.title) : undefined}
                  >
                    <MenuIcon icon={menu.icon} level={level} isActive={isExpanded} />
                    <MenuLabel title={menu.title} level={level} />
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu
                    className={cn(
                      'mt-0.5 space-y-0.5 border-l border-sidebar-border/80',
                      level === 0 ? 'ml-5 pl-2' : 'ml-3 pl-2',
                    )}
                  >
                    <RenderMenu items={children} level={level + 1} searchQuery={searchQuery} />
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        const linkContent = (
          <>
            <MenuIcon icon={menu.icon} level={level} isActive={isActive} />
            <MenuLabel title={menu.title} level={level} />
            {isExternal && (
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
            )}
          </>
        );

        return (
          <SidebarMenuItem key={menu.id}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(itemClass, 'h-auto items-start')}
              tooltip={isCollapsed ? t(menu.title) : undefined}
            >
              {isExternal ? (
                <a
                  href={menu.route || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-w-0 items-start gap-2.5"
                >
                  {linkContent}
                </a>
              ) : (
                <Link
                  href={menu.route || '#'}
                  className="flex w-full min-w-0 items-start gap-2.5"
                  prefetch
                >
                  {linkContent}
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const { menus = [] } = usePage().props as { menus?: MenuItem[] };
  const [searchQuery, setSearchQuery] = useState('');
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const filteredMenus = useMemo(
    () => filterMenus(menus, searchQuery),
    [menus, searchQuery],
  );

  const footerNavItems = [
    {
      title: 'Hospital Website',
      url: 'https://surasinghanart-hos.com/',
      icon: iconMapper('Globe') as LucideIcon,
    },
    {
      title: 'Facebook Page',
      url: 'https://www.facebook.com/fortsurasinghanathos/',
      icon: iconMapper('Facebook') as LucideIcon,
    },
    {
      title: 'Youtube',
      url: 'https://www.youtube.com/watch?v=OTb5icfE96s',
      icon: iconMapper('Youtube') as LucideIcon,
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="inset" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-auto px-1 py-1 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
            >
              <Link href="/dashboard" prefetch>
                <AppLogo collapsed={isCollapsed} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {!isCollapsed && (
          <div className="mb-3 space-y-2 px-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเมนู..."
                className="h-9 border-sidebar-border bg-background/80 pl-9 pr-8 text-sm shadow-none focus-visible:ring-primary/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="ล้างการค้นหา"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Link
              href="/help"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary"
            >
              <BookOpen className="size-3.5 shrink-0" />
              คู่มือการใช้งาน
            </Link>
          </div>
        )}

        <ScrollArea className="flex-1 pr-1">
          <SidebarGroup className="p-0">
            {!isCollapsed && (
              <SidebarGroupLabel className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                เมนูหลัก
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-0.5">
              {filteredMenus.length > 0 ? (
                <RenderMenu items={filteredMenus} searchQuery={searchQuery} />
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  ไม่พบเมนูที่ค้นหา
                </p>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border px-2 py-3">
        <NavUser />
        <div className="border-t border-sidebar-border/60 pt-2">
          <NavFooter items={footerNavItems} className="justify-center gap-3" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
