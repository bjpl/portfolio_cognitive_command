# Workstream Assignments for Full Implementation

**Issued by:** Queen Coordinator
**Date:** 2025-12-04
**Execution Model:** Parallel workstreams with dependency management

---

## WORKSTREAM 1: Build System Restoration
**Owner:** DevOps Engineer (`cicd-engineer`)
**Priority:** P0 (BLOCKS ALL OTHER WORK)
**Estimated Duration:** 2 hours
**Dependencies:** None

### Tasks
1. Backup current node_modules and package-lock.json
2. Clear node_modules completely: `rm -rf node_modules`
3. Clear npm cache: `npm cache clean --force`
4. Verify package.json dependencies are correct
5. Reinstall: `npm install` (use clean install)
6. Verify toolchain:
   - `npx tsc --version` (should work)
   - `npx jest --version` (should work)
7. Test build: `npm run build` (should compile to dist/)
8. Test testing: `npm test` (should execute tests)
9. Document any issues found in memory
10. Create setup script for future resets

### Deliverables
- Working `npm run build` (0 errors)
- Working `npm test` (tests execute)
- Setup script in `scripts/setup-dev.sh`
- Documentation of any dependency issues

### Success Criteria
- Build pipeline fully functional
- All npm scripts in package.json work
- CI/CD can run locally

### Memory Keys
- `swarm/devops/build-status`
- `swarm/devops/issues-found`
- `swarm/devops/setup-script`

---

## WORKSTREAM 2: AgentDB Vector Database Architecture
**Owner:** System Architect (`system-architect`)
**Priority:** P0 (CORE ARCHITECTURE)
**Estimated Duration:** 3 hours
**Dependencies:** None (design only)

### Tasks
1. Research vector database options:
   - Option A: hnswlib-node (HNSW algorithm, fast)
   - Option B: faiss-node (Facebook AI Similarity Search)
   - Option C: Custom TypeScript implementation (simple)
   - Option D: External service (Pinecone, Weaviate)
2. Design schema specification:
   - Document structure: `{ id, vector, metadata, timestamp }`
   - Index strategy: HNSW vs flat, distance metrics
   - Storage format: binary vs JSON
3. Specify query interface:
   - `insert(vector, metadata)` → id
   - `query(vector, k)` → top k similar documents
   - `update(id, vector, metadata)` → success
   - `delete(id)` → success
4. Design migration path from current JSON to vector DB
5. Performance benchmarks and requirements:
   - Target: <100ms for 10k vectors
   - Index build time acceptable
   - Memory usage constraints
6. Create integration specification for Backend Dev
7. Risk analysis and contingency plans

### Deliverables
- Architecture Decision Record (ADR) for vector DB choice
- Detailed schema specification
- API interface specification
- Migration plan document
- Performance requirements document

### Success Criteria
- Clear technical decision with justification
- Implementable specification
- Backend Dev can start coding immediately
- Risk mitigation documented

### Memory Keys
- `swarm/architect/vector-db-adr`
- `swarm/architect/schema-spec`
- `swarm/architect/api-spec`
- `swarm/architect/migration-plan`

### Coordination
- Share ADR with GOAP Planner for task sequencing
- Provide specification to Backend Dev for implementation
- Consult with Researcher on best practices

---

## WORKSTREAM 3: GOAP Implementation Plan
**Owner:** GOAP Planner (`planner`)
**Priority:** P0 (STRATEGIC PLANNING)
**Estimated Duration:** 2 hours
**Dependencies:** Architect's ADR (partial dependency)

### Tasks
1. Define goal state: "Portfolio Cognitive Command v1.0 FULLY IMPLEMENTED"
2. Define current state: "Build broken, AgentDB fake, tests failing"
3. Generate action sequence with preconditions and effects:
   ```
   Action: FIX_BUILD_SYSTEM
     Preconditions: package.json valid
     Effects: npm scripts work, toolchain functional
     Cost: 2 hours

   Action: DESIGN_VECTOR_DB
     Preconditions: none
     Effects: architecture specification complete
     Cost: 3 hours

   Action: IMPLEMENT_VECTOR_DB
     Preconditions: architecture specification complete, build system working
     Effects: AgentDB is real vector database
     Cost: 6 hours

   ... (continue for all gaps)
   ```
4. Build dependency graph (DAG):
   - Identify critical path
   - Find parallelizable actions
   - Calculate total estimated time
5. Resource allocation:
   - Which agent handles which action
   - Identify resource conflicts
   - Load balancing across agents
6. Risk-adjusted timeline:
   - Best case, expected case, worst case
   - Buffer for unexpected issues
   - Contingency actions for failures
7. Define checkpoints and milestones:
   - Checkpoint 1: Build system working (2h)
   - Checkpoint 2: AgentDB designed (3h)
   - Checkpoint 3: AgentDB implemented (9h)
   - Milestone 1: Core functionality complete (15h)
   - Milestone 2: Tests passing (18h)
   - Milestone 3: Documentation complete (20h)
