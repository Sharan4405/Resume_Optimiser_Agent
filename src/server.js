import express from 'express';
import { z } from 'zod';
import 'dotenv/config';
import { resumeOptimizerAgent } from './agent/index.js';


const app = express();
app.use(express.json({ limit: '10mb' }));

// --- API Endpoint ---
// The schema now accepts either a job_description or a linkedin_job_url
const OptimizeRequestSchema = z.object({
  resume_file_b64: z.string(),
  job_description: z.string().optional(),
  linkedin_job_url: z.string().url().optional(),
}).refine(data => data.job_description || data.linkedin_job_url, {
  message: "Either job_description or linkedin_job_url must be provided.",
});

app.post("/optimize", async (req, res) => {
  try {
    const validation = OptimizeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid request body", details: validation.error.errors });
    }

    // Pass all validated data to the agent's initial state.
    const inputs = {
        resume_b64: validation.data.resume_file_b64,
        job_description: validation.data.job_description,
        linkedin_job_url: validation.data.linkedin_job_url,
    };
    
    console.log("Invoking Resume Optimizer Agent...");
    const finalState = await resumeOptimizerAgent.invoke(inputs);
    console.log("Agent finished invocation.");
    
    res.json({
      optimized_resume: finalState.optimized_resume,
      summary: finalState.summary,
    });
  } catch (error) {
    console.error("Error during optimization:", error);
    res.status(500).json({ error: "An internal error occurred.", details: error.message });
  }
});

// --- Server Startup ---
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`JavaScript Agent server listening on http://localhost:${PORT}`);
});
