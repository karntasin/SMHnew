import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { iconMapper } from '@/lib/iconMapper';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Folder,
  GripVertical,
  LayoutGrid,
  RotateCcw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuItem {
  id: number;
  title: string;
  route: string | null;
  icon: string;
  children?: MenuItem[];
}

type AppCard = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string;
  icon: string;
  toneIndex: number;
  external: boolean;
};

type HubLayout = {
  order: string[];
  collapsed: string[];
  tones: Record<string, number>;
};

const EMPTY_LAYOUT: HubLayout = { order: [], collapsed: [], tones: {} };

const ICON_TONES = [
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
  { bg: 'bg-slate-100', text: 'text-slate-700' },
];

function isCardKey(value: string): boolean {
  return /^(child|root)-\d+$/.test(value);
}

function readLayout(raw: Partial<HubLayout> | null | undefined): HubLayout {
  const order = Array.isArray(raw?.order) ? raw.order.filter((id) => typeof id === 'string' && isCardKey(id)) : [];
  const collapsed = Array.isArray(raw?.collapsed)
    ? raw.collapsed.filter((id) => typeof id === 'string' && isCardKey(id))
    : [];
  const tones: Record<string, number> = {};
  const source = raw?.tones;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [key, tone] of Object.entries(source)) {
      const index = Number(tone);
      if (!isCardKey(key) || !Number.isInteger(index) || index < 0 || index >= ICON_TONES.length) continue;
      tones[key] = index;
    }
  }
  return { order, collapsed, tones };
}

function isExternalHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.includes('/admin/tv') ||
    href.includes('/admin/er') ||
    href.includes('/admin/drug') ||
    href.startsWith('/tv') ||
    href.startsWith('/er') ||
    href.startsWith('/drug')
  );
}

function firstHref(item: MenuItem): string | null {
  if (item.route) return item.route;
  for (const child of item.children ?? []) {
    const href = firstHref(child);
    if (href) return href;
  }
  return null;
}

function resolveToneIndex(title: string, category: string, fallback: number): number {
  const t = `${title} ${category}`.toLowerCase();
  if (t.includes('แดชบอร์ด') || t.includes('dashboard')) return 0;
  if (t.includes('คุณภาพ') || t.includes('ตัวชี้วัด') || t.includes('mra') || t.includes('quality')) return 1;
  if (t.includes('ธุรการ') || t.includes('จอง') || t.includes('แจ้งซ่อม')) return 2;
  if (t.includes('เภสัช') || t.includes('คลังยา') || t.includes('ยา') || t.includes('rdu')) return 3;
  if (t.includes('ติดเชื้อ') || t.includes('ic') || t.includes('อุบัติการณ์')) return 4;
  if (t.includes('สิ่งแวดล้อม') || t.includes('env') || t.includes('km') || t.includes('hrd')) return 5;
  if (t.includes('การเงิน') || t.includes('รายได้') || t.includes('finance') || t.includes('สิทธิ')) return 6;
  if (t.includes('hosxp') || t.includes('รายงาน')) return 7;
  if (t.includes('รถ') || t.includes('vehicle')) return 8;
  if (t.includes('im') || t.includes('สารสนเทศ')) return 9;
  if (t.includes('คิว') || t.includes('monitor') || t.includes('เซิร์ฟเวอร์')) return 11;
  if (t.includes('ตั้งค่า') || t.includes('settings')) return 11;
  return fallback % ICON_TONES.length;
}

