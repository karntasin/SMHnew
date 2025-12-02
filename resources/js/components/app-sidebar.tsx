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
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { usePage, Link } from '@inertiajs/react';
import AppLogo from './app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { iconMapper } from '@/lib/iconMapper';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Sparkles, ExternalLink, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
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
      {items.map((menu, index) => {
        if (!menu) return null;
        const Icon = iconMapper(menu.icon || 'Folder') as LucideIcon;
        const children = Array.isArray(menu.children) ? menu.children.filter(Boolean) : [];
        const hasChildren = children.length > 0;
        const isActive = menu.route && currentUrl.startsWith(menu.route);
        
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

        // Animation delay for staggered entrance
        const animationDelay = `${index * 50}ms`;

        return (
          <Collapsible key={menu.id} asChild defaultOpen={isExpanded} className="group/collapsible">
            <SidebarMenuItem
              className="animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay }}
            >
              {hasChildren ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      className={cn(
                        "group relative flex items-center justify-between rounded-xl transition-all duration-300 ease-out",
                        "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
                        level === 0 ? "py-3 px-4 my-0.5" : "py-2.5 px-3 ml-2",
                        isExpanded && "bg-primary/5 text-primary font-medium",
                        "h-auto"
                      )}
                    >
                      <div className="flex items-center flex-1 gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300",
                          isExpanded 
                            ? "bg-primary/15 text-primary shadow-sm" 
                            : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <Icon className="size-[18px]" />
                        </div>
                        <span className="text-sm font-medium whitespace-normal leading-tight">{t(menu.title)}</span>
                      </div>
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-md transition-all duration-300",
                        "group-hover:bg-primary/10"
                      )}>
                        <ChevronRight className={cn(
                          "size-4 text-muted-foreground transition-transform duration-300",
                          "group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary"
                        )} />
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
                    <div className="relative ml-6 mt-1 mb-2">
                      {/* Gradient line indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
                      <SidebarMenu className="pl-4 space-y-0.5">
                        <RenderMenu items={children} level={level + 1} />
                      </SidebarMenu>
                    </div>
                  </CollapsibleContent>
                </>
              ) : (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        className={cn(
                          "group relative flex items-center rounded-xl transition-all duration-300 ease-out overflow-hidden",
                          level === 0 ? "py-3 px-4 my-0.5" : "py-2.5 px-3",
                          isActive 
                            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-sm" 
                            : "text-muted-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:text-foreground",
                          "h-auto"
                        )}
                      >
                        {isExternal ? (
                          <a href={menu.route || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center w-full gap-3">
                            {/* Active indicator */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary shadow-lg shadow-primary/30" />
                            )}
                            <div className={cn(
                              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300",
                              isActive 
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                                : level === 0 
                                  ? "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                  : "text-muted-foreground group-hover:text-primary"
                            )}>
                              {level === 0 ? (
                                <Icon className="size-[18px]" />
                              ) : (
                                <Circle className={cn(
                                  "size-2 transition-all duration-300",
                                  isActive ? "fill-primary text-primary" : "fill-muted-foreground/30 group-hover:fill-primary/50"
                                )} />
                              )}
                            </div>
                            <span className="text-sm font-medium whitespace-normal leading-tight flex-1">{t(menu.title)}</span>
                            <ExternalLink className="size-3.5 opacity-40 group-hover:opacity-70" />
                          </a>
                        ) : (
                          <Link href={menu.route || '#'} className="flex items-center w-full gap-3">
                            {/* Active indicator */}
                            {isActive && level === 0 && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary shadow-lg shadow-primary/30" />
                            )}
                            <div className={cn(
                              "flex items-center justify-center transition-all duration-300",
                              level === 0 ? "w-9 h-9 rounded-lg" : "w-6 h-6",
                              isActive 
                                ? level === 0 
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                                  : "text-primary"
                                : level === 0 
                                  ? "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                  : "text-muted-foreground group-hover:text-primary"
                            )}>
                              {level === 0 ? (
                                <Icon className="size-[18px]" />
                              ) : (
                                <Circle className={cn(
                                  "size-1.5 transition-all duration-300",
                                  isActive ? "fill-primary text-primary scale-150" : "fill-muted-foreground/40 group-hover:fill-primary/60"
                                )} />
                              )}
                            </div>
                            <span className={cn(
                              "text-sm whitespace-normal leading-tight flex-1",
                              isActive ? "font-semibold" : "font-medium"
                            )}>{t(menu.title)}</span>
                            {isActive && (
                              <Sparkles className="size-3.5 text-primary animate-pulse" />
                            )}
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {t(menu.title)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
    <Sidebar 
      collapsible="icon" 
      variant="inset" 
      className={cn(
        "border-r border-border/40",
        "bg-gradient-to-b from-background via-background to-muted/20",
        "backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      )}
    >
      {/* Header with Logo */}
      <SidebarHeader className="px-4 py-5 border-b border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              asChild 
              className="h-auto py-1 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
            >
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-3 py-4">
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              เมนูหลัก
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              <RenderMenu items={menus} />
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Footer with User & Links */}
      <SidebarFooter className="px-3 py-4 border-t border-border/40 space-y-3">
        <NavUser />
        <div className="pt-2 border-t border-border/30">
          <NavFooter items={footerNavItems} className="justify-center gap-3" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}