/**
 * Dashboard Builder Skill
 * Builds React dashboard components and HTML visualizations
 * with AI-powered insights panel
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ProjectShard } from './shard-generator';

/**
 * AI-generated dashboard insights
 */
export interface AIInsightsPanel {
  dailyFocus: {
    priority: string;
    reasoning: string;
    estimatedImpact: 'high' | 'medium' | 'low';
  };
  trendAnalysis: {
    direction: 'improving' | 'stable' | 'declining';
    keyObservation: string;
    dataPoints: string[];
  };
  anomalyAlerts: Array<{
    type: 'positive' | 'negative' | 'neutral';
    project: string;
    observation: string;
  }>;
  motivationalNote: string;
  generatedAt: string;
}

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
  aiInsights?: AIInsightsPanel | null;
}

/**
 * Cache for AI insights to avoid repeated API calls
 */
const insightsCache = new Map<string, { insights: AIInsightsPanel; expiry: number }>();
const INSIGHTS_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

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
    ${config.aiInsights ? buildAIInsightsPanel(config.aiInsights) : ''}
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
 * Builds detailed projects table with expandable rows
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

    // Build tooltip content for intent cell
    const intentTooltip = project.lastIntent ? escapeHtml(project.lastIntent) : 'No intent recorded';

    // Health factors for detail row
    const factors = project.health?.factors || {};

    // Main row
    const mainRow = `
      <tr class="project-row ${project.driftAlert ? 'drift' : ''}" data-project="${project.project}">
        <td>
          <strong>${project.project}</strong>
          <span class="project-meta">${project.cluster}</span>
        </td>
        <td>
          <span class="health-grade grade-${healthGrade.toLowerCase()}" data-tooltip="Score: ${healthScore}/100">${healthGrade}</span>
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
          <span class="integration-badge ${hasCI === '✓' ? 'active' : ''}" data-tooltip="CI/CD Pipeline">CI</span>
          <span class="integration-badge ${hasTests === '✓' ? 'active' : ''}" data-tooltip="Test Suite">T</span>
          <span class="integration-badge ${deployment !== '-' ? 'active' : ''}" data-tooltip="${deployment !== '-' ? 'Deployed to ' + deployment : 'Not deployed'}">${deployment && deployment !== '-' ? deployment.slice(0, 2).toUpperCase() : 'D'}</span>
        </td>
        <td class="intent-cell" data-tooltip="${intentTooltip}">${escapeHtml(truncateText(project.lastIntent, 50))}</td>
      </tr>
    `;

    // Expandable detail row
    const detailRow = `
      <tr class="project-detail-row">
        <td colspan="7">
          <div class="project-detail-content">
            <div class="detail-section">
              <h4>Health Factors</h4>
              ${buildHealthFactorsList(factors)}
            </div>
            <div class="detail-section">
              <h4>Tech Stack</h4>
              <div class="detail-item">
                <span class="label">Primary</span>
                <span class="value">${project.techStack?.primaryLanguage || 'Unknown'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Languages</span>
                <span class="value">${project.techStack?.languages?.join(', ') || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Frameworks</span>
                <span class="value">${project.techStack?.frameworks?.join(', ') || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Databases</span>
                <span class="value">${project.techStack?.databases?.join(', ') || '-'}</span>
              </div>
            </div>
            <div class="detail-section">
              <h4>Activity</h4>
              <div class="detail-item">
                <span class="label">Commits (7d)</span>
                <span class="value">${project.activity?.commits7d || 0}</span>
              </div>
              <div class="detail-item">
                <span class="label">Commits (30d)</span>
                <span class="value">${project.activity?.commits30d || 0}</span>
              </div>
              <div class="detail-item">
                <span class="label">Last Commit</span>
                <span class="value">${project.activity?.lastCommitDate ? new Date(project.activity.lastCommitDate).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div class="detail-item">
                <span class="label">Velocity</span>
                <span class="value velocity-badge ${velocity}">${velocity}</span>
              </div>
            </div>
            <div class="detail-section">
              <h4>Last Intent</h4>
              <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                ${escapeHtml(project.lastIntent || 'No intent recorded')}
              </p>
              ${project.executionSummary ? `
                <p style="font-size: 0.85rem; color: var(--color-text-muted);">
                  <strong>Summary:</strong> ${escapeHtml(project.executionSummary)}
                </p>
              ` : ''}
              ${project.driftAlert ? `
                <p class="recommendation" style="margin-top: 0.5rem;">
                  Drift detected - alignment score: ${(project.alignmentScore * 100).toFixed(1)}%
                </p>
              ` : ''}
            </div>
          </div>
        </td>
      </tr>
    `;

    return mainRow + detailRow;
  }).join('');

  // Build unique cluster list for filter
  const clusters = [...new Set(projects.map(p => p.cluster))].sort();

  return `
    <section class="projects-section">
      <h2>All Projects</h2>
      <div class="quick-filters">
        <button class="quick-filter-btn active" data-filter="all">All <span class="filter-count">${projects.length}</span></button>
        <button class="quick-filter-btn" data-filter="active">Active <span class="filter-count">0</span></button>
        <button class="quick-filter-btn" data-filter="attention">Needs Attention <span class="filter-count">0</span></button>
        <button class="quick-filter-btn" data-filter="grade-a">Grade A <span class="filter-count">0</span></button>
        <button class="quick-filter-btn" data-filter="grade-b">Grade B <span class="filter-count">0</span></button>
        <button class="quick-filter-btn" data-filter="grade-c">Grade C <span class="filter-count">0</span></button>
        <button class="quick-filter-btn" data-filter="grade-df">Grade D/F <span class="filter-count">0</span></button>
      </div>
      <div class="table-controls">
        <input type="text" id="projectSearch" placeholder="Search projects..." class="search-input">
        <select id="sortBy" class="sort-select">
          <option value="health">Sort by Health</option>
          <option value="activity">Sort by Activity</option>
          <option value="name">Sort by Name</option>
          <option value="cluster">Sort by Cluster</option>
        </select>
        <select id="filterCluster" class="filter-select">
          <option value="">All Clusters</option>
          ${clusters.map(c => `<option value="${c}">${c}</option>`).join('')}
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
 * Builds health factors list for detail view
 */
function buildHealthFactorsList(factors: Record<string, number>): string {
  const factorLabels: Record<string, string> = {
    recency: 'Recency',
    activity: 'Activity',
    codeQuality: 'Code Quality',
    documentation: 'Documentation',
    testing: 'Testing',
    cicd: 'CI/CD',
    deployment: 'Deployment'
  };

  const factorColors: Record<string, string> = {
    recency: 'var(--color-accent)',
    activity: 'var(--color-grade-a)',
    codeQuality: 'var(--color-cluster-ai)',
    documentation: 'var(--color-cluster-learn)',
    testing: 'var(--color-cluster-api)',
    cicd: 'var(--color-cluster-dev)',
    deployment: 'var(--color-grade-b)'
  };

  return Object.entries(factors)
    .map(([key, value]) => {
      const label = factorLabels[key] || key;
      const color = factorColors[key] || 'var(--color-accent)';
      const percent = Math.round(value * 100);

      return `
        <div class="detail-item">
          <span class="label">${label}</span>
          <span class="value">${percent}%</span>
        </div>
        <div class="health-factor-bar">
          <div class="health-factor-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
      `;
    })
    .join('');
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
 * Builds AI insights panel for dashboard
 */
function buildAIInsightsPanel(insights: AIInsightsPanel): string {
  const trendIcon = {
    improving: '📈',
    stable: '📊',
    declining: '📉'
  }[insights.trendAnalysis.direction];

  const impactBadge = {
    high: '<span class="impact-badge impact-high">HIGH IMPACT</span>',
    medium: '<span class="impact-badge impact-medium">MEDIUM IMPACT</span>',
    low: '<span class="impact-badge impact-low">LOW IMPACT</span>'
  }[insights.dailyFocus.estimatedImpact];

  const anomalyCards = insights.anomalyAlerts.slice(0, 4).map(alert => {
    const icon = alert.type === 'positive' ? '✅' : alert.type === 'negative' ? '⚠️' : 'ℹ️';
    const typeClass = `anomaly-${alert.type}`;
    return `
      <div class="anomaly-card ${typeClass}">
        <span class="anomaly-icon">${icon}</span>
        <div class="anomaly-content">
          <strong>${escapeHtml(alert.project)}</strong>
          <p>${escapeHtml(alert.observation)}</p>
        </div>
      </div>
    `;
  }).join('');

  const dataPointsList = insights.trendAnalysis.dataPoints.slice(0, 3).map(point =>
    `<li>${escapeHtml(point)}</li>`
  ).join('');

  return `
    <section class="ai-insights-panel glass-card">
      <div class="ai-panel-header">
        <div class="ai-badge">
          <span class="ai-icon">🤖</span>
          <span class="ai-label">AI Insights</span>
        </div>
        <span class="ai-timestamp">Generated: ${new Date(insights.generatedAt).toLocaleString()}</span>
      </div>

      <div class="ai-panel-grid">
        <!-- Daily Focus Card -->
        <div class="ai-card daily-focus">
          <h3>🎯 Today's Focus</h3>
          <div class="focus-content">
            <p class="focus-priority">${escapeHtml(insights.dailyFocus.priority)}</p>
            ${impactBadge}
            <p class="focus-reasoning">${escapeHtml(insights.dailyFocus.reasoning)}</p>
          </div>
        </div>

        <!-- Trend Analysis Card -->
        <div class="ai-card trend-analysis">
          <h3>${trendIcon} Portfolio Trend: ${capitalize(insights.trendAnalysis.direction)}</h3>
          <p class="trend-observation">${escapeHtml(insights.trendAnalysis.keyObservation)}</p>
          <ul class="trend-data-points">
            ${dataPointsList}
          </ul>
        </div>

        <!-- Anomaly Alerts -->
        <div class="ai-card anomaly-alerts">
          <h3>🔔 Notable Changes</h3>
          <div class="anomaly-grid">
            ${anomalyCards || '<p class="no-anomalies">No notable changes detected.</p>'}
          </div>
        </div>

        <!-- Motivational Note -->
        <div class="ai-card motivational">
          <div class="motivational-content">
            <span class="motivational-icon">💡</span>
            <p>${escapeHtml(insights.motivationalNote)}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Capitalizes first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generates AI insights for dashboard using Claude API
 * Cached for 4 hours to optimize API costs
 * @param config - Dashboard configuration
 * @returns AI insights or null if API unavailable
 */
