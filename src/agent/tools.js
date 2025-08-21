import { ChatGroq } from "@langchain/groq"
import pdfParse from 'pdf-parse';
import axios from 'axios';
import * as cheerio from 'cheerio';

const model = new ChatGroq({
    model: "llama3-8b-8192",
})
// --- Web Scraping Tools ---
/**
 * Scrapes the job description text from a LinkedIn job URL.
 * @param {import('./graph').AgentState} state The current agent state.
 * @returns {Promise<Partial<import('./graph').AgentState>>}
 */
export async function linkedinScraper(state) {
  console.log("---Executing Tool: linkedinScraper---");
  const { linkedin_job_url } = state;
  try {
    const response = await axios.get(linkedin_job_url);
    const $ = cheerio.load(response.data);
    // This selector targets the main job description container on LinkedIn pages.
    const description = $('.show-more-less-html__markup').text().trim();
    if (!description) {
      throw new Error("Could not find job description on the page. The page structure might have changed.");
    }
    return { job_description: description };
  } catch (error) {
    console.error("Error scraping LinkedIn URL:", error.message);
    // It's often better to let the agent know the tool failed.
    // Here we'll return an error message in the job_description field.
    return { job_description: `Failed to scrape the URL: ${error.message}` };
  }
}

// --- File Processing Tools ---

/**
 * Parses the text content from a Base64 encoded PDF file.
 * @param {import('./graph').AgentState} state The current agent state.
 * @returns {Promise<Partial<import('./graph').AgentState>>}
 */
export async function resumeParser(state) {
  console.log("---Executing Tool: resumeParser---");
  const pdfBytes = Buffer.from(state.resume_b64, 'base64');
  const data = await pdfParse(pdfBytes);
  return { resume_text: data.text };
}


// --- AI-Powered Language Tools ---

/**
 * Extracts the top 5 keywords from a job description.
 * @param {import('./graph').AgentState} state The current agent state.
 * @returns {Promise<Partial<import('./graph').AgentState>>}
 */
export async function keywordExtractor(state) {
  console.log("---Executing Tool: keywordExtractor---");
  const { job_description } = state;
  const prompt = `Extract the top 5 most important keywords and skills from this job description. Return them as a comma-separated list.\n\nJob Description:\n${job_description}`;
  const resp = await llm.invoke(prompt);
  const keywords = resp.content.toString().split(",").map(k => k.trim());
  return { keywords };
}

/**
 * Rewrites the resume and generates a summary.
 * @param {import('./graph').AgentState} state The current agent state.
 * @returns {Promise<Partial<import('./graph').AgentState>>}
 */
export async function resumeRewriter(state) {
  console.log("---Executing Tool: resumeRewriter---");
  const { resume_text, keywords, job_description } = state;

  const prompt = `
    You are an expert resume writer. Rewrite the following resume to be perfectly tailored to the provided job description.
    1.  Integrate these specific keywords naturally: ${keywords?.join(', ')}.
    2.  Use strong, professional action verbs and quantify achievements where possible.
    3.  Ensure the tone is professional and confident.
    4.  After rewriting the resume, write a compelling 3-sentence summary under the heading "Summary:" that powerfully explains why the candidate is an excellent fit for the role.

    Original Resume Content:
    ${resume_text}

    Target Job Description:
    ${job_description}
  `;
  const resp = await llm.invoke(prompt);
  const content = resp.content.toString();

  const summaryMarker = "Summary:";
  let optimized_resume = content;
  let summary = "Summary could not be generated separately.";

  if (content.includes(summaryMarker)) {
    const parts = content.split(summaryMarker);
    optimized_resume = parts[0].trim();
    summary = parts[1].trim();
  }

  return { optimized_resume, summary };
}
