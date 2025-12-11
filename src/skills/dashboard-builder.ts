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
    avgHealthScore: number;
    avgHealthGrade: string;
    projectsWithCI: number;
    projectsWithTests: number;
    projectsWithDocker: number;
    projectsWithSupabase: number;
    projectsDeployed: number;
  };
  projects: ProjectShard[];
  clusters: Array<{
    name: string;
    projects: ProjectShard[];
    avgAlignment: number;
    avgHealthScore: number;
  }>;
  techStackSummary: {
    languages: Record<string, number>;
    frameworks: Record<string, number>;
    databases: Record<string, number>;
  };
  activitySummary: {
    highVelocity: number;
    mediumVelocity: number;
    lowVelocity: number;
    stale: number;
    totalCommits7d: number;
    totalCommits30d: number;
  };
  healthDistribution: {
    gradeA: number;
    gradeB: number;
    gradeC: number;
    gradeD: number;
    gradeF: number;
  };
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
    ${buildHealthOverview(config)}
    ${buildTechStackPanel(config.techStackSummary)}
    ${buildActivityPanel(config.activitySummary)}
    ${buildClustersSection(config.clusters)}
    ${buildProjectsTable(config.projects)}
    ${buildDriftAlertsSection(config.projects)}
  </div>
  <script>
    ${getDashboardScripts(config)}
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
  const gradeColor = meta.avgHealthGrade === 'A' ? '#4ade80' :
                     meta.avgHealthGrade === 'B' ? '#a3e635' :
                     meta.avgHealthGrade === 'C' ? '#facc15' :
                     meta.avgHealthGrade === 'D' ? '#fb923c' : '#ef4444';

  return `
    <section class="metrics-panel">
      <div class="metric-card highlight">
        <div class="metric-value" style="color: ${gradeColor}">${meta.avgHealthGrade}</div>
        <div class="metric-label">Portfolio Health</div>
        <div class="metric-sub">${meta.avgHealthScore}/100</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.active}</div>
        <div class="metric-label">Active</div>
        <div class="metric-sub">of ${meta.totalProjects} projects</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.projectsWithCI}</div>
        <div class="metric-label">CI/CD</div>
        <div class="metric-sub">${Math.round(meta.projectsWithCI / meta.totalProjects * 100)}% coverage</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.projectsWithTests}</div>
        <div class="metric-label">Tested</div>
        <div class="metric-sub">${Math.round(meta.projectsWithTests / meta.totalProjects * 100)}% coverage</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${meta.projectsDeployed}</div>
        <div class="metric-label">Deployed</div>
        <div class="metric-sub">${Math.round(meta.projectsDeployed / meta.totalProjects * 100)}% live</div>
      </div>
      <div class="metric-card ${meta.driftAlerts > 0 ? 'alert' : ''}">
        <div class="metric-value">${meta.driftAlerts}</div>
        <div class="metric-label">Drift Alerts</div>
      </div>
    </section>
  `;
}

/**
 * Builds health overview section with grade distribution
 */
