import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { usePage, Link } from '@inertiajs/react';
import AppLogo from './app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { iconMapper } from '@/lib/iconMapper';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface MenuItem {
  id: number;
  title: string;
  route: string | null;
  icon: string;
  children?: MenuItem[];
}

function RenderMenu({ items, level = 0 }: { items: MenuItem[]; level?: number }) {
  const { url: currentUrl } = usePage();
  const { t } = useTranslation();

  if (!Array.isArray(items)) return null;

  return (
    <>
      {items.map((menu) => {
        if (!menu) return null;
        const Icon = iconMapper(menu.icon || 'Folder') as LucideIcon;
        const children = Array.isArray(menu.children) ? menu.children.filter(Boolean) : [];
        const hasChildren = children.length > 0;
        const isActive = menu.route && currentUrl.startsWith(menu.route);
        const indentClass = level > 0 ? `pl-${4 + level * 3}` : '';
        
        const activeClass = isActive
          ? 'bg-primary/10 text-primary font-semibold shadow-sm translate-x-1'
          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-1';

        if (!menu.route && !hasChildren) return null;

        // Check if any child is active to set defaultOpen
        const isChildActive = (items: MenuItem[]): boolean => {
            return items.some(item => {
                if (item.route && currentUrl.startsWith(item.route)) return true;
                if (item.children) return isChildActive(item.children);
                return false;
            });
        };
        const isExpanded = hasChildren && isChildActive(children);

        const isExternal = menu.route && (menu.route.startsWith('http://') || menu.route.startsWith('https://'));

        return (
          <Collapsible key={menu.id} asChild defaultOpen={isExpanded} className="group/collapsible">
            <SidebarMenuItem>
              {hasChildren ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      className={cn(
                        `group flex items-center justify-between rounded-md transition-all duration-200 ease-in-out ${indentClass}`,
                        activeClass,
                        level === 0 ? 'py-3 px-4 my-1' : 'py-2 px-3',
                        'h-auto'
                      )}
                    >
                      <div className="flex items-center flex-1">
                        <Icon className="size-4 mr-3 opacity-80 group-hover:opacity-100 shrink-0" />
                        <span className="whitespace-normal leading-tight">{t(menu.title)}</span>
                      </div>
                      <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 shrink-0 ml-2" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-2 border-l-2 border-primary/20 pl-2 my-1">
                      <RenderMenu items={children} level={level + 1} />
                    </SidebarMenu>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton 
                  asChild 
                  className={cn(
                    `group flex items-center rounded-md transition-all duration-200 ease-in-out ${indentClass}`,
                    activeClass,
                    level === 0 ? 'py-3 px-4 my-1' : 'py-2 px-3',
                    'h-auto'
                  )}
                >
                  {isExternal ? (
                    <a href={menu.route || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                      <Icon className="size-4 mr-3 opacity-80 group-hover:opacity-100 shrink-0" />
                      <span className="whitespace-normal leading-tight flex-1">{t(menu.title)}</span>
                      {level > 0 && (
                        <ChevronRight className="ml-2 size-4 opacity-0 group-hover:opacity-50 shrink-0" />
                      )}
                    </a>
                  ) : (
                    <Link href={menu.route || '#'} className="flex items-center w-full">
                      <Icon className="size-4 mr-3 opacity-80 group-hover:opacity-100 shrink-0" />
                      <span className="whitespace-normal leading-tight flex-1">{t(menu.title)}</span>
                      {level > 0 && (
                        <ChevronRight className="ml-2 size-4 opacity-0 group-hover:opacity-50 shrink-0" />
                      )}
                    </Link>
                  )}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </Collapsible>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const { menus = [] } = usePage().props as { menus?: MenuItem[] };

  const footerNavItems = [
    {
      title: 'Hospital Website',
      url: 'https://surasinghanart-hos.com/',
      icon: iconMapper('Star') as LucideIcon,
    },
    {
      title: 'Facebook Page',
      url: 'https://www.facebook.com/fortsurasinghanathos/',
      icon: iconMapper('Facebook') as LucideIcon,
    },
    {
      title: 'Youtube',
      url: 'https://www.youtube.com/watch?v=OTb5icfE96s',
      icon: iconMapper('Heart') as LucideIcon,
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="inset" className="border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarHeader className="px-4 py-4 border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto py-1 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent">
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          <RenderMenu items={menus} />
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 border-t">
        <NavUser  />
        <NavFooter items={footerNavItems} className="justify-center gap-4" />
      </SidebarFooter>
    </Sidebar>
  );
}