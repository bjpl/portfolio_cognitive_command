# Architecture Documentation

**Portfolio Cognitive Command - Production Design**

This directory contains comprehensive architecture documentation for migrating from prototype to production-ready vector database system.

---

## 📚 Documentation Index

### 1. [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)
**Start here.** Executive summary of the entire architecture design.

**Contents**:
- Current state analysis with critical gaps
- Target architecture overview (6 layers)
- Key design decisions
- Performance targets
- Risk assessment
- 10-week migration timeline

**Reading Time**: 10 minutes

---

### 2. [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md)
**Complete system design.** Detailed architecture specification with component diagrams.

**Contents**:
- Critical gaps in current implementation
- Full architecture diagram (6 layers, ASCII art)
- Component integration map
- Vector database design (AgentDB npm package)
- Embedding generation pipeline (OpenAI/HuggingFace/TF-IDF)
- MCP integration architecture
- Neural pattern learning (ReasoningBank)
- Interface contracts (TypeScript)
- Refactoring strategy (what to keep/deprecate/rewrite)
- Performance targets and optimization
- Deployment considerations
- Success criteria

**Reading Time**: 45 minutes

---

### 3. [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)
**Detailed pipelines.** Step-by-step data flows through the system.

**Contents**:
- Semantic Analysis Pipeline (Repository → Vector Database)
  - Phase 1: Repository Scanning
  - Phase 2: Embedding Generation (with fallback strategies)
  - Phase 3: Vector Database Insertion
  - Phase 4: Clustering (HDBSCAN algorithm)
- MCP Integration Flow
  - Session Start Flow
  - Decision Capture Flow
  - Commit Linking Flow
  - Session End Flow
  - Pattern Learning Flow
- Vector Search Operations
  - Find Similar Commits Flow
  - Drift Detection Flow (vector similarity)
  - Pattern Retrieval Flow

**Reading Time**: 30 minutes

---

### 4. [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
**Implementation plan.** Step-by-step migration with copy-paste code.

**Contents**:
- Pre-migration checklist
- Phase 1: Foundation (Week 1-2)
  - VectorDatabaseService implementation
  - EmbeddingService with multi-tier fallback
  - MCPClient for server connection
  - Legacy code migration
- Phase 2: Semantic Analysis Rewrite (Week 3-4)
  - Rewrite semantic-analyzer.ts
  - Rewrite drift-detector.ts
  - ClusteringService implementation
- Phase 3: MCP Integration (Week 5-6)
- Phase 4: Neural Pattern Learning (Week 7-8)
- Phase 5: Dashboard & Visualization (Week 9)
- Phase 6: Testing & Documentation (Week 10)
- Rollback procedures

**Reading Time**: 60 minutes (includes copy-paste code)

---

## 🚀 Quick Start

### For Architects / Technical Leads
1. Read [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) (10 min)
2. Review key diagrams in [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) (20 min)
3. Approve timeline and budget

### For Developers
1. Skim [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) (5 min)
2. Study [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) Phase 1 (30 min)
3. Set up development environment
4. Begin implementation

### For Stakeholders
1. Read Executive Summary in [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) (10 min)
2. Review Success Criteria
3. Approve go/no-go decision

---

## 📊 Architecture at a Glance

### Current State → Target State

| Aspect | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Semantic Analysis | Keyword matching | True embeddings | Real semantic understanding |
| Vector Storage | JSON files | AgentDB (HNSW) | 150x faster search |
| Clustering | Manual keywords | HDBSCAN algorithm | Automatic, density-based |
| MCP Integration | Interface only | Live connection | Cross-session memory |
| Neural Learning | Not implemented | ReasoningBank | Pattern learning & replay |
| Search Performance | O(n) linear | O(log n) HNSW | Sub-100ms on 100K commits |

### Technology Stack

**Core Dependencies** (Required):
- `@agentic/agentdb@^2.0.0` - Vector database
- `@anthropic/mcp-client@^1.0.0` - MCP connection
- `typescript@^5.3.0` - Language
- `Node.js >= 20.0.0` - Runtime

**Optional Dependencies** (Recommended):
- `openai@^4.20.0` - Primary embeddings (requires API key)
- `@xenova/transformers@^2.6.0` - Local embeddings (fallback)

### Migration Timeline

```
Week 1-2:   Foundation (VectorDB, Embedding, MCP clients)
Week 3-4:   Semantic Analysis Rewrite
Week 5-6:   MCP Integration
Week 7-8:   Neural Pattern Learning
Week 9:     Dashboard & Visualization
Week 10:    Testing & Documentation

Total: 10 weeks
Risk: LOW (incremental, with rollback points)
```

### Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Embed 100 commits | < 30s | N/A |
| Search 100K commits | < 100ms | O(n) |
| Cluster 10K commits | < 5s | N/A |
| Sync 1000 docs | < 2s | N/A |

---

## 🎯 Design Principles

### 1. **Local-First Architecture**
- AgentDB is primary storage (fast, reliable, offline)
- MCP is secondary cache (distributed, cross-session)
- Offline mode fully supported

### 2. **Multi-Tier Fallback**
- Try OpenAI API (best quality)
- Fall back to HuggingFace (local, free)
- Final fallback to TF-IDF (instant, deterministic)
- System always works, even without API keys

### 3. **Incremental Migration**
- Each phase is independently testable
- Legacy code preserved in `/legacy` directory
- Rollback points at every phase
- No big-bang deployment

