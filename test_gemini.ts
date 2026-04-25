import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

async function run() {
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim());
  if(!keys.length || !keys[0]) {
    console.log("No keys");
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey: keys[0] });
  const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
  
  for(const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Say hello",
      });
      console.log(`Model ${model} OK:`, response.text?.slice(0, 20));
    } catch(err: any) {
      console.log(`Model ${model} FAILED:`, err.message);
    }
  }
}
run();
