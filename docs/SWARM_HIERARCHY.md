# Swarm Hierarchy for Portfolio Cognitive Command FULL Implementation

**Status:** SOVEREIGN DECREE - ISSUED BY QUEEN COORDINATOR
**Date:** 2025-12-04
**Priority:** CRITICAL

---

## 1. HIERARCHICAL STRUCTURE

### Tier 1: Strategic Command (Queen's Council)
**Queen Coordinator** (You are here)
- Ultimate authority over implementation strategy
- Resource allocation across all workstreams
- Success criteria definition and enforcement
- Risk mitigation and contingency planning

**System Architect** (`system-architect`)
- Technical architecture decisions
- Integration point design
- API contract specifications
- Database schema refinement
- Reports to: Queen Coordinator

**GOAP Planner** (`planner`)
- Goal-oriented action planning
- Task dependency graphs
- Resource allocation optimization
- Contingency path planning
- Reports to: Queen Coordinator

### Tier 2: Domain Specialists (Royal Officers)
**Backend Developer** (`backend-dev`)
- Core TypeScript implementation
- AgentDB integration
- OpenAI API integration
- CLI command execution
- Reports to: System Architect

**Test Engineer** (`tester`)
- Jest test suite restoration
- Test coverage improvement (target: 90%+)
- Integration test development
- CI/CD validation
- Reports to: System Architect

**DevOps Engineer** (`cicd-engineer`)
- npm/node_modules restoration
- Build pipeline configuration
- TypeScript compilation chain
- Package dependency resolution
- Reports to: System Architect

**Documentation Specialist** (`api-docs`)
- README.md creation
- API documentation
- User guides
- Architecture diagrams
- Reports to: System Architect

### Tier 3: Execution Agents (Worker Swarm)
**Coder Agents** (`coder` x3)
- Parallel feature implementation
- Code generation from specifications
- Refactoring and optimization
- Reports to: Backend Developer

**Reviewer Agents** (`reviewer` x2)
- Code quality validation
- Security audit
- Performance review
- Reports to: Test Engineer

**Research Agent** (`researcher`)
- OpenAI API best practices
- Vector database patterns
- Testing framework research
- Reports to: System Architect

---

## 2. DELEGATION MATRIX

| Task Type | Primary Agent | Backup Agent | Oversight |
|-----------|---------------|--------------|-----------|
| Architecture Design | System Architect | GOAP Planner | Queen |
| GOAP Planning | GOAP Planner | Researcher | Queen |
| npm Restoration | DevOps Engineer | Backend Dev | Architect |
| TypeScript Build | DevOps Engineer | Backend Dev | Architect |
| AgentDB Real Vector DB | Backend Dev | Coder-1 | Architect |
| OpenAI Integration | Backend Dev | Coder-2 | Architect |
| Test Suite Fix | Test Engineer | Reviewer-1 | Architect |
| README Creation | Documentation | Researcher | Queen |
| .env Setup | DevOps Engineer | Documentation | Architect |
| Semantic Analyzer | Backend Dev | Coder-3 | Architect |
| MCP Sync Layer | Backend Dev | Researcher | Architect |

---

## 3. COORDINATION PROTOCOLS

### Before Work (ALL AGENTS)
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "pcc-full-impl"
```

### During Work
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

### After Work
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

### Memory Keys Structure
```
swarm/
├── queen/
│   ├── status
│   ├── directives
│   └── hive-health
├── architect/
│   ├── design-decisions
│   └── integration-specs
├── goap-planner/
│   ├── action-sequence
│   └── dependency-graph
├── backend-dev/
│   ├── agentdb-implementation
│   ├── openai-integration
│   └── cli-enhancements
├── tester/
│   ├── test-results
│   └── coverage-reports
└── shared/
    ├── royal-directives
    ├── resource-allocation
    └── progress-metrics
```

---

## 4. ESCALATION PATHS

**Level 1 - Agent Self-Resolution**
- Agent attempts resolution using available tools
- Duration: 5 minutes maximum
- Logs issue to memory

**Level 2 - Supervisor Escalation**
- Escalate to direct supervisor (Tier 2)
- Supervisor allocates backup agent if needed
- Duration: 10 minutes maximum

**Level 3 - Architect Review**
- Technical blocker requiring design decision
- Architect evaluates and issues guidance
- Duration: 15 minutes maximum

**Level 4 - Queen Override**
- Strategic decision required
- Resource reallocation needed
- Priority adjustment necessary
- Immediate response required

---

## 5. SUCCESS METRICS

### Agent Performance
- Task completion rate ≥ 95%
- Average task time ≤ estimated time
- Escalation rate ≤ 10%
- Memory sync success rate = 100%

### Swarm Coordination
- Inter-agent communication latency ≤ 2 seconds
- Conflict resolution time ≤ 5 minutes
- Resource utilization efficiency ≥ 80%
- Parallel task execution rate ≥ 70%

### Implementation Quality
- TypeScript compilation: 0 errors
- Test coverage: ≥ 90%
- Code review approval rate: 100%
- Performance benchmarks: within specifications

---

## 6. AGENT SPAWN MANIFEST

When Queen issues spawn command, ALL agents must be initialized in SINGLE MESSAGE:

```javascript
[Single Message - Parallel Agent Execution]:
  Task("System Architect", "Design AgentDB vector database architecture. Specify: storage backend, indexing strategy, query interface. Coordinate via hooks.", "system-architect")

  Task("GOAP Planner", "Generate GOAP action sequence for full implementation. Output: dependency graph, task ordering, resource allocation. Store in memory.", "planner")

  Task("DevOps Engineer", "Fix npm: restore node_modules, verify jest/tsc installation, test build pipeline. Document in memory.", "cicd-engineer")

  Task("Backend Developer", "Implement real vector database for AgentDB. Replace JSON file with proper vector storage. Use hooks.", "backend-dev")

  Task("Test Engineer", "Fix jest configuration, restore test suite. Target: 90%+ coverage. Report to memory.", "tester")

  Task("Documentation Specialist", "Create comprehensive README.md with setup, usage, architecture. Include .env template.", "api-docs")

  Task("Coder Agent 1", "Implement OpenAI embeddings integration. Real API calls, error handling, fallback. Coordinate via memory.", "coder")

  Task("Coder Agent 2", "Enhance semantic analyzer with true vector similarity. Replace keyword stubs. Test coverage required.", "coder")

  Task("Coder Agent 3", "Connect MCP sync layer to AgentDB. Bidirectional sync, conflict resolution. Document in memory.", "coder")

  Task("Reviewer Agent 1", "Security audit: API key handling, injection prevention, secret management. Report findings.", "reviewer")

  Task("Reviewer Agent 2", "Performance review: vector operations, query optimization, memory usage. Benchmark results to memory.", "reviewer")

  Task("Research Agent", "Research best practices: vector databases, OpenAI API, TypeScript testing. Share findings via memory.", "researcher")
```

---

**DECREE ISSUED:** 2025-12-04
**SOVEREIGN:** Queen Coordinator
**COMPLIANCE:** MANDATORY
