import { ChartData, LeaderboardEntry } from './processData';
import { COLORS, resolveCategoryLabel, CATEGORY_LIST } from '@/config/dashboardConfig';
import { Issue } from '@/types/dashboard';

const DEVIATION_THRESHOLD = 50;

type RiskReason = 'no_description' | 'no_dates' | 'high_deviation' | 'no_estimate' | 'no_label' | 'no_epic';

const REASON_LABELS: Record<RiskReason, string> = {
    no_label:       'Kein Label',
    no_epic:        'Kein Epic',
    no_estimate:    'Keine Schätzung',
    no_description: 'Keine Beschreibung',
    no_dates:       'Kein Datum',
    high_deviation: 'Hohe Abweichung',
};

const REASON_COLORS: Record<RiskReason, string> = {
    no_label:       '#ec4899',
    no_epic:        '#14b8a6',
    no_estimate:    '#0ea5e9',
    no_description: '#f59e0b',
    no_dates:       '#f97316',
    high_deviation: '#ef4444',
};

function detectRiskyIssues(issues: Issue[]): Array<{ issue: Issue; reasons: RiskReason[] }> {
    return issues
        .filter(i => i.state === 'opened')
        .map(issue => {
            const reasons: RiskReason[] = [];
            const noLabel = !issue.labels.nodes.some(l => resolveCategoryLabel(l.title) !== null);
            const noEpic  = !issue.epic;
            const noEst   = (issue.timeEstimate ?? 0) === 0;
            const noDesc  = !issue.description || issue.description.trim().length < 10;
            const noDates = !issue.startDate && !issue.dueDate;
            const est = issue.timeEstimate ?? 0;
            const spent = issue.totalTimeSpent ?? 0;
            const deviation = est > 0 ? ((spent - est) / est) * 100 : null;
            const highDev = deviation !== null && Math.abs(deviation) > DEVIATION_THRESHOLD;
            if (noLabel) reasons.push('no_label');
            if (noEpic)  reasons.push('no_epic');
            if (noEst)   reasons.push('no_estimate');
            if (noDesc)  reasons.push('no_description');
            if (noDates) reasons.push('no_dates');
            if (highDev) reasons.push('high_deviation');
            return { issue, reasons };
        })
        .filter(r => r.reasons.length > 0);
}

function computeRiskScore(
    riskyIssues: Array<{ reasons: RiskReason[] }>,
    totalOpenIssues: number,
    leaderboard: LeaderboardEntry[],
    userCategoryMatrix: ChartData['userCategoryMatrix'],
): { score: number; issueScore: number; personScore: number; categoryScore: number } {
    const issueScore = totalOpenIssues === 0 ? 0
        : Math.min(100, Math.round(riskyIssues.length / totalOpenIssues * 100));

    const teamSize = leaderboard.length;
    const fairShare = teamSize > 0 ? 100 / teamSize : 100;
    const topShare = Math.max(...leaderboard.map(p => p.percentage), 0);
    const maxDeviation = 100 - fairShare;
    const personScore = maxDeviation <= 0 ? 0
        : Math.min(100, Math.round(Math.max(0, topShare - fairShare) / maxDeviation * 100));

    const categories = CATEGORY_LIST;
    const soloCats = categories.filter(cat => {
        const contributors = userCategoryMatrix.filter(r => (r[cat] as number ?? 0) > 0);
        return contributors.length === 1;
    });
    const categoryScore = categories.length === 0 ? 0
        : Math.round(soloCats.length / categories.length * 100);

    const score = Math.min(100, Math.round(issueScore * 0.4 + personScore * 0.35 + categoryScore * 0.25));
    return { score, issueScore, personScore, categoryScore };
}

function esc(s: string | number): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function bar(pct: number, color: string): string {
    const w = Math.max(0, Math.min(100, pct));
    return `<div style="background:#e5e5e5;border-radius:4px;height:8px;width:100%;min-width:60px"><div style="background:${color};border-radius:4px;height:8px;width:${w}%"></div></div>`;
}

