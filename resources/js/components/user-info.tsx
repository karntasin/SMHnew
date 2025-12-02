import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { cn } from '@/lib/utils';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();

    return (
        <>
            <div className="relative">
                <Avatar className="h-10 w-10 overflow-hidden rounded-xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-primary/40">
                    <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            </div>
            <div className="grid flex-1 text-left leading-tight ml-1">
                <span className="truncate font-semibold text-sm">{user.name}</span>
                {showEmail ? (
                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                ) : (
                    <span className="text-muted-foreground truncate text-xs">ออนไลน์</span>
                )}
            </div>
        </>
    );
}