8. Create monitoring plan:
   - Progress tracking metrics
   - Deviation detection
   - Replanning triggers

### Deliverables
- Complete GOAP action sequence (JSON/YAML)
- Dependency graph (DOT format or visual)
- Resource allocation matrix
- Risk-adjusted timeline with milestones
- Monitoring dashboard specification

### Success Criteria
- All gaps covered by actions
- Critical path identified
- Realistic timeline (20-30 hours total)
- Contingency plans for top 5 risks

### Memory Keys
- `swarm/planner/goap-sequence`
- `swarm/planner/dependency-graph`
- `swarm/planner/resource-allocation`
- `swarm/planner/timeline`

### Coordination
- Receive Architect's ADR to refine action costs
- Share plan with Queen for approval
- Provide task assignments to all agents
- Monitor progress and replan as needed

---

## WORKSTREAM 4: AgentDB Implementation
**Owner:** Backend Developer (`backend-dev`)
**Priority:** P1 (AFTER ARCHITECTURE & BUILD FIX)
**Estimated Duration:** 6 hours
**Dependencies:** Workstream 1 (build), Workstream 2 (architecture)

### Tasks
1. Implement vector storage backend per Architect's spec
2. Create AgentDB class with CRUD operations
3. Implement vector similarity search (cosine/euclidean)
4. Add indexing for performance (HNSW or as specified)
5. Write migration script: JSON sessions → vector DB
6. Add error handling and validation
7. Implement persistence (save/load state)
8. Performance optimization and benchmarking
9. Integration with existing CLI code
10. Unit tests for all operations

### Deliverables
- `src/agentdb/vector-storage.ts` (new)
- Updated `src/agentdb/database.ts`
- Migration script: `scripts/migrate-to-vector-db.ts`
- Unit tests: `tests/agentdb/vector-storage.test.ts`
- Performance benchmark results

### Success Criteria
- Vector similarity search working
- Performance: <100ms for 10k vectors
- All tests passing
- Migration script successfully converts data

### Memory Keys
- `swarm/backend-dev/agentdb-implementation`
- `swarm/backend-dev/benchmark-results`

---

## WORKSTREAM 5: Semantic Analyzer Enhancement
**Owner:** Coder Agent 2 (`coder`)
**Priority:** P1 (CRITICAL QUALITY IMPROVEMENT)
**Estimated Duration:** 4 hours
**Dependencies:** Workstream 1 (build), Workstream 6 (.env setup)

### Tasks
1. Configure OpenAI client with proper error handling
2. Replace keyword fallback with real OpenAI API calls
3. Implement embedding caching to minimize API costs
4. Add validation: verify embeddings are from API
5. Implement retry logic with exponential backoff
6. Add clear warnings when fallback triggered
7. Update tests to mock OpenAI API
8. Performance testing and cost estimation
9. Documentation for API usage limits

### Deliverables
- Updated `src/skills/semantic-analyzer.ts`
- Embedding cache implementation
- Unit tests with API mocks
- Cost estimation document

### Success Criteria
- 100% embeddings from OpenAI when key configured
- Cache hit rate >80% for repeated queries
- Graceful degradation on API failure
- Tests passing with mocks

### Memory Keys
- `swarm/coder-2/semantic-analyzer-status`
- `swarm/coder-2/cost-analysis`

---

## WORKSTREAM 6: Configuration & Setup
**Owner:** DevOps Engineer (`cicd-engineer`)
**Priority:** P1 (PARALLEL WITH OTHERS)
**Estimated Duration:** 2 hours
**Dependencies:** Workstream 1 (build)

### Tasks
1. Create .env from .env.example
2. Create setup script: `npm run setup`
   - Interactive prompt for OpenAI API key
   - Validate configuration
   - Create necessary directories
3. Add config validation on CLI startup
4. Implement clear error messages for missing config
5. Update package.json scripts
6. Test setup flow end-to-end

### Deliverables
- `scripts/setup.js` (interactive setup)
- Updated `src/config.ts` (validation)
- `.env` template with placeholders
- Setup documentation

### Success Criteria
- `npm run setup` creates working .env
- CLI validates config and fails fast on errors
- Clear guidance for users on configuration

### Memory Keys
- `swarm/devops/setup-script-status`

---

## WORKSTREAM 7: MCP Sync Integration
**Owner:** Coder Agent 3 (`coder`)
**Priority:** P2 (IMPORTANT BUT NOT BLOCKING)
**Estimated Duration:** 4 hours
**Dependencies:** Workstream 4 (AgentDB implementation)

### Tasks
1. Wire MCPMemoryTools into AgentDB constructor
2. Add sync hooks to CLI commands
3. Implement bidirectional sync logic
4. Test with real claude-flow memory instance
5. Add conflict resolution for concurrent writes
6. Error handling and logging
7. Integration tests
8. Performance testing