### 4. **Performance-First**
- HNSW indexing for O(log n) search
- Aggressive caching (memory + disk)
- Batch operations for bulk work
- Quantization for large datasets (>1M vectors)

### 5. **Observable & Debuggable**
- Comprehensive logging at each layer
- Performance metrics tracked
- MCP integration visible in dashboard
- Pattern learning explainable

---

## 🔍 Key Architectural Decisions

### Why AgentDB npm package instead of custom vector DB?
- **Time**: HNSW index takes months to implement correctly
- **Quality**: AgentDB battle-tested, 150x faster than brute-force
- **Features**: Built-in quantization, QUIC sync, hybrid search

### Why multi-tier embedding fallback?
- **Reliability**: Always works, even without API keys
- **Cost**: Free local models for development
- **Quality**: OpenAI for production, HuggingFace acceptable fallback

### Why local-first with MCP sync?
- **Speed**: Local database is instant
- **Reliability**: Works offline
- **Scalability**: MCP enables multi-agent coordination
- **Resilience**: Local is source of truth

### Why ReasoningBank pattern for neural learning?
- **Proven**: Used in academic research (verdict judgment)
- **Simple**: Trajectory → Vector → Pattern
- **Effective**: Experience replay from successful sessions

---

## 📁 File Structure After Migration

```
portfolio_cognitive_command/
├── src/
│   ├── services/               # NEW
│   │   ├── vector-database.ts  # AgentDB wrapper
│   │   ├── embedding-service.ts # Multi-tier embeddings
│   │   ├── mcp-client.ts       # claude-flow connection
│   │   ├── reasoningbank-service.ts # Pattern learning
│   │   ├── clustering-service.ts # HDBSCAN clustering
│   │   └── sync-service.ts     # MCP ↔ AgentDB sync
│   ├── skills/
│   │   ├── semantic-analyzer.ts # REWRITTEN (real embeddings)
│   │   ├── drift-detector.ts   # REWRITTEN (vector similarity)
│   │   ├── repo-scanner.ts     # UNCHANGED
│   │   ├── shard-generator.ts  # UPDATED (uses vector clusters)
│   │   ├── dashboard-builder.ts # ENHANCED (vector viz)
│   │   └── ... (brief, ledger, cognitive-linker)
│   ├── agentdb/                # MODIFIED
│   │   ├── session-capture.ts  # Updated to use VectorDB + MCP
│   │   └── types.ts            # UNCHANGED (good schema)
│   └── config.ts               # UPDATED (new env vars)
├── legacy/                     # NEW
│   ├── agentdb/                # Old JSON file storage
│   └── skills/                 # Old keyword matching
├── data/
│   └── portfolio.db            # NEW (AgentDB SQLite)
├── cache/
│   └── embeddings/             # NEW (embedding cache)
└── docs/
    └── architecture/           # THIS DIRECTORY
        ├── README.md           # This file
        ├── ARCHITECTURE_SUMMARY.md
        ├── TARGET_ARCHITECTURE.md
        ├── DATA_FLOW_DIAGRAMS.md
        └── MIGRATION_GUIDE.md
```

---

## 🧪 Testing Strategy

### Unit Tests
- All services (VectorDB, Embedding, MCP, Clustering)
- All skills (semantic-analyzer, drift-detector, etc.)
- Utilities and helpers

### Integration Tests
- End-to-end analysis pipeline
- Session capture flow
- Vector search operations
- MCP sync operations

### Performance Benchmarks
- Embedding generation (100 commits)
- Vector search (10K, 100K, 1M vectors)
- Clustering (10K commits)
- MCP sync (1000 documents)

**Target Coverage**: > 90%

---

## 🚨 Risk Mitigation

### Risk 1: OpenAI API Costs
- **Mitigation**: Aggressive caching, batch requests, free fallback models

### Risk 2: Vector Database Performance
- **Mitigation**: HNSW indexing, quantization, metadata pre-filtering

### Risk 3: MCP Server Reliability
- **Mitigation**: Local-first architecture, retry logic, offline mode

### Risk 4: Migration Complexity
- **Mitigation**: Incremental phases, legacy code preserved, rollback plan

---

## ✅ Success Criteria

### Functional
- ✅ Generate real embeddings (OpenAI/HuggingFace)
- ✅ Store vectors in AgentDB with HNSW indexing
- ✅ Vector search returns semantically similar items
- ✅ Clustering uses vector similarity (not keywords)
- ✅ Drift detection via vector comparison
- ✅ MCP client connects to claude-flow
- ✅ Session data syncs to MCP memory
- ✅ Neural patterns learned from sessions
- ✅ Pattern retrieval via vector search

### Quality
- ✅ Test coverage > 90%
- ✅ No data loss during migration
- ✅ Backward compatibility (reads legacy data)
- ✅ Complete documentation

### Performance
- ✅ Embed 100 commits < 30s
- ✅ Search 100K commits < 100ms
- ✅ Cluster 10K commits < 5s
- ✅ Sync 1000 docs < 2s

---

## 📞 Support & Questions

For architecture questions:
- Review documents in order (Summary → Target → Diagrams → Migration)
- Check interfaces in `TARGET_ARCHITECTURE.md` Section 5
- See example flows in `DATA_FLOW_DIAGRAMS.md`

For implementation questions:
- Follow `MIGRATION_GUIDE.md` step-by-step
- Use provided code snippets (copy-paste ready)
- Run tests after each phase

---

**Last Updated**: December 4, 2025
**Status**: Design Complete, Ready for Implementation
**Next Step**: Begin Phase 1 (Foundation)
