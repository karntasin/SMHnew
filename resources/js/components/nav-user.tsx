import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronsUpDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavUser() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton 
                            size="lg" 
                            className={cn(
                                "group relative rounded-xl transition-all duration-300",
                                "bg-gradient-to-r from-muted/50 to-muted/30",
                                "hover:from-primary/10 hover:to-primary/5",
                                "data-[state=open]:from-primary/15 data-[state=open]:to-primary/5",
                                "border border-border/40 hover:border-primary/20",
                                "shadow-sm hover:shadow-md"
                            )}
                        >
                            <UserInfo user={auth.user} />
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
                                "bg-background/50 group-hover:bg-primary/10",
                                "group-data-[state=open]:bg-primary/10"
                            )}>
                                <ChevronsUpDown className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl shadow-lg border-border/50"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