export async function generateDashboardInsights(
  config: DashboardConfig
): Promise<AIInsightsPanel | null> {
  // Check cache first
  const cacheKey = `insights:${config.meta.totalProjects}:${config.meta.avgHealthScore.toFixed(0)}`;
  const cached = insightsCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.insights;
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[dashboard-builder] ANTHROPIC_API_KEY not set, skipping AI insights');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = buildInsightsPrompt(config);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return null;
    }

    // Parse JSON response
    const insights = parseInsightsResponse(textBlock.text);

    // Cache the result
    insightsCache.set(cacheKey, {
      insights,
      expiry: Date.now() + INSIGHTS_CACHE_TTL_MS
    });

    return insights;
  } catch (error) {
    console.error('[dashboard-builder] Claude API error:', error);
    return null;
  }
}

/**
 * Builds the Claude prompt for dashboard insights
 */
function buildInsightsPrompt(config: DashboardConfig): string {
  const topProjects = config.projects
    .filter(p => p.health?.score !== undefined)
    .sort((a, b) => (b.health?.score || 0) - (a.health?.score || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.project,
      health: p.health?.score || 0,
      grade: p.health?.grade || 'F',
      velocity: p.activity?.commitVelocity || 'unknown',
      commits7d: p.activity?.commits7d || 0
    }));

  const needsAttention = config.projects
    .filter(p => p.driftAlert || (p.health?.score !== undefined && p.health.score < 60))
    .slice(0, 5)
    .map(p => ({
      name: p.project,
      health: p.health?.score || 0,
      issue: p.driftAlert ? 'drift' : 'low_health'
    }));

  return `You are an AI assistant providing daily insights for a software developer's project portfolio dashboard.

## Portfolio Status
- Total Projects: ${config.meta.totalProjects}
- Active: ${config.meta.active}, Dormant: ${config.meta.dormant}
- Average Health: ${config.meta.avgHealthScore.toFixed(0)}/100 (Grade ${config.meta.avgHealthGrade})
- Drift Alerts: ${config.meta.driftAlerts}
- Commits (7d): ${config.activitySummary.totalCommits7d}

## Health Distribution
- Grade A: ${config.healthDistribution.gradeA}
- Grade B: ${config.healthDistribution.gradeB}
- Grade C: ${config.healthDistribution.gradeC}
- Grade D: ${config.healthDistribution.gradeD}
- Grade F: ${config.healthDistribution.gradeF}

## Activity
- High Velocity: ${config.activitySummary.highVelocity}
- Medium: ${config.activitySummary.mediumVelocity}
- Low: ${config.activitySummary.lowVelocity}
- Stale: ${config.activitySummary.stale}

## Top Projects
${JSON.stringify(topProjects, null, 2)}

## Needs Attention
${JSON.stringify(needsAttention, null, 2)}

## Task
Generate actionable daily insights for this developer. Be concise, supportive, and specific.

Respond ONLY with valid JSON in this exact format:
{
  "dailyFocus": {
    "priority": "One specific, actionable task for today",
    "reasoning": "Brief explanation why this matters",
    "estimatedImpact": "high|medium|low"
  },
  "trendAnalysis": {
    "direction": "improving|stable|declining",
    "keyObservation": "One sentence about portfolio trajectory",
    "dataPoints": ["observation1", "observation2", "observation3"]
  },
  "anomalyAlerts": [
    {
      "type": "positive|negative|neutral",
      "project": "project_name",
      "observation": "What changed or stands out"
    }
  ],
  "motivationalNote": "Brief encouraging message tailored to their portfolio state"
}

Guidelines:
- Keep dailyFocus to ONE specific task
- anomalyAlerts should highlight 2-4 notable changes
- Be encouraging but honest
- Tailor the motivational note to their actual situation`;
}

