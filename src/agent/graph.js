import { StateGraph, END } from '@langchain/langgraph';
import { linkedinScraper, resumeParser, keywordExtractor, resumeRewriter } from './tools.js';

/**
 * @typedef {object} AgentState
 * @property {string} resume_b64
 * @property {string} [linkedin_job_url]
 * @property {string} [job_description]
 * @property {string} [resume_text]
 * @property {string[]} [keywords]
 * @property {string} [optimized_resume]
 * @property {string} [summary]
 */

/**
 * The router function that decides which tool to call next.
 * @param {AgentState} state
 * @returns {"scrape_linkedin" | "parse_resume" | "extract_keywords" | "rewrite_resume" | "end"}
 */
export function router(state) {
  console.log("---Routing---");
  if (state.linkedin_job_url && !state.job_description) {
    console.log("Decision: Need to scrape LinkedIn URL for job description.");
    return "scrape_linkedin";
  }
  if (!state.resume_text) {
    console.log("Decision: Need to parse resume.");
    return "parse_resume";
  }
  if (!state.keywords) {
    console.log("Decision: Need to extract keywords.");
    return "extract_keywords";
  }
  if (!state.optimized_resume) {
    console.log("Decision: Need to rewrite resume.");
    return "rewrite_resume";
  }
  console.log("Decision: All tasks complete. Ending graph.");
  return "end";
}

// --- Graph Definition ---
export const workflow = new StateGraph({
  channels: {
    resume_b64: { value: null },
    linkedin_job_url: { value: null },
    job_description: { value: null },
    resume_text: { value: null },
    keywords: { value: null },
    optimized_resume: { value: null },
    summary: { value: null },
  }
});

// Add nodes for each tool
workflow.addNode("scrape_linkedin", linkedinScraper);
workflow.addNode("parse_resume", resumeParser);
workflow.addNode("extract_keywords", keywordExtractor);
workflow.addNode("rewrite_resume", resumeRewriter);
workflow.addNode("router", router);

// The entry point is the router
workflow.setEntryPoint("router");

// Add conditional edges from the router
workflow.addConditionalEdges("router", {
  "scrape_linkedin": "scrape_linkedin",
  "parse_resume": "parse_resume",
  "extract_keywords": "extract_keywords",
  "rewrite_resume": "rewrite_resume",
  "end": END,
});

// After each tool runs, it goes back to the router
workflow.addEdge("scrape_linkedin", "router");
workflow.addEdge("parse_resume", "router");
workflow.addEdge("extract_keywords", "router");
workflow.addEdge("rewrite_resume", "router");
