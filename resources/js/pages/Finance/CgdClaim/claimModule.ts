export type ClaimModuleMeta = {
    key: string;
    title: string;
    short: string;
    has_stm: boolean;
    primary_source: 'stm' | 'rep' | string;
    pttype_like: string;
    rep_prefix: string;
    stm_prefix: string | null;
    maininscl: string;
    labels: {
        source: string;
        source_all: string;
        compare_tab: string;
        data_tab: string;
        only_source: string;
        import_rep: string;
    };
    routes: {
        dashboard: string;
        import: string;
        import_store: string;
        summary: string;
        reconcile_all: string;
        compare: string;
        nhso_start: string;
        nhso_otp: string;
        nhso_download: string;
        nhso_clear: string;
        show: string;
        precheck?: string;
    };
};

const CGD_FALLBACK: ClaimModuleMeta = {
    key: 'cgd',
    title: 'ตรวจเบิกจ่ายตรง กรมบัญชีกลาง',
    short: 'จ่ายตรง',
    has_stm: true,
    primary_source: 'stm',
    pttype_like: '12%',
    rep_prefix: 'rep_eclaim_14689_OPCS',
    stm_prefix: 'STM_14689_OP',
    maininscl: 'ofc',
    labels: {
        source: 'STM',
        source_all: 'STM',
        compare_tab: 'เปรียบเทียบ STM–HOSxP',
        data_tab: 'ข้อมูลตาม STM',
        only_source: 'มีเฉพาะ STM',
        import_rep: 'นำเข้าไฟล์ e-Claim / REP',
    },
    routes: {
        dashboard: 'finance.cgd.dashboard',
        import: 'finance.cgd.import',
        import_store: 'finance.cgd.import.store',
        summary: 'finance.cgd.summary',
        reconcile_all: 'finance.cgd.reconcile-all',
        compare: 'finance.cgd.stm.compare',
        nhso_start: 'finance.cgd.nhso.start',
        nhso_otp: 'finance.cgd.nhso.otp',
        nhso_download: 'finance.cgd.nhso.download',
        nhso_clear: 'finance.cgd.nhso.clear',
        show: 'finance.cgd.show',
        precheck: 'finance.cgd.precheck',
    },
};

export function resolveClaimModule(module?: ClaimModuleMeta | null): ClaimModuleMeta {
    return module?.key ? { ...CGD_FALLBACK, ...module, labels: { ...CGD_FALLBACK.labels, ...module.labels }, routes: { ...CGD_FALLBACK.routes, ...module.routes } } : CGD_FALLBACK;
}

/** Ziggy route helper ผูกกับ module */
export function claimRoute(
    module: ClaimModuleMeta | null | undefined,
    name: keyof ClaimModuleMeta['routes'] | 'destroy' | 'reconcile' | 'export' | 'export_pdf' | 'summary_export' | 'summary_export_pdf' | 'appeal_mark' | 'stm_index' | 'stm_reconcile' | 'compare_export' | 'compare_export_pdf' | 'precheck',
    params?: unknown,
): string {
    const m = resolveClaimModule(module);
    const prefix = m.key === 'lgo' ? 'finance.lgo.' : 'finance.cgd.';

    const map: Record<string, string> = {
        ...m.routes,
        destroy: `${prefix}destroy`,
        reconcile: `${prefix}reconcile`,
        export: `${prefix}export`,
        export_pdf: `${prefix}export-pdf`,
        summary_export: `${prefix}summary.export`,
        summary_export_pdf: `${prefix}summary.export-pdf`,
        appeal_mark: `${prefix}appeal-cases.mark-submitted`,
        stm_index: 'finance.cgd.stm.index',
        stm_reconcile: 'finance.cgd.stm.reconcile',
        compare_export: 'finance.cgd.stm.compare.export',
        compare_export_pdf: 'finance.cgd.stm.compare.export-pdf',
        precheck: `${prefix}precheck`,
    };

    const routeName = map[name] || m.routes.dashboard;
    // @ts-expect-error ziggy global
    return params !== undefined && params !== null ? route(routeName, params) : route(routeName);
}