/**
 * Parses Claude's response into AIInsightsPanel
 */
function parseInsightsResponse(response: string): AIInsightsPanel {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      dailyFocus: {
        priority: String(parsed.dailyFocus?.priority || 'Review your most active projects'),
        reasoning: String(parsed.dailyFocus?.reasoning || 'Stay on top of your development momentum'),
        estimatedImpact: ['high', 'medium', 'low'].includes(parsed.dailyFocus?.estimatedImpact)
          ? parsed.dailyFocus.estimatedImpact
          : 'medium'
      },
      trendAnalysis: {
        direction: ['improving', 'stable', 'declining'].includes(parsed.trendAnalysis?.direction)
          ? parsed.trendAnalysis.direction
          : 'stable',
        keyObservation: String(parsed.trendAnalysis?.keyObservation || 'Portfolio is in a stable state'),
        dataPoints: Array.isArray(parsed.trendAnalysis?.dataPoints)
          ? parsed.trendAnalysis.dataPoints.slice(0, 5).map(String)
          : []
      },
      anomalyAlerts: Array.isArray(parsed.anomalyAlerts)
        ? parsed.anomalyAlerts.slice(0, 6).map((a: Record<string, unknown>) => ({
            type: ['positive', 'negative', 'neutral'].includes(a.type as string)
              ? a.type as 'positive' | 'negative' | 'neutral'
              : 'neutral',
            project: String(a.project || 'Unknown'),
            observation: String(a.observation || '')
          }))
        : [],
      motivationalNote: String(parsed.motivationalNote || 'Keep building amazing projects!'),
      generatedAt: new Date().toISOString()
    };
  } catch {
    return {
      dailyFocus: {
        priority: 'Review your portfolio dashboard',
        reasoning: 'Regular reviews help maintain project health',
        estimatedImpact: 'medium'
      },
      trendAnalysis: {
        direction: 'stable',
        keyObservation: 'Portfolio status analysis in progress',
        dataPoints: []
      },
      anomalyAlerts: [],
      motivationalNote: 'Every line of code moves you forward!',
      generatedAt: new Date().toISOString()
    };
  }
}

/**
 * Clears the AI insights cache
 */
export function clearInsightsCache(): void {
  insightsCache.clear();
}

/**
 * Returns CSS styles for dashboard
 */