const CAT_COLORS: Record<string, string> = {
    'Projektmanagement':       '#ed9121',
    'Requirements Engineering': '#009966',
    'Implementierung':          '#6699cc',
    'Architektur & Design':     '#9400d3',
};
function catColor(name: string): string {
    return CAT_COLORS[name] ?? '#94a3b8';
}

export function generateReport(data: ChartData, dateRange: { from: string; to: string }): string {
    const now = new Date().toLocaleString('de-DE');
    const {
        leaderboard, pieData, projectMetrics,
        personDetails, productivityPatterns, cfdData,
        issues, userCategoryMatrix,
    } = data;

    const totalHours   = leaderboard.reduce((s, e) => s + e.hours, 0);
    const totalIssues  = leaderboard.reduce((s, e) => s + e.issueCount, 0);
    const lastSprint   = projectMetrics.sprintData[projectMetrics.sprintData.length - 1];
    const maxCat       = [...pieData].sort((a, b) => b.value - a.value)[0];

    // ── KPI tiles ──────────────────────────────────────────────────────────────
    const kpis = [
        { label: 'Gesamtstunden',     value: `${totalHours.toFixed(1)} h` },
        { label: 'Kalenderwochen',    value: String(projectMetrics.totalSprints) },
        { label: 'Ø Velocity / KW',  value: `${projectMetrics.averageVelocity.toFixed(1)} h` },
        { label: 'Teammitglieder',    value: String(leaderboard.length) },
        { label: 'Issues gesamt',     value: String(totalIssues) },
        { label: 'Top-Kategorie',     value: esc(maxCat?.name ?? '—') },
    ].map(k => `
        <div class="kpi">
            <div class="kpi-value">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
        </div>`).join('');

    // ── Leaderboard ────────────────────────────────────────────────────────────
    const maxHours = Math.max(...leaderboard.map(e => e.hours), 1);
    const leaderboardRows = leaderboard.map((e: LeaderboardEntry) => `
        <tr>
            <td style="color:#888;font-weight:700">#${esc(e.rank)}</td>
            <td style="font-weight:600">${esc(e.name)}</td>
            <td>${e.hours.toFixed(1)} h</td>
            <td style="width:120px">${bar(e.hours / maxHours * 100, COLORS.TEAM[(e.rank - 1) % COLORS.TEAM.length])}</td>
            <td style="color:#888">${e.percentage.toFixed(1)} %</td>
            <td>${esc(e.issueCount)}</td>
        </tr>`).join('');

    // ── Kategorie-Verteilung ──────────────────────────────────────────────────
    const totalCatH = pieData.reduce((s, c) => s + c.value, 0) || 1;
    const categoryRows = pieData.map(c => `
        <tr>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${catColor(c.name)};margin-right:6px;vertical-align:middle"></span>${esc(c.name)}</td>
            <td>${c.value.toFixed(1)} h</td>
            <td style="width:140px">${bar(c.value / totalCatH * 100, catColor(c.name))}</td>
            <td style="color:#888">${(c.value / totalCatH * 100).toFixed(1)} %</td>
        </tr>`).join('');

    // ── KW-Verlauf (sprintData) ────────────────────────────────────────────────
    const sprintRows = projectMetrics.sprintData.map(s => {
        const catCells = Object.entries(s.categoryHours)
            .map(([cat, h]) => `<td style="color:${catColor(cat)}">${(h as number).toFixed(1)} h</td>`)
            .join('');
        const catKeys = Object.keys(s.categoryHours);
        return `
        <tr>
            <td style="white-space:nowrap">${esc(s.sprintStart)}</td>
            <td style="font-weight:600">${s.totalHours.toFixed(1)} h</td>
            ${catCells}
            <td style="width:120px">${bar(maxHours > 0 ? s.totalHours / (projectMetrics.averageVelocity * 1.5 || 1) * 100 : 0, '#60a5fa')}</td>
        </tr>`;
        void catKeys;
    }).join('');

    const catHeaders = Object.keys(projectMetrics.sprintData[0]?.categoryHours ?? {})
        .map(k => `<th style="color:${catColor(k)}">${esc(k)}</th>`).join('');

    // ── Pro-Person Kategorie-Aufschlüsselung ──────────────────────────────────
    const personRows = personDetails.map(p => {
        const catTotal = Object.values(p.categoryHours).reduce((a, b) => a + b, 0) || 1;
        const catBars  = Object.entries(p.categoryHours).map(([cat, h]) => {
            const pct = h / catTotal * 100;
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="width:150px;font-size:11px;color:#555">${esc(cat)}</span>
                ${bar(pct, catColor(cat))}
                <span style="font-size:11px;color:#888;width:40px;text-align:right">${h.toFixed(1)} h</span>
            </div>`;
        }).join('');

        const lbEntry = leaderboard.find(e => e.name === p.name);
        return `
        <div class="person-card">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
                <span style="font-weight:700;font-size:1rem">${esc(p.name)}</span>
                <span style="color:#888;font-size:0.875rem">${lbEntry ? lbEntry.hours.toFixed(1) + ' h · ' + lbEntry.issueCount + ' Issues' : ''}</span>
            </div>
            <div style="margin-bottom:6px;font-size:11px;color:#888">
                Letzter Fokus: <strong style="color:#333">${esc(p.focusLastCycle || '—')}</strong>
                &nbsp;→&nbsp; Aktuell: <strong style="color:#333">${esc(p.focusThisCycle || '—')}</strong>
            </div>
            ${catBars}
        </div>`;
    }).join('');

    // ── Produktivität ─────────────────────────────────────────────────────────
    const peakHour = productivityPatterns.peakHour;
    const peakDay  = productivityPatterns.peakDay;

    // ── Fortschrittsverlauf (CFD) ─────────────────────────────────────────────
    const cfdRows = cfdData.map(d => `
        <tr>
            <td>${esc(d.date)}</td>
            <td>${esc(d.opened)}</td>
            <td>${esc(d.closed)}</td>
        </tr>`).join('');

    // ── Risikoanalyse ─────────────────────────────────────────────────────────
    const riskyIssues = detectRiskyIssues(issues);
    const openIssues  = issues.filter(i => i.state === 'opened');
    const { score, issueScore, personScore, categoryScore } =
        computeRiskScore(riskyIssues, openIssues.length, leaderboard, userCategoryMatrix);

    const scoreColor = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
    const scoreLabel = score >= 70 ? 'Hoch' : score >= 40 ? 'Mittel' : 'Niedrig';

    const riskKpis = [
        { label: 'Gesamt-Risikoscore', value: `${score}`, sub: scoreLabel, color: scoreColor },
        { label: 'Issue-Qualität (40%)', value: `${issueScore}`, sub: `${riskyIssues.length} von ${openIssues.length} offen`, color: '#6366f1' },
        { label: 'Personenkonzentration (35%)', value: `${personScore}`, sub: leaderboard.length > 0 ? `Top: ${Math.max(...leaderboard.map(e => e.percentage), 0).toFixed(1)}%` : '—', color: '#f59e0b' },
        { label: 'Kategorie-Abdeckung (25%)', value: `${categoryScore}`, sub: 'Solo-Kategorien', color: '#8b5cf6' },
    ].map(k => `
        <div class="kpi" style="border-left:3px solid ${k.color}">
            <div class="kpi-value" style="color:${k.color}">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
            <div style="font-size:0.7rem;color:#aaa;margin-top:2px">${k.sub}</div>
        </div>`).join('');

    // counts per reason
    const reasonOrder: RiskReason[] = ['no_label','no_epic','no_estimate','no_description','no_dates','high_deviation'];
    const reasonCounts = reasonOrder.map(r => ({
        reason: r,
        count: riskyIssues.filter(x => x.reasons.includes(r)).length,
    }));

    const reasonBars = reasonCounts.map(({ reason, count }) => {
        const pct = openIssues.length > 0 ? count / openIssues.length * 100 : 0;
        return `
        <tr>
            <td style="white-space:nowrap">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${REASON_COLORS[reason]};margin-right:6px;vertical-align:middle"></span>
                ${esc(REASON_LABELS[reason])}
            </td>
            <td style="font-weight:600;color:${count > 0 ? REASON_COLORS[reason] : '#888'}">${count}</td>
            <td style="width:150px">${bar(pct, REASON_COLORS[reason])}</td>
            <td style="color:#888">${pct.toFixed(1)} %</td>
        </tr>`;
    }).join('');

    // top 10 riskiest issues
    const topRiskyRows = riskyIssues.slice(0, 10).map(({ issue, reasons }) => {
        const badges = reasons.map(r =>
            `<span style="display:inline-block;padding:1px 6px;border-radius:20px;font-size:10px;font-weight:600;background:${REASON_COLORS[r]}22;color:${REASON_COLORS[r]};border:1px solid ${REASON_COLORS[r]}44;margin-right:3px">${REASON_LABELS[r]}</span>`
        ).join('');
        const estH   = ((issue.timeEstimate ?? 0) / 3600).toFixed(1);
        const spentH = ((issue.totalTimeSpent ?? 0) / 3600).toFixed(1);
        return `
        <tr>
            <td style="color:#888">#${esc(issue.iid)}</td>
            <td style="max-width:220px"><a href="${esc(issue.webUrl)}" style="color:#3b82f6;text-decoration:none">${esc(issue.title)}</a></td>
            <td>${badges}</td>
            <td style="color:#888;white-space:nowrap">${estH} h</td>
            <td style="color:#888;white-space:nowrap">${spentH} h</td>
            <td style="color:#888">${issue.assignees.nodes.map(a => esc(a.name)).join(', ') || '—'}</td>
        </tr>`;
    }).join('');

    // person risks
    const teamSize  = leaderboard.length;
    const fairShare = teamSize > 0 ? 100 / teamSize : 100;
    const personRiskRows = leaderboard
        .filter(e => e.percentage > fairShare * 1.5)
        .sort((a, b) => b.percentage - a.percentage)
        .map(e => {
            const severity = e.percentage > fairShare * 2.5 ? '#ef4444' : '#f59e0b';
            const overload = (e.percentage / fairShare).toFixed(1);
            return `
        <tr>
            <td style="font-weight:600;color:${severity}">${esc(e.name)}</td>
            <td>${e.hours.toFixed(1)} h</td>
            <td style="font-weight:700;color:${severity}">${e.percentage.toFixed(1)} %</td>
            <td style="color:#888">${overload}× fairer Anteil</td>
            <td style="width:120px">${bar(e.percentage, severity)}</td>
        </tr>`;
        }).join('');

    // ── Last sprint summary ───────────────────────────────────────────────────
    const lastSprintSummary = lastSprint ? `
        <p style="color:#555;font-size:0.875rem">
            Letzte KW: <strong>${esc(lastSprint.sprintStart)}</strong> —
            ${lastSprint.totalHours.toFixed(1)} h von
            ${Object.keys(lastSprint.userHours).length} Personen
        </p>` : '';

    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Time Tracking Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; color: #111; padding: 2rem; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.2rem; }
  .meta { color: #666; font-size: 0.8rem; margin-bottom: 2rem; }
  h2 { font-size: 1rem; font-weight: 700; margin: 2rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 2px solid #e5e5e5; letter-spacing: 0.03em; text-transform: uppercase; color: #444; }
  .card { background: white; border-radius: 10px; border: 1px solid #e5e5e5; padding: 1.25rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.5rem 0.75rem; background: #f8f8f8; font-weight: 600; color: #555; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 0; }
  .kpi { background: white; border: 1px solid #e5e5e5; border-radius: 10px; padding: 1rem; }
  .kpi-value { font-size: 1.4rem; font-weight: 800; color: #111; }
  .kpi-label { font-size: 0.75rem; color: #888; margin-top: 0.2rem; }
  .person-card { background: white; border: 1px solid #e5e5e5; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }
  @media print { body { background: white; padding: 1rem; } }
</style>
</head>
<body>

<h1>Time Tracking Report</h1>
<p class="meta">
  Zeitraum: <strong>${esc(dateRange.from)}</strong> – <strong>${esc(dateRange.to)}</strong>
  &nbsp;|&nbsp; Generiert: ${esc(now)}
</p>
${lastSprintSummary}

<h2>KPIs</h2>
<div class="kpi-grid">${kpis}</div>

<h2>Leaderboard</h2>
<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead><tr><th>#</th><th>Name</th><th>Stunden</th><th style="width:130px">Anteil</th><th>%</th><th>Issues</th></tr></thead>
    <tbody>${leaderboardRows}</tbody>
  </table>
</div>

<h2>Kategorie-Verteilung</h2>
<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead><tr><th>Kategorie</th><th>Stunden</th><th style="width:150px">Anteil</th><th>%</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>
</div>

<h2>KW-Verlauf</h2>
<div class="card" style="padding:0;overflow:hidden;overflow-x:auto">
  <table>
    <thead><tr><th>Kalenderwoche</th><th>Gesamt</th>${catHeaders}<th style="width:130px">Verlauf</th></tr></thead>
    <tbody>${sprintRows}</tbody>
  </table>
</div>

<h2>Pro-Person Aufschlüsselung</h2>
${personRows}

<h2>Fortschrittsverlauf (Issues)</h2>
<div class="two-col">
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr><th>Datum / KW</th><th>Offen (kum.)</th><th>Geschlossen (kum.)</th></tr></thead>
      <tbody>${cfdRows}</tbody>
    </table>
  </div>
  <div class="card">
    <div style="font-size:0.85rem;color:#555;margin-bottom:0.5rem;font-weight:600">Produktivitätsmuster</div>
    <div style="margin-bottom:0.5rem">
      Peak-Stunde: <strong>${esc(peakHour.hour)} Uhr</strong>
      <span style="color:#888;font-size:0.8rem">(${peakHour.value.toFixed(1)} h)</span>
    </div>
    <div>
      Peak-Wochentag: <strong>${esc(peakDay.day)}</strong>
      <span style="color:#888;font-size:0.8rem">(${peakDay.value.toFixed(1)} h)</span>
    </div>
  </div>
</div>

<h2>Risikoanalyse</h2>
<div class="kpi-grid" style="margin-bottom:1rem">${riskKpis}</div>

<div class="two-col" style="margin-bottom:1rem">
  <div class="card" style="padding:0;overflow:hidden">
    <div style="padding:0.75rem 1rem;font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #f0f0f0">Risikoverteilung nach Typ</div>
    <table>
      <thead><tr><th>Risikotyp</th><th>Issues</th><th style="width:160px">Anteil</th><th>%</th></tr></thead>
      <tbody>${reasonBars}</tbody>
    </table>
  </div>
  ${personRiskRows ? `<div class="card" style="padding:0;overflow:hidden">
    <div style="padding:0.75rem 1rem;font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #f0f0f0">Personenrisiken (Schlüsselpersonen)</div>
    <table>
      <thead><tr><th>Person</th><th>Stunden</th><th>Anteil</th><th>Konzentration</th><th style="width:120px">Verteilung</th></tr></thead>
      <tbody>${personRiskRows}</tbody>
    </table>
    <p style="padding:0.5rem 1rem;font-size:0.75rem;color:#aaa;border-top:1px solid #f0f0f0">Schwelle: &gt;1.5× fairer Anteil (${fairShare.toFixed(1)}% bei ${teamSize} Personen)</p>
  </div>` : `<div class="card"><p style="color:#22c55e;font-weight:600">Keine kritischen Personenabhängigkeiten.</p></div>`}
</div>

${topRiskyRows ? `<div class="card" style="padding:0;overflow:hidden">
  <div style="padding:0.75rem 1rem;font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #f0f0f0">Riskanteste Issues (Top ${Math.min(10, riskyIssues.length)} von ${riskyIssues.length})</div>
  <div style="overflow-x:auto">
    <table>
      <thead><tr><th>#</th><th>Titel</th><th>Risiken</th><th>Geschätzt</th><th>Tatsächlich</th><th>Assignee</th></tr></thead>
      <tbody>${topRiskyRows}</tbody>
    </table>
  </div>
</div>` : '<div class="card"><p style="color:#22c55e;font-weight:600">Keine risikobehafteten Issues gefunden.</p></div>'}

</body>
</html>`;
}

export function downloadReport(html: string, filename = 'report') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
}
