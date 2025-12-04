#!/usr/bin/env ts-node
/**
 * Standalone Integration Test: Cognitive Linker
 * Tests commit-to-session correlation without Jest
 */

import * as path from 'path';
import {
  linkToAgentDB,
  batchLinkCommits,
  createCognitiveTrace,
  extractKeyReasoningSteps,
  CognitiveLink
} from '../src/skills/cognitive-linker';

// Test utilities
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertTruthy(value: any, message: string): void {
  assert(!!value, message);
}

function assertContains(str: string | null, substring: string, message: string): void {
  assert(str?.includes(substring) ?? false, message);
}

async function runTests(): Promise<void> {
  console.log('=== Cognitive Linker Integration Tests ===\n');

  const dbPath = path.join(process.cwd(), 'data', 'agentdb.json');
  console.log(`Using AgentDB: ${dbPath}\n`);

  // Test 1: Direct hash lookup for commit 64dda93
  console.log('Test 1: Direct Hash Lookup (commit 64dda93)');
  try {
    const commitHash = '64dda93';
    const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');
    const result = await linkToAgentDB(commitTimestamp, commitHash, dbPath);

    assertEqual(result.commitHash, commitHash, 'Commit hash matches');
    assertEqual(result.sessionId, 'session_2025-12-03_001', 'Session ID matches');
    assertEqual(result.source, 'agent_swarm', 'Source is agent_swarm');
    assertTruthy(result.reasoningChain, 'Reasoning chain exists');
    assertContains(result.reasoningChain, 'GOAP-driven', 'Reasoning contains GOAP');
    assertTruthy(result.userPrompt, 'User prompt exists');
    assertContains(result.userPrompt, 'Production-ready', 'Prompt contains expected text');

    console.log(`   Session: ${result.sessionId}`);
    console.log(`   Prompt: ${result.userPrompt}`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 2: Unknown commit hash
  console.log('Test 2: Unknown Commit Hash (should return manual_override)');
  try {
    const commitHash = 'unknown123';
    const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');
    const result = await linkToAgentDB(commitTimestamp, commitHash, dbPath);

    assertEqual(result.commitHash, commitHash, 'Commit hash matches');
    assertEqual(result.sessionId, null, 'Session ID is null');
    assertEqual(result.source, 'manual_override', 'Source is manual_override');
    assertEqual(result.reasoningChain, null, 'Reasoning chain is null');

    console.log(`   Source: ${result.source}`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 3: Timestamp fallback (within 1 hour window)
  console.log('Test 3: Timestamp Fallback (within 1 hour window)');
  try {
    const commitHash = 'abcdef1';
    const commitTimestamp = new Date('2025-12-03T08:30:00.000Z'); // 30 min after session start

    const result = await linkToAgentDB(commitTimestamp, commitHash, dbPath);

    assertEqual(result.sessionId, 'session_2025-12-03_001', 'Found session by timestamp');
    assertEqual(result.source, 'agent_swarm', 'Source is agent_swarm');

    console.log(`   Session: ${result.sessionId} (found by timestamp proximity)`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 4: Timestamp outside window
  console.log('Test 4: Timestamp Outside Window (should return manual)');
  try {
    const commitHash = 'xyz789';
    const commitTimestamp = new Date('2025-12-03T10:00:00.000Z'); // 2 hours after

    const result = await linkToAgentDB(commitTimestamp, commitHash, dbPath);

    assertEqual(result.source, 'manual_override', 'Source is manual_override (outside window)');
    assertEqual(result.sessionId, null, 'Session ID is null');

    console.log(`   Source: ${result.source} (outside 1-hour window)`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 5: Batch linking
  console.log('Test 5: Batch Link Multiple Commits');
  try {
    const commits = [
      { hash: '64dda93', timestamp: new Date('2025-12-03T08:00:00.000Z') },
      { hash: 'unknown1', timestamp: new Date('2025-12-05T10:00:00.000Z') }
    ];

    const results = await batchLinkCommits(commits, dbPath);

    assertEqual(results.length, 2, 'Two results returned');
    assertEqual(results[0].commitHash, '64dda93', 'First commit matches');
    assertEqual(results[0].source, 'agent_swarm', 'First commit linked to session');
    assertEqual(results[1].source, 'manual_override', 'Second commit is manual');

    console.log(`   Batch processed ${results.length} commits`);
    console.log(`   - ${results[0].commitHash}: ${results[0].source}`);
    console.log(`   - ${results[1].commitHash}: ${results[1].source}`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 6: Create cognitive trace
  console.log('Test 6: Generate Cognitive Trace');
  try {
    const commitHash = '64dda93';
    const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');
    const link = await linkToAgentDB(commitTimestamp, commitHash, dbPath);
    const trace = createCognitiveTrace(link);

    assertContains(trace, '=== COGNITIVE TRACE ===', 'Contains header');
    assertContains(trace, 'Commit: 64dda93', 'Contains commit hash');
    assertContains(trace, 'Source: agent_swarm', 'Contains source');
    assertContains(trace, 'Session ID: session_2025-12-03_001', 'Contains session ID');
    assertContains(trace, '--- Original Prompt ---', 'Contains prompt section');
    assertContains(trace, '--- Reasoning Chain ---', 'Contains reasoning section');
    assertContains(trace, '=== END TRACE ===', 'Contains footer');

    console.log('   Cognitive trace generated:');
    console.log(trace);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 7: Extract reasoning steps
  console.log('Test 7: Extract Key Reasoning Steps');
  try {
    const reasoningChain = 'GOAP-driven refactoring → DELETE_DEAD_CODE → ADD_CONFIG → FIX_CLI_HARDCODING';
    const steps = extractKeyReasoningSteps(reasoningChain);

    assert(steps.length > 0, 'Extracted reasoning steps');
    assert(steps.some(s => s.includes('GOAP-driven')), 'Contains GOAP step');
    assert(steps.some(s => s.includes('DELETE_DEAD_CODE')), 'Contains DELETE step');

    console.log(`   Extracted ${steps.length} key steps:`);
    steps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

  // Test 8: End-to-end workflow
  console.log('Test 8: End-to-End Workflow');
  try {
    const commitHash = '64dda93';
    const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');

    // Step 1: Link
    const link = await linkToAgentDB(commitTimestamp, commitHash, dbPath);
    assertEqual(link.sessionId, 'session_2025-12-03_001', 'Link established');

    // Step 2: Trace
    const trace = createCognitiveTrace(link);
    assertTruthy(trace, 'Trace generated');

    // Step 3: Steps
    const steps = extractKeyReasoningSteps(link.reasoningChain);
    assert(steps.length > 0, 'Steps extracted');

    console.log('   ✓ Complete workflow executed successfully');
    console.log(`   - Linked commit to session ${link.sessionId}`);
    console.log(`   - Generated cognitive trace (${trace.split('\n').length} lines)`);
    console.log(`   - Extracted ${steps.length} reasoning steps`);
    console.log();
  } catch (error) {
    console.error(`   ERROR: ${error}`);
    testsFailed++;
  }

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
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