function getDashboardStyles(): string {
  return `
    /* ============================================
       CSS Custom Properties (Design Tokens)
       ============================================ */
    :root {
      /* Colors - WCAG AA Compliant */
      --color-bg-dark: #0a0e1a;
      --color-bg-primary: rgba(20, 25, 51, 0.7);
      --color-bg-secondary: rgba(15, 20, 40, 0.8);
      --color-glass: rgba(20, 25, 51, 0.6);
      --color-glass-border: rgba(0, 217, 255, 0.2);
      --color-glass-border-hover: rgba(0, 217, 255, 0.4);

      /* Accent colors */
      --color-accent: #00d9ff;
      --color-accent-glow: rgba(0, 217, 255, 0.3);
      --color-text-primary: #e8ecf2;
      --color-text-secondary: #8b9ab8;
      --color-text-muted: #5a6a80;

      /* Grade colors - WCAG AA verified */
      --color-grade-a: #22c55e;
      --color-grade-b: #84cc16;
      --color-grade-c: #eab308;
      --color-grade-d: #f97316;
      --color-grade-f: #dc2626;

      /* Cluster colors */
      --color-cluster-web: #3b82f6;
      --color-cluster-ai: #8b5cf6;
      --color-cluster-learn: #10b981;
      --color-cluster-api: #f59e0b;
      --color-cluster-dev: #6366f1;

      /* Spacing */
      --space-xs: 0.25rem;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 1.5rem;
      --space-xl: 2rem;
      --space-2xl: 3rem;

      /* Border radius */
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-xl: 20px;

      /* Transitions */
      --transition-fast: 150ms ease;
      --transition-normal: 250ms ease;
      --transition-slow: 400ms ease;

      /* Shadows */
      --shadow-glow: 0 0 20px var(--color-accent-glow);
      --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
      --shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    /* ============================================
       Base Styles & Reset
       ============================================ */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg-dark);
      background-image:
        radial-gradient(ellipse at 20% 30%, rgba(0, 217, 255, 0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
      color: var(--color-text-primary);
      padding: var(--space-xl);
      line-height: 1.6;
      min-height: 100vh;
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    .dashboard { max-width: 1440px; margin: 0 auto; }

    /* ============================================
       Glassmorphism Card Base
       ============================================ */
    .glass-card {
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--color-glass-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      transition: all var(--transition-normal);
    }

    .glass-card:hover {
      border-color: var(--color-glass-border-hover);
      box-shadow: var(--shadow-elevated), var(--shadow-glow);
      transform: translateY(-2px);
    }

    /* ============================================
       Rich Tooltip System
       ============================================ */
    [data-tooltip] {
      position: relative;
      cursor: help;
    }

    [data-tooltip]::before,
    [data-tooltip]::after {
      position: absolute;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: all var(--transition-normal);
      z-index: 1000;
    }

    [data-tooltip]::before {
      content: attr(data-tooltip);
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      padding: var(--space-sm) var(--space-md);
      background: rgba(10, 14, 26, 0.98);
      backdrop-filter: blur(16px);
      border: 1px solid var(--color-glass-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.85rem;
      font-weight: 400;
      white-space: nowrap;
      max-width: 320px;
      box-shadow: var(--shadow-elevated);
    }

    [data-tooltip]::after {
      content: '';
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: rgba(10, 14, 26, 0.98);
    }

    [data-tooltip]:hover::before,
    [data-tooltip]:hover::after {
      opacity: 1;
      visibility: visible;
    }

    [data-tooltip]:hover::before {
      transform: translateX(-50%) translateY(0);
    }

    /* Multi-line tooltips */
    [data-tooltip-multiline]::before {
      white-space: pre-line;
      text-align: left;
      line-height: 1.5;
    }

    /* Tooltip positions */
    [data-tooltip-pos="right"]::before {
      bottom: auto;
      left: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%) translateX(-8px);
    }

    [data-tooltip-pos="right"]::after {
      bottom: auto;
      left: calc(100% + 4px);
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-right-color: rgba(10, 14, 26, 0.98);
    }

    [data-tooltip-pos="right"]:hover::before {
      transform: translateY(-50%) translateX(0);
    }

    /* ============================================
       Header Styles
       ============================================ */
    .dashboard-header {
      text-align: center;
      margin-bottom: var(--space-2xl);
      padding: var(--space-xl);
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--color-glass-border);
      border-radius: var(--radius-xl);
      animation: slideDown var(--transition-slow) ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dashboard-header h1 {
      font-size: 2.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--color-accent) 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: var(--space-sm);
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: var(--color-text-secondary);
      font-size: 1.1rem;
      font-weight: 400;
    }

    .last-updated {
      margin-top: var(--space-md);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    /* ============================================
       Metrics Panel
       ============================================ */
    .metrics-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .metric-card {
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      padding: var(--space-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
      text-align: center;
      transition: all var(--transition-normal);
      animation: fadeInUp var(--transition-slow) ease-out both;
    }

    .metric-card:nth-child(1) { animation-delay: 50ms; }
    .metric-card:nth-child(2) { animation-delay: 100ms; }
    .metric-card:nth-child(3) { animation-delay: 150ms; }
    .metric-card:nth-child(4) { animation-delay: 200ms; }
    .metric-card:nth-child(5) { animation-delay: 250ms; }
    .metric-card:nth-child(6) { animation-delay: 300ms; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .metric-card:hover {
      transform: translateY(-4px);
      border-color: var(--color-glass-border-hover);
      box-shadow: var(--shadow-elevated), var(--shadow-glow);
    }

    .metric-card.alert {
      border-color: var(--color-grade-f);
      background: linear-gradient(135deg, var(--color-glass), rgba(220, 38, 38, 0.15));
    }

    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--color-accent);
      margin-bottom: var(--space-xs);
      transition: transform var(--transition-fast);
    }

    .metric-card:hover .metric-value {
      transform: scale(1.05);
    }

    .metric-label {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    h2 {
      font-size: 1.6rem;
      font-weight: 600;
      color: var(--color-accent);
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-sm);
      border-bottom: 2px solid var(--color-glass-border);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    h2::before {
      content: '';
      width: 4px;
      height: 1.2em;
      background: var(--color-accent);
      border-radius: 2px;
    }

    /* ============================================
       Clusters Section
       ============================================ */
    .clusters-section { margin-bottom: var(--space-2xl); }

    .clusters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-lg);
    }

    .cluster-card {
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      padding: var(--space-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
      transition: all var(--transition-normal);
    }

    .cluster-card:hover {
      border-color: var(--color-glass-border-hover);
      box-shadow: var(--shadow-elevated);
    }

    .cluster-card[data-cluster="Web Apps"] { border-left: 4px solid var(--color-cluster-web); }
    .cluster-card[data-cluster="AI & ML"] { border-left: 4px solid var(--color-cluster-ai); }
    .cluster-card[data-cluster="Learning Tools"] { border-left: 4px solid var(--color-cluster-learn); }
    .cluster-card[data-cluster="APIs & Services"] { border-left: 4px solid var(--color-cluster-api); }
    .cluster-card[data-cluster="Developer Tools"] { border-left: 4px solid var(--color-cluster-dev); }

    .cluster-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-sm);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .cluster-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .cluster-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--space-md);
      padding-bottom: var(--space-sm);
      border-bottom: 1px solid var(--color-glass-border);
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .alignment-score { color: var(--color-grade-a); }

    .cluster-projects {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .mini-project-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .mini-project-card:hover {
      background: rgba(0, 217, 255, 0.1);
      transform: translateX(4px);
    }

    .mini-project-card.drift-alert {
      border-left: 3px solid var(--color-grade-f);
    }

    .project-score { color: var(--color-grade-a); font-weight: 600; }

    /* ============================================
       Projects Table - Enhanced
       ============================================ */
    .projects-table {
      width: 100%;
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
    }

    .projects-table thead {
      background: var(--color-bg-secondary);
    }

    .projects-table th {
      padding: var(--space-md) var(--space-lg);
      text-align: left;
      color: var(--color-accent);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--color-glass-border);
    }

    .projects-table td {
      padding: var(--space-md) var(--space-lg);
      border-top: 1px solid var(--color-glass-border);
      vertical-align: middle;
    }

    .projects-table tbody tr {
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .projects-table tbody tr:hover {
      background: rgba(0, 217, 255, 0.05);
    }

    .projects-table tbody tr.expanded {
      background: rgba(0, 217, 255, 0.08);
    }

    .projects-table tr.drift {
      background: linear-gradient(90deg, rgba(220, 38, 38, 0.1), transparent);
    }

    /* Expandable Project Detail Row */
    .project-detail-row {
      display: none;
    }

    .project-detail-row.visible {
      display: table-row;
      animation: slideDown var(--transition-normal) ease-out;
    }

    .project-detail-row td {
      padding: 0;
      background: var(--color-bg-secondary);
    }

    .project-detail-content {
      padding: var(--space-lg);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-lg);
    }

    .detail-section {
      background: var(--color-glass);
      padding: var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-glass-border);
    }

    .detail-section h4 {
      color: var(--color-accent);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: var(--space-sm);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-section .detail-item {
      display: flex;
      justify-content: space-between;
      padding: var(--space-xs) 0;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .detail-section .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item .label {
      color: var(--color-text-secondary);
    }

    .detail-item .value {
      color: var(--color-text-primary);
      font-weight: 500;
    }

    /* Health Factor Bars in Detail */
    .health-factor-bar {
      height: 6px;
      background: var(--color-bg-dark);
      border-radius: 3px;
      overflow: hidden;
      margin-top: var(--space-xs);
    }

    .health-factor-fill {
      height: 100%;
      border-radius: 3px;
      transition: width var(--transition-slow);
    }

    .status-badge {
      display: inline-block;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.active {
      background: var(--color-grade-a);
      color: var(--color-bg-dark);
    }

    .status-badge.dormant {
      background: var(--color-text-muted);
      color: var(--color-text-primary);
    }

    .alignment-bar-container {
      position: relative;
      background: var(--color-bg-dark);
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
    }

    .alignment-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, var(--color-accent), var(--color-grade-a));
      transition: width var(--transition-slow);
    }

    .alignment-text {
      position: relative;
      display: block;
      line-height: 24px;
      text-align: center;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary);
      z-index: 1;
    }

    .drift-indicator {
      color: var(--color-grade-f);
      font-weight: 600;
    }

    .intent-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.9rem;
      color: var(--color-text-secondary);
    }

    .intent-cell[data-tooltip] {
      cursor: pointer;
    }

    .source-badge {
      display: inline-block;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .source-badge.agent_swarm {
      background: var(--color-accent);
      color: var(--color-bg-dark);
    }

    .source-badge.manual_override {
      background: var(--color-grade-c);
      color: var(--color-bg-dark);
    }

    /* ============================================
       Drift Alerts Section
       ============================================ */
    .drift-alerts-section { margin-top: var(--space-2xl); }

    .no-alerts {
      text-align: center;
      padding: var(--space-2xl);
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
    }

    .success-icon {
      font-size: 3rem;
      color: var(--color-grade-a);
      margin-bottom: var(--space-md);
    }

    .drift-alerts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: var(--space-lg);
    }

    .drift-alert-card {
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), var(--color-glass));
      backdrop-filter: blur(20px);
      border: 2px solid var(--color-grade-f);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      transition: all var(--transition-normal);
    }

    .drift-alert-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(220, 38, 38, 0.2);
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-md);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid rgba(220, 38, 38, 0.3);
    }

    .alert-header h4 {
      font-size: 1.1rem;
      color: var(--color-grade-f);
      font-weight: 600;
    }

    .alert-score {
      font-weight: 600;
      color: var(--color-grade-c);
    }

    .alert-body p {
      margin-bottom: var(--space-sm);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
    }

    .recommendation {
      margin-top: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      background: rgba(220, 38, 38, 0.1);
      border-left: 3px solid var(--color-grade-f);
      color: var(--color-grade-c);
      font-weight: 500;
      font-size: 0.9rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    /* ============================================
       AI Insights Panel
       ============================================ */
    .ai-insights-panel {
      margin: var(--space-xl) 0;
      padding: var(--space-xl);
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), var(--color-glass));
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .ai-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    .ai-badge {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-md);
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: var(--radius-xl);
    }

    .ai-icon {
      font-size: 1.2rem;
    }

    .ai-label {
      font-weight: 600;
      color: #a78bfa;
      letter-spacing: 0.5px;
    }

    .ai-timestamp {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .ai-panel-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-lg);
    }

    .ai-card {
      background: rgba(15, 20, 40, 0.6);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      transition: all var(--transition-normal);
    }

    .ai-card:hover {
      border-color: rgba(139, 92, 246, 0.4);
      transform: translateY(-2px);
    }

    .ai-card h3 {
      font-size: 1rem;
      color: var(--color-text-primary);
      margin-bottom: var(--space-md);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    /* Daily Focus Card */
    .daily-focus {
      grid-column: span 2;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(15, 20, 40, 0.6));
      border-color: rgba(59, 130, 246, 0.3);
    }

    .focus-priority {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-sm);
    }

    .impact-badge {
      display: inline-block;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-right: var(--space-sm);
    }

    .impact-high {
      background: rgba(34, 197, 94, 0.2);
      color: var(--color-grade-a);
      border: 1px solid rgba(34, 197, 94, 0.4);
    }

    .impact-medium {
      background: rgba(234, 179, 8, 0.2);
      color: var(--color-grade-c);
      border: 1px solid rgba(234, 179, 8, 0.4);
    }

    .impact-low {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      border: 1px solid rgba(139, 92, 246, 0.4);
    }

    .focus-reasoning {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      margin-top: var(--space-sm);
    }

    /* Trend Analysis Card */
    .trend-observation {
      color: var(--color-text-secondary);
      font-size: 0.95rem;
      margin-bottom: var(--space-md);
    }

    .trend-data-points {
      list-style: none;
      padding: 0;
    }

    .trend-data-points li {
      padding: var(--space-xs) 0;
      padding-left: var(--space-md);
      position: relative;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .trend-data-points li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--color-accent);
    }

    /* Anomaly Alerts Card */
    .anomaly-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .anomaly-card {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      background: rgba(20, 25, 51, 0.4);
    }

    .anomaly-positive {
      border-left: 3px solid var(--color-grade-a);
    }

    .anomaly-negative {
      border-left: 3px solid var(--color-grade-d);
    }

    .anomaly-neutral {
      border-left: 3px solid var(--color-accent);
    }

    .anomaly-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .anomaly-content strong {
      color: var(--color-text-primary);
      font-size: 0.85rem;
    }

    .anomaly-content p {
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      margin-top: var(--space-xs);
    }

    .no-anomalies {
      color: var(--color-text-muted);
      font-style: italic;
      font-size: 0.9rem;
    }

    /* Motivational Card */
    .motivational {
      grid-column: span 2;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 20, 40, 0.6));
      border-color: rgba(16, 185, 129, 0.3);
    }

    .motivational-content {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .motivational-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .motivational-content p {
      font-size: 1rem;
      color: var(--color-text-primary);
      font-style: italic;
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .ai-panel-grid {
        grid-template-columns: 1fr;
      }
      .daily-focus,
      .motivational {
        grid-column: span 1;
      }
    }

    .project-meta {
      display: inline-block;
      margin-left: var(--space-sm);
      padding: var(--space-xs) var(--space-sm);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    /* Enhanced Styles */
    .metric-card.highlight {
      background: linear-gradient(135deg, var(--color-glass), rgba(0, 217, 255, 0.1));
      border: 2px solid var(--color-accent);
    }

    .metric-sub {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    /* ============================================
       Health Overview
       ============================================ */
    .health-overview {
      margin-bottom: var(--space-2xl);
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
    }

    .health-grid {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: var(--space-xl);
      align-items: center;
    }

    .grade-bar {
      display: flex;
      height: 48px;
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .grade-segment {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-width: 48px;
      transition: all var(--transition-normal);
      cursor: pointer;
    }

    .grade-segment:hover {
      filter: brightness(1.15);
      transform: scaleY(1.05);
    }

    .grade-segment.grade-a { background: var(--color-grade-a); color: var(--color-bg-dark); }
    .grade-segment.grade-b { background: var(--color-grade-b); color: var(--color-bg-dark); }
    .grade-segment.grade-c { background: var(--color-grade-c); color: var(--color-bg-dark); }
    .grade-segment.grade-d { background: var(--color-grade-d); color: var(--color-bg-dark); }
    .grade-segment.grade-f { background: var(--color-grade-f); color: white; }

    .grade-label { font-weight: 700; font-size: 1rem; }
    .grade-count { font-size: 0.75rem; opacity: 0.9; }

    .health-legend { font-size: 0.85rem; }
    .legend-item {
      margin-bottom: var(--space-sm);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--color-text-secondary);
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.grade-a { background: var(--color-grade-a); }
    .dot.grade-b { background: var(--color-grade-b); }
    .dot.grade-c { background: var(--color-grade-c); }
    .dot.grade-d { background: var(--color-grade-d); }
    .dot.grade-f { background: var(--color-grade-f); }

    /* ============================================
       Tech Stack & Activity Panels
       ============================================ */
    .tech-stack-panel, .activity-panel {
      margin-bottom: var(--space-2xl);
      background: var(--color-glass);
      backdrop-filter: blur(20px);
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-glass-border);
    }

    .tech-grid, .activity-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
    }

    .tech-category h3, .velocity-breakdown h3 {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      text-transform: uppercase;
      margin-bottom: var(--space-md);
      letter-spacing: 0.5px;
    }

    .tech-bars, .velocity-bars { display: flex; flex-direction: column; gap: var(--space-sm); }

    .tech-bar-row, .velocity-row {
      display: grid;
      grid-template-columns: 100px 1fr 40px;
      align-items: center;
      gap: var(--space-md);
    }

    .tech-name, .velocity-label {
      font-size: 0.85rem;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tech-bar-track, .velocity-track {
      height: 8px;
      background: var(--color-bg-dark);
      border-radius: 4px;
      overflow: hidden;
    }

    .tech-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width var(--transition-slow);
    }

    .tech-bar-fill.lang { background: linear-gradient(90deg, var(--color-accent), var(--color-grade-a)); }
    .tech-bar-fill.framework { background: linear-gradient(90deg, #a855f7, #ec4899); }
    .tech-count, .velocity-count { font-size: 0.85rem; color: var(--color-text-muted); text-align: right; }

    .velocity-fill { height: 100%; border-radius: 4px; }
    .velocity-fill.high { background: var(--color-grade-a); }
    .velocity-fill.medium { background: var(--color-grade-c); }
    .velocity-fill.low { background: var(--color-grade-d); }
    .velocity-fill.stale { background: var(--color-text-muted); }

    /* Activity Stats */
    .activity-stats {
      display: flex;
      gap: var(--space-lg);
    }

    .activity-stat {
      text-align: center;
      padding: var(--space-lg);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-md);
      flex: 1;
      transition: all var(--transition-normal);
    }

    .activity-stat:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-glow);
    }

    .stat-value { font-size: 2rem; font-weight: 700; color: var(--color-accent); }
    .stat-label { font-size: 0.85rem; color: var(--color-text-secondary); margin-top: var(--space-xs); }

    /* ============================================
       Table Controls - Enhanced
       ============================================ */
    .table-controls {
      display: flex;
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
      flex-wrap: wrap;
    }

    .search-input, .sort-select, .filter-select {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-glass);
      backdrop-filter: blur(12px);
      border: 1px solid var(--color-glass-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.9rem;
      transition: all var(--transition-fast);
    }

    .search-input { flex: 1; min-width: 200px; }
    .search-input:focus, .sort-select:focus, .filter-select:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: var(--shadow-glow);
    }

    /* Quick Filter Buttons */
    .quick-filters {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-md);
    }

    .quick-filter-btn {
      padding: var(--space-xs) var(--space-md);
      background: var(--color-glass);
      border: 1px solid var(--color-glass-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .quick-filter-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .quick-filter-btn.active {
      background: var(--color-accent);
      color: var(--color-bg-dark);
      border-color: var(--color-accent);
    }

    /* Health Grade in Table */
    .health-grade {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: 0.9rem;
      transition: transform var(--transition-fast);
    }

    .health-grade:hover {
      transform: scale(1.1);
    }

    .health-grade.grade-a { background: var(--color-grade-a); color: var(--color-bg-dark); }
    .health-grade.grade-b { background: var(--color-grade-b); color: var(--color-bg-dark); }
    .health-grade.grade-c { background: var(--color-grade-c); color: var(--color-bg-dark); }
    .health-grade.grade-d { background: var(--color-grade-d); color: var(--color-bg-dark); }
    .health-grade.grade-f { background: var(--color-grade-f); color: white; }

    .health-score-small { font-size: 0.75rem; color: var(--color-text-muted); margin-left: var(--space-sm); }

    /* Velocity Badge */
    .velocity-badge {
      display: inline-block;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .velocity-badge.high { background: var(--color-grade-a); color: var(--color-bg-dark); }
    .velocity-badge.medium { background: var(--color-grade-c); color: var(--color-bg-dark); }
    .velocity-badge.low { background: var(--color-grade-d); color: var(--color-bg-dark); }
    .velocity-badge.stale { background: var(--color-text-muted); color: var(--color-text-primary); }

    .commit-count { font-size: 0.75rem; color: var(--color-text-muted); margin-left: var(--space-sm); }

    /* Tech Cell */
    .tech-cell .primary-tech { font-weight: 500; color: var(--color-text-primary); }
    .tech-cell .frameworks { display: block; font-size: 0.75rem; color: var(--color-text-muted); }

    /* Integration Badges */
    .integrations-cell { white-space: nowrap; }
    .integration-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xs);
      margin-right: var(--space-xs);
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      font-weight: 700;
      background: var(--color-bg-secondary);
      color: var(--color-text-muted);
      min-width: 24px;
      height: 22px;
      transition: all var(--transition-fast);
    }

    .integration-badge.active {
      background: var(--color-grade-a);
      color: var(--color-bg-dark);
    }

    /* Project Grade in Clusters */
    .project-grade {
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .project-grade.grade-a { background: var(--color-grade-a); color: var(--color-bg-dark); }
    .project-grade.grade-b { background: var(--color-grade-b); color: var(--color-bg-dark); }
    .project-grade.grade-c { background: var(--color-grade-c); color: var(--color-bg-dark); }
    .project-grade.grade-d { background: var(--color-grade-d); color: var(--color-bg-dark); }
    .project-grade.grade-f { background: var(--color-grade-f); color: white; }

    .health-score { color: var(--color-grade-a); }
    .more-projects {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      text-align: center;
      padding: var(--space-sm);
    }

    /* ============================================
       Responsive Design
       ============================================ */
    @media (max-width: 1024px) {
      .health-grid { grid-template-columns: 1fr; }
      .tech-grid, .activity-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      body { padding: var(--space-md); }
      .dashboard-header h1 { font-size: 2rem; }
      .table-controls { flex-direction: column; }
      .projects-table { font-size: 0.85rem; }
      .projects-table th, .projects-table td { padding: var(--space-sm); }
      .quick-filters { flex-wrap: wrap; }
      .drift-alerts-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 480px) {
      .metrics-panel { grid-template-columns: 1fr 1fr; }
      .metric-value { font-size: 1.8rem; }
      .clusters-grid { grid-template-columns: 1fr; }
    }
  `;
}