function buildAppCards(roots: MenuItem[]): AppCard[] {
  const cards: AppCard[] = [];
  let seq = 0;

  for (const root of roots) {
    const children = (root.children ?? []).filter(Boolean);

    if (children.length === 0) {
      if (!root.route) continue;
      cards.push({
        id: `root-${root.id}`,
        title: root.title,
        subtitle: root.title,
        category: root.title,
        href: root.route,
        icon: root.icon,
        toneIndex: resolveToneIndex(root.title, root.title, seq++),
        external: isExternalHref(root.route),
      });
      continue;
    }

    for (const child of children) {
      const href = firstHref(child);
      if (!href) continue;

      const grand = (child.children ?? []).filter((g) => g?.route);
      const subtitle =
        grand.length > 0
          ? grand
              .slice(0, 2)
              .map((g) => g.title)
              .join(' · ')
          : child.title;

      cards.push({
        id: `child-${child.id}`,
        title: child.title,
        subtitle,
        category: root.title,
        href,
        icon: child.icon || root.icon,
        toneIndex: resolveToneIndex(child.title, root.title, seq++),
        external: isExternalHref(href),
      });
    }
  }

  return cards;
}

function orderCards(cards: AppCard[], order: string[]): AppCard[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const next: AppCard[] = [];

  for (const id of order) {
    const card = byId.get(id);
    if (!card || seen.has(id)) continue;
    next.push(card);
    seen.add(id);
  }

  for (const card of cards) {
    if (!seen.has(card.id)) next.push(card);
  }

  return next;
}

function reorderVisible(base: string[], visibleIds: string[], nextVisible: string[]): string[] {
  const queue = [...nextVisible];
  const visibleSet = new Set(visibleIds);
  return base.map((id) => (visibleSet.has(id) ? (queue.shift() ?? id) : id));
}

