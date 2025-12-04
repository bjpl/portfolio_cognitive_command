#!/usr/bin/env node
/**
 * Minimal JavaScript Test: Cognitive Linker
 * Tests commit-to-session correlation without TypeScript
 */

const fs = require('fs');
const path = require('path');

// Test utilities
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

// Load AgentDB
function loadAgentDb(dbPath) {
  try {
    const content = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading AgentDB: ${error}`);
    return { sessions: [], lastUpdated: new Date().toISOString() };
  }
}

// Find session by commit hash
function findSessionForCommit(commitHash, db) {
  return db.sessions.find(s => s.commits.includes(commitHash)) || null;
}

// Main test function
function runTests() {
  console.log('=== Cognitive Linker Integration Tests (JavaScript) ===\n');

  const dbPath = path.join(process.cwd(), 'data', 'agentdb.json');
  console.log(`Using AgentDB: ${dbPath}\n`);

  // Load database
  console.log('Test Setup: Loading AgentDB...');
  const db = loadAgentDb(dbPath);

  assertEqual(Array.isArray(db.sessions), true, 'AgentDB has sessions array');
  console.log(`Loaded ${db.sessions.length} sessions\n`);

  // Test 1: Direct hash lookup for commit 64dda93
  console.log('Test 1: Direct Hash Lookup (commit 64dda93)');
  const session1 = findSessionForCommit('64dda93', db);

  assert(session1 !== null, 'Found session for commit 64dda93');
  if (session1) {
    assertEqual(session1.sessionId, 'session_2025-12-03_001', 'Session ID matches');
    assert(session1.reasoning?.includes('GOAP-driven'), 'Reasoning contains GOAP');
    assert(session1.prompt?.includes('Production-ready'), 'Prompt contains expected text');

    console.log(`   Session: ${session1.sessionId}`);
    console.log(`   Prompt: ${session1.prompt}`);
    console.log(`   Reasoning: ${session1.reasoning}`);
  }
  console.log();

  // Test 2: Unknown commit hash
  console.log('Test 2: Unknown Commit Hash');
  const session2 = findSessionForCommit('unknown123', db);

  assertEqual(session2, null, 'No session found for unknown commit');
  console.log(`   Result: ${session2} (as expected)`);
  console.log();

  // Test 3: Verify session structure
  console.log('Test 3: Session Structure Validation');
  if (db.sessions.length > 0) {
    const firstSession = db.sessions[0];

    assert(firstSession.sessionId !== undefined, 'Session has sessionId');
    assert(firstSession.startTime !== undefined, 'Session has startTime');
    assert(Array.isArray(firstSession.commits), 'Session has commits array');
    assert(typeof firstSession.reasoning === 'string', 'Session has reasoning string');
    assert(typeof firstSession.prompt === 'string', 'Session has prompt string');

    console.log(`   Session structure validated`);
    console.log(`   - sessionId: ${firstSession.sessionId}`);
    console.log(`   - commits: [${firstSession.commits.join(', ')}]`);
  }
  console.log();

  // Test 4: Extract reasoning steps
  console.log('Test 4: Extract Reasoning Steps');
  if (session1 && session1.reasoning) {
    const steps = session1.reasoning.split('→').map(s => s.trim()).filter(s => s.length > 0);

    assert(steps.length > 0, 'Extracted reasoning steps');
    assert(steps.some(s => s.includes('GOAP')), 'Contains GOAP step');

    console.log(`   Extracted ${steps.length} steps:`);
    steps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));
  }
  console.log();

  // Test 5: Verify all sessions
  console.log('Test 5: All Sessions Inventory');
  db.sessions.forEach((session, index) => {
    console.log(`   Session ${index + 1}: ${session.sessionId}`);
    console.log(`     - Start: ${session.startTime}`);
    console.log(`     - Commits: ${session.commits.length > 0 ? session.commits.join(', ') : 'none'}`);
    console.log(`     - Outcome: ${session.outcome || 'not set'}`);
  });
  console.log();

  // Test 6: Commit correlation verification
  console.log('Test 6: Commit Correlation Verification');
  const commit64dda93 = findSessionForCommit('64dda93', db);
  if (commit64dda93) {
    console.log(`   Commit 64dda93 → Session ${commit64dda93.sessionId}`);
    console.log(`   ✓ Correlation verified end-to-end`);
    console.log();
    console.log('   Full Correlation Chain:');
    console.log(`   - Commit Hash: 64dda93`);
    console.log(`   - Session ID: ${commit64dda93.sessionId}`);
    console.log(`   - Start Time: ${commit64dda93.startTime}`);
    console.log(`   - User Prompt: ${commit64dda93.prompt}`);
    console.log(`   - Reasoning Chain: ${commit64dda93.reasoning}`);
    console.log(`   - Outcome: ${commit64dda93.outcome}`);
  }
  console.log();

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total Tests: ${testsRun}`);
  console.log(`Passed: ${testsPassed} ✓`);
  console.log(`Failed: ${testsFailed} ✗`);
  console.log();

  if (testsFailed === 0) {
    console.log('🎉 All tests passed! Commit-session correlation verified.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. See output above for details.');
    process.exit(1);
  }
}

// Run tests
try {
  runTests();
} catch (error) {
  console.error('Fatal error running tests:', error);
  process.exit(1);
}