/**
 * Returns JavaScript for dashboard interactivity
 */
function getDashboardScripts(config: DashboardConfig): string {
  // Build detailed project data for expandable rows
  const projectDetails = config.projects.map(p => ({
    name: p.project,
    cluster: p.cluster,
    health: p.health?.score || 0,
    grade: p.health?.grade || 'F',
    activity: p.activity?.commits7d || 0,
    commits30d: p.activity?.commits30d || 0,
    velocity: p.activity?.commitVelocity || 'stale',
    status: p.metadata?.status || 'UNKNOWN',
    techStack: p.techStack || {},
    integrations: p.integrations || {},
    deployment: p.deployment || {},
    lastIntent: p.lastIntent || '',
    executionSummary: p.executionSummary || '',
    healthFactors: p.health?.factors || {},
    driftAlert: p.driftAlert || false,
    alignmentScore: p.alignmentScore || 0
  }));

  return `
    console.log('Portfolio Cognitive Command Dashboard v2.0 loaded');

    // Project data for filtering/sorting/expanding
    const projects = ${JSON.stringify(projectDetails)};

    // DOM Elements
    const searchInput = document.getElementById('projectSearch');
    const sortSelect = document.getElementById('sortBy');
    const filterSelect = document.getElementById('filterCluster');
    const tableBody = document.getElementById('projectsTableBody');

    // State
    let activeQuickFilter = 'all';
    let expandedProject = null;

    // Initialize quick filter buttons
    function initQuickFilters() {
      const container = document.querySelector('.quick-filters');
      if (!container) return;

      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-filter-btn');
        if (!btn) return;

        // Update active state
        container.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeQuickFilter = btn.dataset.filter;
        filterAndSort();
      });
    }

    // Main filter/sort function
    function filterAndSort() {
      const searchTerm = (searchInput?.value || '').toLowerCase();
      const sortBy = sortSelect?.value || 'health';
      const filterCluster = filterSelect?.value || '';

      const rows = Array.from(tableBody?.querySelectorAll('tr.project-row') || []);

      rows.forEach(row => {
        const projectName = (row.getAttribute('data-project') || '').toLowerCase();
        const project = projects.find(p => p.name === row.getAttribute('data-project')) || {};
        const cluster = project.cluster || '';
        const grade = project.grade || 'F';
        const status = project.status || '';

        // Search filter
        const matchesSearch = !searchTerm || projectName.includes(searchTerm) ||
                             cluster.toLowerCase().includes(searchTerm);

        // Cluster filter
        const matchesCluster = !filterCluster || cluster === filterCluster;

        // Quick filter
        let matchesQuickFilter = true;
        switch(activeQuickFilter) {
          case 'active':
            matchesQuickFilter = status === 'ACTIVE';
            break;
          case 'attention':
            matchesQuickFilter = project.driftAlert || project.health < 70;
            break;
          case 'grade-a':
            matchesQuickFilter = grade === 'A';
            break;
          case 'grade-b':
            matchesQuickFilter = grade === 'B';
            break;
          case 'grade-c':
            matchesQuickFilter = grade === 'C';
            break;
          case 'grade-df':
            matchesQuickFilter = grade === 'D' || grade === 'F';
            break;
        }

        const visible = matchesSearch && matchesCluster && matchesQuickFilter;
        row.style.display = visible ? '' : 'none';

        // Hide detail row if main row is hidden
        const detailRow = row.nextElementSibling;
        if (detailRow?.classList.contains('project-detail-row') && !visible) {
          detailRow.classList.remove('visible');
        }
      });

      // Sort visible rows
      const visibleRows = rows.filter(r => r.style.display !== 'none');
      visibleRows.sort((a, b) => {
        const aProject = projects.find(p => p.name === a.getAttribute('data-project')) || {};
        const bProject = projects.find(p => p.name === b.getAttribute('data-project')) || {};

        switch(sortBy) {
          case 'health': return (bProject.health || 0) - (aProject.health || 0);
          case 'activity': return (bProject.activity || 0) - (aProject.activity || 0);
          case 'name': return (aProject.name || '').localeCompare(bProject.name || '');
          case 'cluster': return (aProject.cluster || '').localeCompare(bProject.cluster || '');
          default: return 0;
        }
      });

      visibleRows.forEach(row => {
        const detailRow = row.nextElementSibling;
        tableBody.appendChild(row);
        if (detailRow?.classList.contains('project-detail-row')) {
          tableBody.appendChild(detailRow);
        }
      });

      updateFilterCounts();
    }

    // Update quick filter counts
    function updateFilterCounts() {
      const counts = {
        all: projects.length,
        active: projects.filter(p => p.status === 'ACTIVE').length,
        attention: projects.filter(p => p.driftAlert || p.health < 70).length,
        'grade-a': projects.filter(p => p.grade === 'A').length,
        'grade-b': projects.filter(p => p.grade === 'B').length,
        'grade-c': projects.filter(p => p.grade === 'C').length,
        'grade-df': projects.filter(p => p.grade === 'D' || p.grade === 'F').length
      };

      document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        const countSpan = btn.querySelector('.filter-count');
        if (countSpan && counts[filter] !== undefined) {
          countSpan.textContent = counts[filter];
        }
      });
    }

    // Click-to-expand project details
    function initExpandableRows() {
      tableBody?.addEventListener('click', (e) => {
        const row = e.target.closest('tr.project-row');
        if (!row) return;

        const projectName = row.getAttribute('data-project');
        const detailRow = row.nextElementSibling;

        // Close previously expanded
        if (expandedProject && expandedProject !== projectName) {
          const prevRow = tableBody.querySelector(\`tr[data-project="\${expandedProject}"]\`);
          const prevDetail = prevRow?.nextElementSibling;
          prevRow?.classList.remove('expanded');
          prevDetail?.classList.remove('visible');
        }

        // Toggle current
        if (detailRow?.classList.contains('project-detail-row')) {
          const isExpanding = !detailRow.classList.contains('visible');
          row.classList.toggle('expanded', isExpanding);
          detailRow.classList.toggle('visible', isExpanding);
          expandedProject = isExpanding ? projectName : null;
        }
      });

      // Keyboard navigation - Escape to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && expandedProject) {
          const row = tableBody?.querySelector(\`tr[data-project="\${expandedProject}"]\`);
          const detailRow = row?.nextElementSibling;
          row?.classList.remove('expanded');
          detailRow?.classList.remove('visible');
          expandedProject = null;
        }
      });
    }

    // Grade segment click filtering
    function initGradeSegmentClick() {
      document.querySelectorAll('.grade-segment').forEach(segment => {
        segment.addEventListener('click', () => {
          const grade = segment.querySelector('.grade-label')?.textContent?.toLowerCase();
          if (!grade) return;

          // Find and click the corresponding quick filter
          const filterBtn = document.querySelector(\`.quick-filter-btn[data-filter="grade-\${grade}"]\`);
          if (filterBtn) {
            filterBtn.click();
          } else if (grade === 'd' || grade === 'f') {
            document.querySelector('.quick-filter-btn[data-filter="grade-df"]')?.click();
          }
        });
      });
    }

    // Animate progress bars on load
    function animateProgressBars() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const bar = entry.target;
            const width = bar.style.width;
            bar.style.width = '0';
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                bar.style.width = width;
              });
            });
            observer.unobserve(bar);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.tech-bar-fill, .velocity-fill, .grade-segment').forEach(bar => {
        observer.observe(bar);
      });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      initQuickFilters();
      initExpandableRows();
      initGradeSegmentClick();
      animateProgressBars();
      updateFilterCounts();
    });

    // Event listeners
    searchInput?.addEventListener('input', filterAndSort);
    sortSelect?.addEventListener('change', filterAndSort);
    filterSelect?.addEventListener('change', filterAndSort);

    // Auto-refresh every 5 minutes
    setTimeout(() => location.reload(), 5 * 60 * 1000);

    // Expose for debugging
    window.portfolioDashboard = { projects, filterAndSort };
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
