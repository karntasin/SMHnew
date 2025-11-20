import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export function LanguageSwitcher() {
    const { locale } = usePage().props as any;
    const { t } = useTranslation();

    const switchLanguage = (newLocale: string) => {
        router.post(route('locale.update'), { locale: newLocale }, {
            preserveScroll: true,
            onSuccess: () => {
                window.location.reload();
            },
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">{t('Language')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLanguage('en')} className={locale === 'en' ? 'bg-accent' : ''}>
                    🇺🇸 {t('English')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLanguage('th')} className={locale === 'th' ? 'bg-accent' : ''}>
                    🇹🇭 {t('Thai')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
