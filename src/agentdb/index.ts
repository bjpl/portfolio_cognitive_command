/**
 * AgentDB Integration Layer
 * Unified persistence layer for agent states, sessions, GOAP data, and analysis results
 * Integrates local file storage with claude-flow MCP memory tools
 */

export * from './types';
export * from './storage';
export * from './sync';
export * from './queries';
export { AgentDB, createAgentDB } from './database';
export {
  SessionCapture,
  createSessionCapture,
  autoLinkCommit,
  SessionCaptureConfig,
} from './session-capture';
