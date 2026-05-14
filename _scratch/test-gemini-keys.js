const { GoogleGenAI } = require("@google/genai");
require("dotenv").config({ path: ".env.local" });

async function testGemini() {
  const keysStr = process.env.GEMINI_API_KEYS || "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  
  for (const key of keys) {
    try {
      console.log("Testing key starting with:", key.substring(0, 10));
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.models.generateContent({ 
        model: "gemini-1.5-flash", 
        contents: "Say hello" 
      });
      console.log("Success:", res.text);
      return;
    } catch (err) {
      console.error("Failed:", err.message);
    }
  }
}

testGemini();
