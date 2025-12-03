/**
 * Dashboard Builder Skill
 * Builds React dashboard components and HTML visualizations
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectShard } from './shard-generator';

export interface DashboardConfig {
  meta: {
    precision: number;
    active: number;
    dormant: number;
    totalProjects: number;
    driftAlerts: number;
    lastUpdated: string;
  };
  projects: ProjectShard[];
  clusters: Array<{
    name: string;
    projects: ProjectShard[];
    avgAlignment: number;
  }>;
}

/**
 * Builds a complete HTML dashboard from project shards
 * @param config - Dashboard configuration
 * @returns HTML string
 */
export function buildDashboardHTML(config: DashboardConfig): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Cognitive Command - Dashboard</title>
  <style>
    ${getDashboardStyles()}
  </style>
</head>
<body>
  <div class="dashboard">
    ${buildHeader(config.meta)}
    ${buildMetricsPanel(config.meta)}
    ${buildClustersSection(config.clusters)}
    ${buildProjectsTable(config.projects)}
    ${buildDriftAlertsSection(config.projects)}
  </div>
  <script>
    ${getDashboardScripts()}
  </script>
</body>
</html>
  `.trim();

  return html;
}

/**
 * Builds dashboard header
 */
function buildHeader(meta: DashboardConfig['meta']): string {
  return `
    <header class="dashboard-header">
      <h1>Portfolio Cognitive Command</h1>
      <p class="subtitle">Agent-Driven Repository Intelligence</p>
      <div class="last-updated">Last updated: ${new Date(meta.lastUpdated).toLocaleString()}</div>
    </header>
  `;
}

/**
 * Builds metrics overview panel
 */
function buildMetricsPanel(meta: DashboardConfig['meta']): string {
  const precisionPercent = (meta.precision * 100).toFixed(1);

  return `
    <section class="metrics-panel">
      <div class="metric-card">
        <div class="metric-value">${precisionPercent}%</div>
        <div class="metric-label">Precision Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.active}</div>
        <div class="metric-label">Active Projects</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.dormant}</div>
        <div class="metric-label">Dormant Projects</div>
      </div>
      <div class="metric-card ${meta.driftAlerts > 0 ? 'alert' : ''}">
        <div class="metric-value">${meta.driftAlerts}</div>
        <div class="metric-label">Drift Alerts</div>
      </div>
    </section>
  `;
}

/**
 * Builds clusters section with project groupings
 */
function buildClustersSection(
  clusters: DashboardConfig['clusters']
): string {
  const clusterCards = clusters.map(cluster => {
    const avgPercent = (cluster.avgAlignment * 100).toFixed(1);
    const projectCount = cluster.projects.length;

    return `
      <div class="cluster-card">
        <h3 class="cluster-name">${cluster.name}</h3>
        <div class="cluster-stats">
          <span>${projectCount} projects</span>
          <span class="alignment-score">${avgPercent}% aligned</span>
        </div>
        <div class="cluster-projects">
          ${cluster.projects.map(p => `
            <div class="mini-project-card ${p.driftAlert ? 'drift-alert' : ''}">
              <span class="project-name">${p.project}</span>
              <span class="project-score">${(p.alignmentScore * 100).toFixed(0)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="clusters-section">
      <h2>Clusters</h2>
      <div class="clusters-grid">
        ${clusterCards}
      </div>
    </section>
  `;
}

/**
 * Builds detailed projects table
 */
function buildProjectsTable(projects: ProjectShard[]): string {
  const sortedProjects = [...projects].sort((a, b) =>
    b.alignmentScore - a.alignmentScore
  );

  const rows = sortedProjects.map(project => {
    const alignmentPercent = (project.alignmentScore * 100).toFixed(1);
    const statusClass = project.metadata?.status.toLowerCase() || '';
    const driftClass = project.driftAlert ? 'drift' : '';

    return `
      <tr class="${driftClass}">
        <td>
          <strong>${project.project}</strong>
          <span class="project-meta">${project.cluster}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${project.metadata?.status || 'UNKNOWN'}</span>
        </td>
        <td>
          <div class="alignment-bar-container">
            <div class="alignment-bar" style="width: ${alignmentPercent}%"></div>
            <span class="alignment-text">${alignmentPercent}%</span>
          </div>
        </td>
        <td>${project.driftAlert ? '<span class="drift-indicator">⚠️ DRIFT</span>' : '✓'}</td>
        <td class="intent-cell">${escapeHtml(project.lastIntent)}</td>
        <td>
          <span class="source-badge ${project.source}">${formatSource(project.source)}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <section class="projects-section">
      <h2>All Projects</h2>
      <table class="projects-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Alignment</th>
            <th>Drift</th>
            <th>Last Intent</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Builds drift alerts section
 */
function buildDriftAlertsSection(projects: ProjectShard[]): string {
  const driftProjects = projects.filter(p => p.driftAlert);

  if (driftProjects.length === 0) {
    return `
      <section class="drift-alerts-section">
        <h2>Drift Alerts</h2>
        <div class="no-alerts">
          <span class="success-icon">✓</span>
          <p>No drift alerts detected. All projects aligned with intent.</p>
        </div>
      </section>
    `;
  }

  const alertCards = driftProjects.map(project => {
    const alignmentPercent = (project.alignmentScore * 100).toFixed(1);

    return `
      <div class="drift-alert-card">
        <div class="alert-header">
          <h4>${project.project}</h4>
          <span class="alert-score">${alignmentPercent}% aligned</span>
        </div>
        <div class="alert-body">
          <p><strong>Last Intent:</strong> ${escapeHtml(project.lastIntent)}</p>
          <p><strong>Summary:</strong> ${escapeHtml(project.executionSummary)}</p>
          <p class="recommendation">⚠️ Review implementation against stated intent</p>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="drift-alerts-section">
      <h2>Drift Alerts (${driftProjects.length})</h2>
      <div class="drift-alerts-grid">
        ${alertCards}
      </div>
    </section>
  `;
}

/**
 * Returns CSS styles for dashboard
 */
function getDashboardStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0a0e27;
      color: #e0e6ed;
      padding: 2rem;
      line-height: 1.6;
    }

    .dashboard { max-width: 1400px; margin: 0 auto; }

    .dashboard-header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #1a2236;
    }

    .dashboard-header h1 {
      font-size: 2.5rem;
      color: #00d9ff;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #7a8ca0;
      font-size: 1.1rem;
    }

    .last-updated {
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #556677;
    }

    .metrics-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .metric-card {
      background: #141933;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #1a2236;
      text-align: center;
      transition: transform 0.2s;
    }

    .metric-card:hover { transform: translateY(-4px); }

    .metric-card.alert {
      border-color: #ff6b6b;
      background: linear-gradient(135deg, #141933, #2a1a1a);
    }

    .metric-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #00d9ff;
      margin-bottom: 0.5rem;
    }

    .metric-label {
      color: #7a8ca0;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h2 {
      font-size: 1.8rem;
      color: #00d9ff;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #1a2236;
    }

    .clusters-section { margin-bottom: 3rem; }

    .clusters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .cluster-card {
      background: #141933;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #1a2236;
    }

    .cluster-name {
      font-size: 1.3rem;
      color: #00d9ff;
      margin-bottom: 0.5rem;
    }

    .cluster-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #1a2236;
      color: #7a8ca0;
      font-size: 0.9rem;
    }

    .alignment-score { color: #4ade80; }

    .cluster-projects {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .mini-project-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: #0a0e27;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .mini-project-card.drift-alert {
      border-left: 3px solid #ff6b6b;
    }

    .project-score { color: #4ade80; font-weight: 600; }

    .projects-table {
      width: 100%;
      background: #141933;
      border-radius: 12px;
      border: 1px solid #1a2236;
      border-collapse: collapse;
      overflow: hidden;
    }

    .projects-table thead {
      background: #0a0e27;
    }

    .projects-table th {
      padding: 1rem;
      text-align: left;
      color: #00d9ff;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }

    .projects-table td {
      padding: 1rem;
      border-top: 1px solid #1a2236;
    }

    .projects-table tr.drift {
      background: linear-gradient(90deg, rgba(255,107,107,0.1), transparent);
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #4ade80;
      color: #0a0e27;
    }

    .status-badge.dormant {
      background: #64748b;
      color: #e0e6ed;
    }

    .alignment-bar-container {
      position: relative;
      background: #0a0e27;
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
    }

    .alignment-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, #00d9ff, #4ade80);
      transition: width 0.3s;
    }

    .alignment-text {
      position: relative;
      display: block;
      line-height: 24px;
      text-align: center;
      font-size: 0.85rem;
      font-weight: 600;
      color: #e0e6ed;
      z-index: 1;
    }

    .drift-indicator {
      color: #ff6b6b;
      font-weight: 600;
    }

    .intent-cell {
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.9rem;
      color: #9ca3af;
    }

    .source-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .source-badge.agent_swarm {
      background: #00d9ff;
      color: #0a0e27;
    }

    .source-badge.manual_override {
      background: #fbbf24;
      color: #0a0e27;
    }

    .drift-alerts-section { margin-top: 3rem; }

    .no-alerts {
      text-align: center;
      padding: 3rem;
      background: #141933;
      border-radius: 12px;
      border: 1px solid #1a2236;
    }

    .success-icon {
      font-size: 3rem;
      color: #4ade80;
    }

    .drift-alerts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .drift-alert-card {
      background: linear-gradient(135deg, #2a1a1a, #141933);
      border: 2px solid #ff6b6b;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 107, 107, 0.3);
    }

    .alert-header h4 {
      font-size: 1.2rem;
      color: #ff6b6b;
    }

    .alert-score {
      font-weight: 600;
      color: #fbbf24;
    }

    .alert-body p {
      margin-bottom: 0.75rem;
      font-size: 0.95rem;
    }

    .recommendation {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(255, 107, 107, 0.1);
      border-left: 3px solid #ff6b6b;
      color: #fbbf24;
      font-weight: 500;
    }

    .project-meta {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.2rem 0.5rem;
      background: #0a0e27;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #7a8ca0;
    }
  `;
}

/**
 * Returns JavaScript for dashboard interactivity
 */
function getDashboardScripts(): string {
  return `
    // Add any interactive features here
    console.log('Portfolio Cognitive Command Dashboard loaded');

    // Auto-refresh every 5 minutes
    setTimeout(() => {
      location.reload();
    }, 5 * 60 * 1000);
  `;
}

/**
 * Formats source for display
 */
function formatSource(source: string): string {
  return source === 'agent_swarm' ? 'Agent' : 'Manual';
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Saves dashboard HTML to file
 * @param html - HTML content
 * @param outputPath - File path to save to
 */
export function saveDashboard(html: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf8');
}

/**
 * Creates dashboard config from project shards
 * @param shards - Array of project shards
 * @returns Dashboard configuration
 */
export function createDashboardConfig(shards: ProjectShard[]): DashboardConfig {
  // Calculate metrics
  const activeProjects = shards.filter(s => s.metadata?.status === 'ACTIVE').length;
  const dormantProjects = shards.filter(s => s.metadata?.status === 'DORMANT').length;
  const driftAlerts = shards.filter(s => s.driftAlert).length;

  const totalAlignment = shards.reduce((sum, s) => sum + s.alignmentScore, 0);
  const precision = shards.length > 0 ? totalAlignment / shards.length : 0;

  // Group by clusters
  const clusterMap: Record<string, ProjectShard[]> = {};
  for (const shard of shards) {
    if (!clusterMap[shard.cluster]) {
      clusterMap[shard.cluster] = [];
    }
    clusterMap[shard.cluster].push(shard);
  }

  const clusters = Object.entries(clusterMap).map(([name, projects]) => {
    const avgAlignment = projects.reduce((sum, p) => sum + p.alignmentScore, 0) / projects.length;
    return { name, projects, avgAlignment };
  });

  return {
    meta: {
      precision,
      active: activeProjects,
      dormant: dormantProjects,
      totalProjects: shards.length,
      driftAlerts,
      lastUpdated: new Date().toISOString()
    },
    projects: shards,
    clusters
  };
}