function mergeOrder(currentIds: string[], preferred: string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();

  for (const id of preferred) {
    if (!isCardKey(id) || seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }

  for (const id of currentIds) {
    if (seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }

  return next;
}

function MenuIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = iconMapper(name || 'Folder') as LucideIcon;
  return <Icon className={className} />;
}

function AppCardLink({
  card,
  children,
  className,
}: {
  card: AppCard;
  children: React.ReactNode;
  className?: string;
}) {
  if (card.external) {
    return (
      <a href={card.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={card.href} className={className}>
      {children}
    </Link>
  );
}

function TonePicker({
  toneIndex,
  icon,
  onTone,
}: {
  toneIndex: number;
  icon: string;
  onTone: (toneIndex: number) => void;
}) {
  const tone = ICON_TONES[toneIndex % ICON_TONES.length];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex size-10 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105',
            tone.bg,
            tone.text,
          )}
          aria-label="เปลี่ยนสีหัวการ์ด"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MenuIcon name={icon} className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">สีหัวการ์ด</p>
        <div className="grid grid-cols-6 gap-1.5">
          {ICON_TONES.map((item, index) => (
            <button
              key={item.bg}
              type="button"
              className={cn(
                'size-7 rounded-lg ring-offset-2',
                item.bg,
                index === toneIndex && 'ring-2 ring-slate-900',
              )}
              aria-label={`สีที่ ${index + 1}`}
              aria-pressed={index === toneIndex}
              onClick={() => onTone(index)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HubCardBody({
  card,
  toneIndex,
  folded,
  isDragging,
  setNodeRef,
  style,
  headerActions,
  onToggleFold,
  onTone,
}: {
  card: AppCard;
  toneIndex: number;
  folded: boolean;
  isDragging?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  headerActions?: React.ReactNode;
  onToggleFold: () => void;
  onTone: (toneIndex: number) => void;
}) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex min-h-[148px] flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        'transition-shadow duration-200 hover:border-primary/20 hover:shadow-md',
        isDragging && 'z-20 opacity-80 shadow-lg',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <TonePicker toneIndex={toneIndex} icon={card.icon} onTone={onTone} />
        <div className="flex items-center gap-1">
          {headerActions}
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={folded ? 'คลี่การ์ด' : 'พับการ์ด'}
            onClick={onToggleFold}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {folded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      <AppCardLink card={card} className="flex min-h-0 flex-1 flex-col">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
          {card.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{card.subtitle}</p>
        {folded && (
          <span className="mt-2 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            พับไว้
          </span>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
            <Folder className="size-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{card.category}</span>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </AppCardLink>
    </div>
  );
}

function SortableHubCard(props: {
  card: AppCard;
  toneIndex: number;
  sortable: boolean;
  folded: boolean;
  onToggleFold: () => void;
  onTone: (toneIndex: number) => void;
}) {
  const { card, toneIndex, sortable, folded, onToggleFold, onTone } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !sortable,
  });

  return (
    <HubCardBody
      card={card}
      toneIndex={toneIndex}
      folded={folded}
      onToggleFold={onToggleFold}
      onTone={onTone}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      headerActions={
        props.sortable ? (
          <button
            type="button"
            className="flex size-8 cursor-grab touch-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
            aria-label="ลากเพื่อจัดเรียง"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null
      }
    />
  );
}

function FoldedChip({
  card,
  toneIndex,
  onUnfold,
}: {
  card: AppCard;
  toneIndex: number;
  onUnfold: () => void;
}) {
  const tone = ICON_TONES[toneIndex % ICON_TONES.length];

  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1">
      <button
        type="button"
        onClick={onUnfold}
        className="inline-flex min-w-0 items-center gap-2 rounded-full py-0.5 pr-1 pl-0.5 text-left hover:bg-slate-50"
        aria-label={`คลี่การ์ด ${card.title}`}
      >
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', tone.bg, tone.text)}>
          <MenuIcon name={card.icon} className="size-3.5" />
        </span>
        <span className="max-w-[11rem] truncate text-sm font-medium text-slate-700">{card.title}</span>
        <ChevronUp className="size-3.5 shrink-0 text-slate-400" />
      </button>
      <AppCardLink
        card={card}
        className="rounded-full px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-primary"
      >
        เปิด
      </AppCardLink>
    </div>
  );
}

export default function MenusHubIndex({ hubLayout }: { hubLayout?: HubLayout }) {
  const { menus = [] } = usePage().props as { menus?: MenuItem[] };
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<HubLayout>(() => readLayout(hubLayout));
  const layoutRef = useRef(layout);
  const saveTimer = useRef<number | null>(null);
  const pendingLayout = useRef<HubLayout | null>(null);
  const saveGeneration = useRef(0);
  layoutRef.current = layout;

  const cards = useMemo(() => buildAppCards(menus), [menus]);
  const ordered = useMemo(() => orderCards(cards, layout.order), [cards, layout.order]);
  const collapsedSet = useMemo(() => new Set(layout.collapsed), [layout.collapsed]);
  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (card) =>
        card.title.toLowerCase().includes(q) ||
        card.subtitle.toLowerCase().includes(q) ||
        card.category.toLowerCase().includes(q),
    );
  }, [ordered, query]);

  const visible = searching ? filtered : filtered.filter((card) => !collapsedSet.has(card.id));
  const folded = searching ? [] : ordered.filter((card) => collapsedSet.has(card.id));
  const customized =
    layout.order.length > 0 || layout.collapsed.length > 0 || Object.keys(layout.tones).length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = (recipe: (current: HubLayout) => HubLayout) => {
    const next = recipe(layoutRef.current);
    const clean: HubLayout = {
      order: next.order.length > 0 ? mergeOrder(cards.map((card) => card.id), next.order) : [],
      collapsed: next.collapsed.filter(isCardKey),
      tones: readLayout({ tones: next.tones }).tones,
    };
    layoutRef.current = clean;
    setLayout(clean);
    pendingLayout.current = clean;
    const generation = ++saveGeneration.current;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (generation !== saveGeneration.current) return;
      pendingLayout.current = null;
      router.put(route('menus.hub.layout.update'), clean, {
        preserveScroll: true,
        preserveState: true,
        onError: () => toast.error('บันทึกการจัดเรียงไม่สำเร็จ'),
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (pendingLayout.current) {
        router.put(route('menus.hub.layout.update'), pendingLayout.current, {
          preserveScroll: true,
          preserveState: true,
        });
      }
    };
  }, []);

  const toggleFold = (id: string, collapse: boolean) => {
    persist((current) => ({
      ...current,
      collapsed: collapse
        ? [...current.collapsed.filter((item) => item !== id), id]
        : current.collapsed.filter((item) => item !== id),
    }));
  };

  const setTone = (id: string, toneIndex: number) => {
    persist((current) => ({ ...current, tones: { ...current.tones, [id]: toneIndex } }));
  };

  const resetLayout = () => {
    saveGeneration.current += 1;
    pendingLayout.current = null;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    layoutRef.current = EMPTY_LAYOUT;
    setLayout(EMPTY_LAYOUT);
    router.delete(route('menus.hub.layout.reset'), {
      preserveScroll: true,
      preserveState: true,
      onError: () => toast.error('คืนค่าเริ่มต้นไม่สำเร็จ'),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (searching) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = visible.map((card) => card.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const nextVisible = arrayMove(ids, oldIndex, newIndex);
    const cardIds = cards.map((card) => card.id);
    persist((current) => {
      const base = current.order.length > 0 ? mergeOrder(cardIds, current.order) : cardIds;
      return { ...current, order: reorderVisible(base, ids, nextVisible) };
    });
  };

  const toneFor = (card: AppCard) => layout.tones[card.id] ?? card.toneIndex;

  return (
    <AppLayout breadcrumbs={[{ title: 'HUB Menu', href: '/menus-hub' }]}>
      <Head title="HUB Menu" />

      <div className="min-h-[calc(100vh-4rem)] bg-[#f4f5f7]">
        <div className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutGrid className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">HUB Menu</h1>
                <p className="hidden text-xs text-slate-500 sm:block">จัดเรียง พับ และเปลี่ยนสีได้เฉพาะคุณ</p>
              </div>
            </div>

            <div className="relative order-3 w-full sm:order-none sm:mx-auto sm:max-w-md sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาแอป..."
                className="h-10 rounded-full border-slate-200 bg-slate-50 pl-10 pr-10 text-sm shadow-none focus-visible:bg-white focus-visible:ring-primary/25"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
                  aria-label="ล้างการค้นหา"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Link
              href="/settings-hub"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-primary"
            >
              <Settings className="size-3.5" />
              ตั้งค่า
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {searching ? 'ผลการค้นหา' : 'แอปพลิเคชันทั้งหมด'}
              </p>
              <p className="text-xs text-slate-400">
                {searching
                  ? `${filtered.length} รายการ`
                  : `${visible.length} รายการ${folded.length > 0 ? ` · พับไว้ ${folded.length}` : ''}`}
              </p>
            </div>
            <button
              type="button"
              onClick={resetLayout}
              disabled={!customized}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
              คืนค่าเริ่มต้น
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
              {searching
                ? 'ไม่พบแอปที่ตรงกับการค้นหา'
                : folded.length > 0
                  ? 'การ์ดที่เปิดอยู่ไม่มีแล้ว คลี่จากถาดด้านล่างได้'
                  : 'ไม่พบแอปที่คุณมีสิทธิ์ใช้งาน'}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible.map((card) => card.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {visible.map((card) => (
                    <SortableHubCard
                      key={card.id}
                      card={card}
                      toneIndex={toneFor(card)}
                      sortable={!searching}
                      folded={collapsedSet.has(card.id)}
                      onToggleFold={() => toggleFold(card.id, !collapsedSet.has(card.id))}
                      onTone={(toneIndex) => setTone(card.id, toneIndex)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {!searching && folded.length > 0 && (
            <section className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-700">การ์ดที่พับไว้</h2>
                <p className="text-xs text-slate-400">กดชื่อเพื่อคลี่กลับ หรือกดเปิดถ้าต้องการเข้าแอปโดยยังพับไว้</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {folded.map((card) => (
                  <FoldedChip
                    key={card.id}
                    card={card}
                    toneIndex={toneFor(card)}
                    onUnfold={() => toggleFold(card.id, false)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