function buildHealthOverview(config: DashboardConfig): string {
  const { healthDistribution } = config;
  const total = config.projects.length;

  return `
    <section class="health-overview">
      <h2>Health Distribution</h2>
      <div class="health-grid">
        <div class="grade-distribution">
          <div class="grade-bar">
            <div class="grade-segment grade-a" style="width: ${healthDistribution.gradeA / total * 100}%">
              <span class="grade-label">A</span>
              <span class="grade-count">${healthDistribution.gradeA}</span>
            </div>
            <div class="grade-segment grade-b" style="width: ${healthDistribution.gradeB / total * 100}%">
              <span class="grade-label">B</span>
              <span class="grade-count">${healthDistribution.gradeB}</span>
            </div>
            <div class="grade-segment grade-c" style="width: ${healthDistribution.gradeC / total * 100}%">
              <span class="grade-label">C</span>
              <span class="grade-count">${healthDistribution.gradeC}</span>
            </div>
            <div class="grade-segment grade-d" style="width: ${healthDistribution.gradeD / total * 100}%">
              <span class="grade-label">D</span>
              <span class="grade-count">${healthDistribution.gradeD}</span>
            </div>
            <div class="grade-segment grade-f" style="width: ${healthDistribution.gradeF / total * 100}%">
              <span class="grade-label">F</span>
              <span class="grade-count">${healthDistribution.gradeF}</span>
            </div>
          </div>
        </div>
        <div class="health-legend">
          <div class="legend-item"><span class="dot grade-a"></span> A: ${healthDistribution.gradeA} projects (90-100)</div>
          <div class="legend-item"><span class="dot grade-b"></span> B: ${healthDistribution.gradeB} projects (80-89)</div>
          <div class="legend-item"><span class="dot grade-c"></span> C: ${healthDistribution.gradeC} projects (70-79)</div>
          <div class="legend-item"><span class="dot grade-d"></span> D: ${healthDistribution.gradeD} projects (60-69)</div>
          <div class="legend-item"><span class="dot grade-f"></span> F: ${healthDistribution.gradeF} projects (0-59)</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Builds tech stack summary panel
 */
function buildTechStackPanel(techStack: DashboardConfig['techStackSummary']): string {
  const topLanguages = Object.entries(techStack.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topFrameworks = Object.entries(techStack.frameworks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return `
    <section class="tech-stack-panel">
      <h2>Tech Stack</h2>
      <div class="tech-grid">
        <div class="tech-category">
          <h3>Languages</h3>
          <div class="tech-bars">
            ${topLanguages.map(([lang, count]) => `
              <div class="tech-bar-row">
                <span class="tech-name">${lang}</span>
                <div class="tech-bar-track">
                  <div class="tech-bar-fill lang" style="width: ${count / Math.max(...Object.values(techStack.languages)) * 100}%"></div>
                </div>
                <span class="tech-count">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="tech-category">
          <h3>Frameworks</h3>
          <div class="tech-bars">
            ${topFrameworks.map(([fw, count]) => `
              <div class="tech-bar-row">
                <span class="tech-name">${fw}</span>
                <div class="tech-bar-track">
                  <div class="tech-bar-fill framework" style="width: ${count / Math.max(...Object.values(techStack.frameworks), 1) * 100}%"></div>
                </div>
                <span class="tech-count">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Builds activity summary panel
 */
function buildActivityPanel(activity: DashboardConfig['activitySummary']): string {
  const total = activity.highVelocity + activity.mediumVelocity + activity.lowVelocity + activity.stale;

  return `
    <section class="activity-panel">
      <h2>Activity Overview</h2>
      <div class="activity-grid">
        <div class="activity-stats">
          <div class="activity-stat">
            <div class="stat-value">${activity.totalCommits7d}</div>
            <div class="stat-label">Commits (7d)</div>
          </div>
          <div class="activity-stat">
            <div class="stat-value">${activity.totalCommits30d}</div>
            <div class="stat-label">Commits (30d)</div>
          </div>
        </div>
        <div class="velocity-breakdown">
          <h3>Velocity Distribution</h3>
          <div class="velocity-bars">
            <div class="velocity-row">
              <span class="velocity-label">High (10+ commits/wk)</span>
              <div class="velocity-track">
                <div class="velocity-fill high" style="width: ${activity.highVelocity / total * 100}%"></div>
              </div>
              <span class="velocity-count">${activity.highVelocity}</span>
            </div>
            <div class="velocity-row">
              <span class="velocity-label">Medium (3-9 commits/wk)</span>
              <div class="velocity-track">
                <div class="velocity-fill medium" style="width: ${activity.mediumVelocity / total * 100}%"></div>
              </div>
              <span class="velocity-count">${activity.mediumVelocity}</span>
            </div>
            <div class="velocity-row">
              <span class="velocity-label">Low (1-2 commits/wk)</span>
              <div class="velocity-track">
                <div class="velocity-fill low" style="width: ${activity.lowVelocity / total * 100}%"></div>
              </div>
              <span class="velocity-count">${activity.lowVelocity}</span>
            </div>
            <div class="velocity-row">
              <span class="velocity-label">Stale (no activity)</span>
              <div class="velocity-track">
                <div class="velocity-fill stale" style="width: ${activity.stale / total * 100}%"></div>
              </div>
              <span class="velocity-count">${activity.stale}</span>
            </div>
          </div>
        </div>
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
    const projectCount = cluster.projects.length;
    const avgHealth = cluster.avgHealthScore || 0;

    return `
      <div class="cluster-card">
        <h3 class="cluster-name">${cluster.name}</h3>
        <div class="cluster-stats">
          <span>${projectCount} projects</span>
          <span class="health-score">Health: ${avgHealth.toFixed(0)}/100</span>
        </div>
        <div class="cluster-projects">
          ${cluster.projects.slice(0, 10).map(p => `
            <div class="mini-project-card ${p.driftAlert ? 'drift-alert' : ''}" data-health="${p.health?.grade || 'N/A'}">
              <span class="project-name">${p.project}</span>
              <span class="project-grade grade-${(p.health?.grade || 'F').toLowerCase()}">${p.health?.grade || 'N/A'}</span>
            </div>
          `).join('')}
          ${cluster.projects.length > 10 ? `<div class="more-projects">+${cluster.projects.length - 10} more</div>` : ''}
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
    (b.health?.score || 0) - (a.health?.score || 0)
  );

  const rows = sortedProjects.map(project => {
    const healthScore = project.health?.score || 0;
    const healthGrade = project.health?.grade || 'N/A';
    const statusClass = project.metadata?.status?.toLowerCase() || '';
    const velocity = project.activity?.commitVelocity || 'stale';
    const techStack = project.techStack?.primaryLanguage || 'Unknown';
    const frameworks = project.techStack?.frameworks?.slice(0, 2).join(', ') || '-';
    const hasCI = project.integrations?.hasCI ? '✓' : '-';
    const hasTests = project.integrations?.hasTests ? '✓' : '-';
    const deployment = project.deployment?.platform !== 'unknown' ? project.deployment?.platform : '-';

    return `
      <tr class="project-row" data-project="${project.project}">
        <td>
          <strong>${project.project}</strong>
          <span class="project-meta">${project.cluster}</span>
        </td>
        <td>
          <span class="health-grade grade-${healthGrade.toLowerCase()}">${healthGrade}</span>
          <span class="health-score-small">${healthScore}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${project.metadata?.status || 'UNKNOWN'}</span>
        </td>
        <td>
          <span class="velocity-badge ${velocity}">${velocity}</span>
          <span class="commit-count">${project.activity?.commits7d || 0}/wk</span>
        </td>
        <td class="tech-cell">
          <span class="primary-tech">${techStack}</span>
          ${frameworks !== '-' ? `<span class="frameworks">${frameworks}</span>` : ''}
        </td>
        <td class="integrations-cell">
          <span class="integration-badge ${hasCI === '✓' ? 'active' : ''}" title="CI/CD">CI</span>
          <span class="integration-badge ${hasTests === '✓' ? 'active' : ''}" title="Tests">T</span>
          <span class="integration-badge ${deployment !== '-' ? 'active' : ''}" title="Deployed">${deployment && deployment !== '-' ? deployment.slice(0, 2).toUpperCase() : 'D'}</span>
        </td>
        <td class="intent-cell">${escapeHtml(truncateText(project.lastIntent, 60))}</td>
      </tr>
    `;
  }).join('');

  return `
    <section class="projects-section">
      <h2>All Projects</h2>
      <div class="table-controls">
        <input type="text" id="projectSearch" placeholder="Search projects..." class="search-input">
        <select id="sortBy" class="sort-select">
          <option value="health">Sort by Health</option>
          <option value="activity">Sort by Activity</option>
          <option value="name">Sort by Name</option>
        </select>
        <select id="filterCluster" class="filter-select">
          <option value="">All Clusters</option>
          ${[...new Set(projects.map(p => p.cluster))].map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <table class="projects-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Health</th>
            <th>Status</th>
            <th>Activity</th>
            <th>Tech</th>
            <th>Integrations</th>
            <th>Last Intent</th>
          </tr>
        </thead>
        <tbody id="projectsTableBody">
          ${rows}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
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

    /* Enhanced Styles */
    .metric-card.highlight {
      background: linear-gradient(135deg, #141933, #1a2540);
      border: 2px solid #00d9ff;
    }

    .metric-sub {
      font-size: 0.8rem;
      color: #7a8ca0;
      margin-top: 0.25rem;
    }

    /* Health Overview */
    .health-overview {
      margin-bottom: 3rem;
      background: #141933;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #1a2236;
    }

    .health-grid {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 2rem;
      align-items: center;
    }

    .grade-bar {
      display: flex;
      height: 40px;
      border-radius: 8px;
      overflow: hidden;
    }

    .grade-segment {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-width: 40px;
      transition: all 0.3s;
    }

    .grade-segment:hover { filter: brightness(1.2); }
    .grade-segment.grade-a { background: #4ade80; color: #0a0e27; }
    .grade-segment.grade-b { background: #a3e635; color: #0a0e27; }
    .grade-segment.grade-c { background: #facc15; color: #0a0e27; }
    .grade-segment.grade-d { background: #fb923c; color: #0a0e27; }
    .grade-segment.grade-f { background: #ef4444; color: white; }

    .grade-label { font-weight: bold; font-size: 0.9rem; }
    .grade-count { font-size: 0.75rem; }

    .health-legend { font-size: 0.85rem; }
    .legend-item { margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.grade-a { background: #4ade80; }
    .dot.grade-b { background: #a3e635; }
    .dot.grade-c { background: #facc15; }
    .dot.grade-d { background: #fb923c; }
    .dot.grade-f { background: #ef4444; }

    /* Tech Stack Panel */
    .tech-stack-panel, .activity-panel {
      margin-bottom: 3rem;
      background: #141933;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #1a2236;
    }

    .tech-grid, .activity-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .tech-category h3, .velocity-breakdown h3 {
      color: #7a8ca0;
      font-size: 0.9rem;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .tech-bars, .velocity-bars { display: flex; flex-direction: column; gap: 0.5rem; }

    .tech-bar-row, .velocity-row {
      display: grid;
      grid-template-columns: 120px 1fr 40px;
      align-items: center;
      gap: 1rem;
    }

    .tech-name, .velocity-label { font-size: 0.85rem; color: #e0e6ed; }
    .tech-bar-track, .velocity-track { height: 8px; background: #0a0e27; border-radius: 4px; overflow: hidden; }
    .tech-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .tech-bar-fill.lang { background: linear-gradient(90deg, #00d9ff, #4ade80); }
    .tech-bar-fill.framework { background: linear-gradient(90deg, #a855f7, #ec4899); }
    .tech-count, .velocity-count { font-size: 0.85rem; color: #7a8ca0; text-align: right; }

    .velocity-fill { height: 100%; border-radius: 4px; }
    .velocity-fill.high { background: #4ade80; }
    .velocity-fill.medium { background: #facc15; }
    .velocity-fill.low { background: #fb923c; }
    .velocity-fill.stale { background: #64748b; }

    /* Activity Stats */
    .activity-stats {
      display: flex;
      gap: 2rem;
    }

    .activity-stat {
      text-align: center;
      padding: 1.5rem;
      background: #0a0e27;
      border-radius: 8px;
      flex: 1;
    }

    .stat-value { font-size: 2rem; font-weight: bold; color: #00d9ff; }
    .stat-label { font-size: 0.85rem; color: #7a8ca0; }

    /* Table Controls */
    .table-controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .search-input, .sort-select, .filter-select {
      padding: 0.75rem 1rem;
      background: #141933;
      border: 1px solid #1a2236;
      border-radius: 8px;
      color: #e0e6ed;
      font-size: 0.9rem;
    }

    .search-input { flex: 1; }
    .search-input:focus, .sort-select:focus, .filter-select:focus {
      outline: none;
      border-color: #00d9ff;
    }

    /* Health Grade in Table */
    .health-grade {
      display: inline-block;
      width: 28px;
      height: 28px;
      line-height: 28px;
      text-align: center;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.85rem;
    }

    .health-grade.grade-a { background: #4ade80; color: #0a0e27; }
    .health-grade.grade-b { background: #a3e635; color: #0a0e27; }
    .health-grade.grade-c { background: #facc15; color: #0a0e27; }
    .health-grade.grade-d { background: #fb923c; color: #0a0e27; }
    .health-grade.grade-f { background: #ef4444; color: white; }

    .health-score-small { font-size: 0.75rem; color: #7a8ca0; margin-left: 0.5rem; }

    /* Velocity Badge */
    .velocity-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .velocity-badge.high { background: #4ade80; color: #0a0e27; }
    .velocity-badge.medium { background: #facc15; color: #0a0e27; }
    .velocity-badge.low { background: #fb923c; color: #0a0e27; }
    .velocity-badge.stale { background: #64748b; color: #e0e6ed; }

    .commit-count { font-size: 0.75rem; color: #7a8ca0; margin-left: 0.5rem; }

    /* Tech Cell */
    .tech-cell .primary-tech { font-weight: 500; }
    .tech-cell .frameworks { display: block; font-size: 0.75rem; color: #7a8ca0; }

    /* Integration Badges */
    .integrations-cell { white-space: nowrap; }
    .integration-badge {
      display: inline-block;
      padding: 0.15rem 0.4rem;
      margin-right: 0.25rem;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 600;
      background: #1a2236;
      color: #64748b;
    }

    .integration-badge.active {
      background: #4ade80;
      color: #0a0e27;
    }

    /* Project Grade in Clusters */
    .project-grade {
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .project-grade.grade-a { background: #4ade80; color: #0a0e27; }
    .project-grade.grade-b { background: #a3e635; color: #0a0e27; }
    .project-grade.grade-c { background: #facc15; color: #0a0e27; }
    .project-grade.grade-d { background: #fb923c; color: #0a0e27; }
    .project-grade.grade-f { background: #ef4444; color: white; }

    .health-score { color: #4ade80; }
    .more-projects { font-size: 0.8rem; color: #7a8ca0; text-align: center; padding: 0.5rem; }

    @media (max-width: 768px) {
      .health-grid, .tech-grid, .activity-grid { grid-template-columns: 1fr; }
      .table-controls { flex-direction: column; }
      .projects-table { font-size: 0.85rem; }
    }
  `;
}

/**
 * Returns JavaScript for dashboard interactivity
 */
function getDashboardScripts(config: DashboardConfig): string {
  return `
    console.log('Portfolio Cognitive Command Dashboard loaded');

    // Project data for filtering/sorting
    const projects = ${JSON.stringify(config.projects.map(p => ({
      name: p.project,
      cluster: p.cluster,
      health: p.health?.score || 0,
      grade: p.health?.grade || 'F',
      activity: p.activity?.commits7d || 0,
      status: p.metadata?.status || 'UNKNOWN'
    })))};

    // Search functionality
    const searchInput = document.getElementById('projectSearch');
    const sortSelect = document.getElementById('sortBy');
    const filterSelect = document.getElementById('filterCluster');
    const tableBody = document.getElementById('projectsTableBody');

    function filterAndSort() {
      const searchTerm = searchInput.value.toLowerCase();
      const sortBy = sortSelect.value;
      const filterCluster = filterSelect.value;

      const rows = Array.from(tableBody.querySelectorAll('tr'));

      rows.forEach(row => {
        const projectName = row.getAttribute('data-project').toLowerCase();
        const cluster = row.querySelector('.project-meta')?.textContent || '';

        const matchesSearch = projectName.includes(searchTerm);
        const matchesCluster = !filterCluster || cluster === filterCluster;

        row.style.display = matchesSearch && matchesCluster ? '' : 'none';
      });

      // Sort visible rows
      const visibleRows = rows.filter(r => r.style.display !== 'none');
      visibleRows.sort((a, b) => {
        const aName = a.getAttribute('data-project');
        const bName = b.getAttribute('data-project');
        const aProject = projects.find(p => p.name === aName) || {};
        const bProject = projects.find(p => p.name === bName) || {};

        switch(sortBy) {
          case 'health': return (bProject.health || 0) - (aProject.health || 0);
          case 'activity': return (bProject.activity || 0) - (aProject.activity || 0);
          case 'name': return aName.localeCompare(bName);
          default: return 0;
        }
      });

      visibleRows.forEach(row => tableBody.appendChild(row));
    }

    searchInput?.addEventListener('input', filterAndSort);
    sortSelect?.addEventListener('change', filterAndSort);
    filterSelect?.addEventListener('change', filterAndSort);

    // Auto-refresh every 5 minutes
    setTimeout(() => location.reload(), 5 * 60 * 1000);
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
  // Calculate basic metrics
  const activeProjects = shards.filter(s => s.metadata?.status === 'ACTIVE').length;
  const dormantProjects = shards.filter(s => s.metadata?.status === 'DORMANT').length;
  const driftAlerts = shards.filter(s => s.driftAlert).length;

  const totalAlignment = shards.reduce((sum, s) => sum + s.alignmentScore, 0);
  const precision = shards.length > 0 ? totalAlignment / shards.length : 0;

  // Calculate health metrics
  const totalHealthScore = shards.reduce((sum, s) => sum + (s.health?.score || 0), 0);
  const avgHealthScore = shards.length > 0 ? Math.round(totalHealthScore / shards.length) : 0;
  const avgHealthGrade = avgHealthScore >= 90 ? 'A' :
                         avgHealthScore >= 80 ? 'B' :
                         avgHealthScore >= 70 ? 'C' :
                         avgHealthScore >= 60 ? 'D' : 'F';

  // Calculate integration metrics
  const projectsWithCI = shards.filter(s => s.integrations?.hasCI).length;
  const projectsWithTests = shards.filter(s => s.integrations?.hasTests).length;
  const projectsWithDocker = shards.filter(s => s.integrations?.hasDocker).length;
  const projectsWithSupabase = shards.filter(s => s.integrations?.hasSupabase).length;
  const projectsDeployed = shards.filter(s => s.deployment?.platform && s.deployment.platform !== 'unknown').length;

  // Calculate health distribution
  const healthDistribution = {
    gradeA: shards.filter(s => s.health?.grade === 'A').length,
    gradeB: shards.filter(s => s.health?.grade === 'B').length,
    gradeC: shards.filter(s => s.health?.grade === 'C').length,
    gradeD: shards.filter(s => s.health?.grade === 'D').length,
    gradeF: shards.filter(s => !s.health?.grade || s.health?.grade === 'F').length
  };

  // Calculate activity summary
  const activitySummary = {
    highVelocity: shards.filter(s => s.activity?.commitVelocity === 'high').length,
    mediumVelocity: shards.filter(s => s.activity?.commitVelocity === 'medium').length,
    lowVelocity: shards.filter(s => s.activity?.commitVelocity === 'low').length,
    stale: shards.filter(s => !s.activity?.commitVelocity || s.activity?.commitVelocity === 'stale').length,
    totalCommits7d: shards.reduce((sum, s) => sum + (s.activity?.commits7d || 0), 0),
    totalCommits30d: shards.reduce((sum, s) => sum + (s.activity?.commits30d || 0), 0)
  };

  // Calculate tech stack summary
  const techStackSummary: DashboardConfig['techStackSummary'] = {
    languages: {},
    frameworks: {},
    databases: {}
  };

  for (const shard of shards) {
    if (shard.techStack) {
      for (const lang of shard.techStack.languages || []) {
        techStackSummary.languages[lang] = (techStackSummary.languages[lang] || 0) + 1;
      }
      for (const fw of shard.techStack.frameworks || []) {
        techStackSummary.frameworks[fw] = (techStackSummary.frameworks[fw] || 0) + 1;
      }
      for (const db of shard.techStack.databases || []) {
        techStackSummary.databases[db] = (techStackSummary.databases[db] || 0) + 1;
      }
    }
  }

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
    const avgHealthScore = projects.reduce((sum, p) => sum + (p.health?.score || 0), 0) / projects.length;
    return { name, projects, avgAlignment, avgHealthScore };
  });

  return {
    meta: {
      precision,
      active: activeProjects,
      dormant: dormantProjects,
      totalProjects: shards.length,
      driftAlerts,
      lastUpdated: new Date().toISOString(),
      avgHealthScore,
      avgHealthGrade,
      projectsWithCI,
      projectsWithTests,
      projectsWithDocker,
      projectsWithSupabase,
      projectsDeployed
    },
    projects: shards,
    clusters,
    techStackSummary,
    activitySummary,
    healthDistribution
  };
}
