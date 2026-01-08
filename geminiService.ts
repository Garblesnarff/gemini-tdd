
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function getWaveIntel(waveNumber: number) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, tactical military-style intel briefing (max 120 characters) for Wave ${waveNumber} in a sci-fi tower defense game. Mention a potential threat or a strategic tip.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });

    return response.text?.trim() || "Enemy signatures detected. Maintain defensive formation.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Intelligence feed disrupted. Stay alert, Commander.";
  }
}
