import { ChartData, LeaderboardEntry } from './processData';

function esc(s: string | number): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function generateReport(data: ChartData, dateRange: { from: string; to: string }): string {
    const now = new Date().toLocaleString('de-DE');
    const { leaderboard, pieData, projectMetrics } = data;

    const leaderboardRows = leaderboard
        .map((e: LeaderboardEntry) => `
            <tr>
                <td>${esc(e.rank)}</td>
                <td>${esc(e.name)}</td>
                <td>${e.hours.toFixed(1)} h</td>
                <td>${e.percentage.toFixed(1)} %</td>
                <td>${esc(e.issueCount)}</td>
            </tr>`)
        .join('');

    const categoryRows = pieData
        .map(c => `
            <tr>
                <td>${esc(c.name)}</td>
                <td>${c.value.toFixed(1)} h</td>
            </tr>`)
        .join('');

    const totalHours = leaderboard.reduce((s, e) => s + e.hours, 0);

    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Time Tracking Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; color: #111; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
  h2 { font-size: 1.1rem; margin: 2rem 0 0.75rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; padding: 0.5rem 0.75rem; background: #f0f0f0; font-weight: 600; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e5e5; }
  tr:last-child td { border-bottom: none; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
  .kpi { background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 1rem; }
  .kpi-value { font-size: 1.5rem; font-weight: 700; }
  .kpi-label { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }
</style>
</head>
<body>
<h1>Time Tracking Report</h1>
<p class="meta">Zeitraum: ${esc(dateRange.from)} – ${esc(dateRange.to)} &nbsp;|&nbsp; Generiert: ${esc(now)}</p>

<h2>KPIs</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value">${totalHours.toFixed(1)} h</div><div class="kpi-label">Gesamtstunden</div></div>
  <div class="kpi"><div class="kpi-value">${esc(projectMetrics.totalSprints)}</div><div class="kpi-label">Sprints</div></div>
  <div class="kpi"><div class="kpi-value">${projectMetrics.averageVelocity.toFixed(1)} h</div><div class="kpi-label">Ø Velocity</div></div>
  <div class="kpi"><div class="kpi-value">${esc(leaderboard.length)}</div><div class="kpi-label">Teammitglieder</div></div>
</div>

<h2>Leaderboard</h2>
<table>
  <thead><tr><th>#</th><th>Name</th><th>Stunden</th><th>Anteil</th><th>Issues</th></tr></thead>
  <tbody>${leaderboardRows}</tbody>
</table>

<h2>Kategorie-Verteilung</h2>
<table>
  <thead><tr><th>Kategorie</th><th>Stunden</th></tr></thead>
  <tbody>${categoryRows}</tbody>
</table>
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
