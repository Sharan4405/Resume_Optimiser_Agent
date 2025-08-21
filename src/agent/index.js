import { workflow } from './graph.js';

/**
 * Compile the graph into a runnable agent.
 */
export const resumeOptimizerAgent = workflow.compile();