import { Icon } from '@/components/icon';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type NavItem } from '@/types';
import { cn } from '@/lib/utils';

export function NavFooter({
    items,
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
}) {
    return (
        <SidebarGroup {...props} className={cn("group-data-[collapsible=icon]:p-0", className)}>
            <SidebarGroupContent>
                <SidebarMenu className="flex-row items-center justify-center gap-1">
                    <TooltipProvider delayDuration={0}>
                        {items.map((item) => (
                            <SidebarMenuItem key={item.title} className="w-auto">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarMenuButton
                                            asChild
                                            className={cn(
                                                "w-9 h-9 p-0 rounded-lg transition-all duration-300",
                                                "bg-muted/30 hover:bg-primary/10",
                                                "text-muted-foreground hover:text-primary",
                                                "hover:scale-110 hover:shadow-md"
                                            )}
                                        >
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                                {item.icon && <Icon iconNode={item.icon} className="h-4 w-4" />}
                                            </a>
                                        </SidebarMenuButton>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-medium">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            </SidebarMenuItem>
                        ))}
                    </TooltipProvider>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