### Deliverables
- Updated `src/agentdb/database.ts` (MCP wiring)
- Updated `src/index.ts` (sync hooks)
- Integration tests
- Sync performance report

### Success Criteria
- Each CLI command syncs to MCP memory
- Session data persists across invocations
- Sync errors logged but don't crash
- Integration tests passing

### Memory Keys
- `swarm/coder-3/mcp-sync-status`

---

## WORKSTREAM 8: Test Suite Restoration
**Owner:** Test Engineer (`tester`)
**Priority:** P2 (AFTER BUILD FIX)
**Estimated Duration:** 6 hours
**Dependencies:** Workstream 1 (build)

### Tasks
1. Run existing test suite, catalog failures
2. Fix jest configuration issues
3. Fix failing tests one by one
4. Add missing tests for new functionality
5. Achieve 90%+ code coverage
6. Configure coverage reporting
7. Integrate with CI/CD
8. Document testing strategy

### Deliverables
- Fixed jest configuration
- All tests passing
- Coverage report showing 90%+
- CI/CD integration
- Testing documentation

### Success Criteria
- `npm test` runs successfully
- All tests passing (or justified skips)
- Coverage ≥90%
- CI/CD pipeline validates tests

### Memory Keys
- `swarm/tester/test-results`
- `swarm/tester/coverage-report`

---

## WORKSTREAM 9: Documentation
**Owner:** Documentation Specialist (`api-docs`)
**Priority:** P2 (PARALLEL WITH IMPLEMENTATION)
**Estimated Duration:** 4 hours
**Dependencies:** None (can start immediately)

### Tasks
1. Create comprehensive README.md
   - Project overview
   - Installation instructions
   - Configuration guide
   - Usage examples (all CLI commands)
   - Troubleshooting
   - Architecture overview
2. Create architecture diagrams
3. Document API interfaces
4. Create user guide
5. Add inline code documentation
6. Create CONTRIBUTING.md

### Deliverables
- `README.md` (comprehensive)
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/USER_GUIDE.md`
- `CONTRIBUTING.md`
- Architecture diagrams (PNG/SVG)

### Success Criteria
- New user can install and run in <10 minutes
- All CLI commands documented with examples
- Architecture clearly explained
- Troubleshooting covers common issues

### Memory Keys
- `swarm/docs/readme-status`
- `swarm/docs/architecture-diagrams`

---

## WORKSTREAM 10: Code Quality & Security
**Owner:** Reviewer Agent 1 (`reviewer`)
**Priority:** P3 (CONTINUOUS)
**Estimated Duration:** Ongoing
**Dependencies:** None (reviews ongoing work)

### Tasks
1. Security audit: API key handling
2. Security audit: Input validation
3. Security audit: File system operations
4. Code review: TypeScript best practices
5. Code review: Error handling patterns
6. Code review: Memory management
7. Performance review: Bottleneck analysis
8. Dependency audit: Known vulnerabilities

### Deliverables
- Security audit report
- Code review findings
- Performance analysis report
- Dependency vulnerability report
- Recommendations for improvements

### Success Criteria
- No critical security issues
- No known vulnerable dependencies
- Code follows TypeScript best practices
- Performance within acceptable bounds

### Memory Keys
- `swarm/reviewer-1/security-audit`
- `swarm/reviewer-1/code-review`

---

## CRITICAL PATH ANALYSIS

```
START
 ├─ [P0] Workstream 1: Build System (2h) ───┐
 │                                           ├─── [P1] Workstream 4: AgentDB Impl (6h)
 ├─ [P0] Workstream 2: Architecture (3h) ───┘                │
 │                                                            ├─── [P2] Workstream 7: MCP Sync (4h)
 ├─ [P0] Workstream 3: GOAP Plan (2h)                       │
 │                                                            │
 ├─ [P1] Workstream 6: Config/Setup (2h)                     │
 │                          │                                 │
 │                          ├─── [P1] Workstream 5: Semantic Analyzer (4h)
 │                                                            │
 ├─ [P2] Workstream 8: Tests (6h) ──────────────────────────┤
 │                                                            │
 ├─ [P2] Workstream 9: Documentation (4h) ──────────────────┤
 │                                                            │
 └─ [P3] Workstream 10: Quality (ongoing) ──────────────────┘
                                                              │
                                                            END
```

**Critical Path:** 1 → 2 → 4 → 7 = 2 + 3 + 6 + 4 = **15 hours**

**Parallel Optimized:** With 12 agents working in parallel, estimated **8-12 hours wall-clock time**

---

**WORKSTREAM ASSIGNMENTS ISSUED**
**AWAITING QUEEN COORDINATOR APPROVAL TO SPAWN AGENTS**
