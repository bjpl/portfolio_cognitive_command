#!/usr/bin/env ts-node

/**
 * Test script for ledger-generator skill
 * Demonstrates GOAP skill implementation
 */

import { generateLedger, getLedgerSummary, listLedgers } from '../src/skills/ledger-generator';

async function main() {
  console.log('📊 Portfolio Cognitive Command - Ledger Generator Test\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Generate ledger
    console.log('🔄 Generating Portfolio Progress Ledger...\n');

    const result = await generateLedger({
      shardDir: 'output/docs/shards',
      agentDbPath: 'data/agentdb.json',
      outputDir: 'output/docs'
    });

    console.log('✅ Ledger generated successfully!\n');
    console.log(`📄 File: ${result.ledgerPath}\n`);

    // Display summary
    const summary = getLedgerSummary(result);

    console.log('📈 Summary Statistics:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`  Total Projects:     ${summary.totalProjects}`);
    console.log(`  Total Commits:      ${summary.totalCommits}`);
    console.log(`  Verified Commits:   ${summary.verifiedCommits}`);
    console.log(`  Verification Rate:  ${summary.verificationRate}%`);
    console.log('');

    console.log('📁 Cluster Breakdown:');
    console.log('─────────────────────────────────────────────────────');
    for (const cluster of summary.clusters) {
      console.log(`  ${cluster.name}:`);
      console.log(`    Projects:   ${cluster.projects}`);
      console.log(`    Commits:    ${cluster.commits}`);
      console.log(`    Alignment:  ${cluster.alignment}%`);
      console.log('');
    }

    // List all ledgers
    console.log('📚 Available Ledgers:');
    console.log('─────────────────────────────────────────────────────');
    const ledgers = listLedgers('output/docs');
    if (ledgers.length > 0) {
      ledgers.forEach((ledger, idx) => {
        const filename = ledger.split('/').pop();
        console.log(`  ${idx + 1}. ${filename}`);
      });
    } else {
      console.log('  (No previous ledgers found)');
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Ledger generation complete!');
    console.log('');
    console.log('GOAP Skill Implementation:');
    console.log('  ✓ loadShards() - Load shard data');
    console.log('  ✓ loadAgentDBSessions() - Load session data');
    console.log('  ✓ correlateCommitsToSessions() - Link commits to reasoning');
    console.log('  ✓ generateLedger() - Create markdown document');
    console.log('  ✓ Export interface LedgerGeneratorResult');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error generating ledger:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
