import { GoogleGenAI } from "@google/genai";

/**
 * AI Utility for generating content with fallback models and keys
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function generateAIContent(prompt: string, maxRetries = 1): Promise<any> {
  const keysStr = process.env.GEMINI_API_KEYS || "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("Chưa cấu hình GEMINI_API_KEYS");
  
  // Use just the fastest models for recruitment parsing
  const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
  let maxWaitTime = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    for (const model of MODELS) {
      const shuffled = [...keys].sort(() => Math.random() - 0.5);
      for (const key of shuffled) {
        try {
          console.log(`[AI Utility] Trying model ${model} (Attempt ${attempt + 1}) with key ...${key.slice(-4)}`);
          const ai = new GoogleGenAI({ apiKey: key });
          const res = await ai.models.generateContent({ 
            model, 
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          
          if (!res.text) continue;

          const text = res.text;
          const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          const raw = jsonMatch ? jsonMatch[0] : text;
          return JSON.parse(raw.trim());
        } catch (err: any) {
          const errMsg = err.message || "";
          if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
            const match = errMsg.match(/retry in ([\d\.]+)s/);
            if (match && match[1]) {
              const waitTime = (Math.ceil(parseFloat(match[1])) + 1) * 1000;
              if (waitTime > maxWaitTime) maxWaitTime = waitTime;
            } else {
              if (15000 > maxWaitTime) maxWaitTime = 15000;
            }
          }
        }
      }
    }
    
    // If we exhausted all keys and models, and we have a wait time, wait ONCE
    if (attempt < maxRetries && maxWaitTime > 0) {
      // Cap the maximum wait time to 15 seconds to prevent the browser from hanging endlessly
      const actualWait = Math.min(maxWaitTime, 15000); 
      console.log(`[AI Rate Limit] All keys exhausted. Waiting ${actualWait / 1000}s before next attempt...`);
      await delay(actualWait);
      maxWaitTime = 0; // reset for next attempt
    } else if (attempt < maxRetries) {
      await delay(5000);
    }
  }
  
  // Don't throw a fatal error, just return a fallback JSON so the UI doesn't crash completely
  console.error("[AI Utility] Fatal error: All API keys exhausted after retries.");
  return { candidates: [], latest_role: null, years: null };
}
