#!/usr/bin/env node
/**
 * Generate Cognitive Trace for Commit 64dda93
 */

const fs = require('fs');
const path = require('path');

// Load AgentDB
function loadAgentDb(dbPath) {
  const content = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(content);
}

// Find session by commit hash
function findSessionForCommit(commitHash, db) {
  return db.sessions.find(s => s.commits.includes(commitHash)) || null;
}

// Extract reasoning steps
function extractKeyReasoningSteps(reasoningChain) {
  if (!reasoningChain) return [];

  return reasoningChain
    .split('→')
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

// Create cognitive trace
function createCognitiveTrace(commitHash, session) {
  const trace = [
    '=== COGNITIVE TRACE ===',
    '',
    `Commit: ${commitHash}`,
    `Source: agent_swarm`,
    ''
  ];

  if (session) {
    trace.push(`Session ID: ${session.sessionId}`);
    trace.push(`Start Time: ${session.startTime}`);
    trace.push('');

    if (session.prompt) {
      trace.push('--- Original Prompt ---');
      trace.push(session.prompt);
      trace.push('');
    }

    if (session.reasoning) {
      trace.push('--- Reasoning Chain ---');
      const steps = extractKeyReasoningSteps(session.reasoning);
      steps.forEach((step, i) => {
        trace.push(`${i + 1}. ${step}`);
      });
      trace.push('');
    }

    if (session.outcome) {
      trace.push('--- Outcome ---');
      trace.push(session.outcome);
      trace.push('');
    }
  }

  trace.push('=== END TRACE ===');
  return trace.join('\n');
}

// Main
const dbPath = path.join(process.cwd(), 'data', 'agentdb.json');
const db = loadAgentDb(dbPath);

const commitHash = '64dda93';
const session = findSessionForCommit(commitHash, db);

if (session) {
  const trace = createCognitiveTrace(commitHash, session);
  console.log(trace);

  // Save to file
  const outputPath = path.join(process.cwd(), 'data', `cognitive_trace_${commitHash}.txt`);
  fs.writeFileSync(outputPath, trace, 'utf8');
  console.log(`\n✓ Cognitive trace saved to: ${outputPath}`);
} else {
  console.log(`❌ No session found for commit ${commitHash}`);
  process.exit(1);
}
