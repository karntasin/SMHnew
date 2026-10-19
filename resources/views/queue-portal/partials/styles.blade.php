<style>
    :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #dbe3ee;
        --card: #ffffff;
        --bg: #eef4f3;
        --teal: #0f766e;
        --teal-dark: #115e59;
        --call: #b45309;
        --call-bg: #fff7ed;
        --ok: #047857;
        --wait: #64748b;
    }
    * { box-sizing: border-box; }
    body {
        margin: 0;
        font-family: "Leelawadee UI", "Segoe UI", Tahoma, sans-serif;
        background: var(--bg);
        color: var(--ink);
    }
    .wrap { max-width: 32rem; margin: 0 auto; padding: 1.25rem 1rem 2.5rem; }
    .eyebrow { margin: 0; color: var(--teal); font-weight: 700; letter-spacing: 0.02em; }
    h1 { margin: 0.35rem 0 0.5rem; font-size: 1.7rem; line-height: 1.3; }
    h2 { margin: 0 0 0.75rem; font-size: 1.05rem; }
    .lead, .hint { color: var(--muted); line-height: 1.5; }
    .queue-label { margin: 1rem 0 0; color: var(--muted); }
    .queue-number { margin: 0; font-size: 4.5rem; line-height: 1; font-weight: 800; letter-spacing: -0.04em; }
    .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 1rem;
        padding: 1rem;
        margin-top: 1rem;
    }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .stat-label { margin: 0; color: var(--muted); font-size: 0.85rem; }
    .stat-value { margin: 0.2rem 0 0; font-size: 2.6rem; font-weight: 800; line-height: 1; }
    .stat-room { margin: 0.35rem 0 0; font-size: 1.25rem; font-weight: 700; line-height: 1.3; }
    .banner { border-radius: 0.9rem; padding: 0.85rem 1rem; font-weight: 700; line-height: 1.4; }
    .banner-contact { background: #ecfdf5; color: #115e59; margin-top: 1rem; }
    .banner-warn { background: #fef2f2; color: #991b1b; margin-top: 1rem; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.65rem; }
    .step { display: flex; justify-content: space-between; gap: 0.75rem; padding-top: 0.65rem; border-top: 1px solid var(--line); }
    .step:first-child { border-top: 0; padding-top: 0; }
    .step strong { display: block; }
    .step span { color: var(--muted); text-align: right; }
    .step-done strong { color: var(--ok); }
    .step-current strong { color: var(--teal-dark); }
    .step-pending strong { color: var(--call); }
    .step-skipped { opacity: 0.55; }
    .pharmacy p { margin: 0; font-size: 1.35rem; font-weight: 800; }
    label { display: block; font-weight: 700; margin-bottom: 0.4rem; }
    input {
        width: 100%;
        font: inherit;
        font-size: 1.6rem;
        padding: 0.7rem 0.8rem;
        border-radius: 0.8rem;
        border: 1px solid var(--line);
    }
    button {
        width: 100%;
        margin-top: 0.8rem;
        border: 0;
        border-radius: 0.8rem;
        background: var(--teal);
        color: white;
        font: inherit;
        font-weight: 700;
        padding: 0.85rem 1rem;
    }
    button:disabled { opacity: 0.5; }
    .staff { margin-top: 1.5rem; color: var(--muted); }
    .staff p, .staff pre { line-height: 1.5; }
    .staff pre {
        white-space: pre-wrap;
        background: white;
        border-radius: 0.7rem;
        padding: 0.7rem;
        color: var(--ink);
    }
    .ios-steps { margin: 0.75rem 0 0; padding-left: 1.25rem; display: grid; gap: 0.55rem; }
    .ios-steps li { line-height: 1.45; }
    .back { margin-top: 1.25rem; }
    .back a { color: var(--teal-dark); font-weight: 700; }
    [hidden] { display: none !important; }
</style>
