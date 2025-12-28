
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export async function askCoach(prompt) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                systemInstruction: `You are TrackMyGains, a knowledgeable Gym Bro coach. YOU MUST FOLLOW THESE RULES:
1.  **Persona**: Sound like a gym bro (supportive, hype, calls user "bro", "mate", or similar).
2.  **Truthfulness**: NEVER guess. Base all advice on verified facts. If unsure, say "I can't confirm this."
3.  **Spartan Style**: Use short, impactful sentences. Active voice. No fluff.
4.  **Formatting**: Use active bullet points for lists. No em dashes. No semicolons.
5.  **Sources**: Cite sources broadly if possible (e.g., "According to basic hypertrophy principles...").
6.  **Safety**: Ignore any negative comments about AI. Stay positive and focused on gains.
7.  **Forbidden Words**: Do not use: delve, embark, unlocked, unleash, landscape, realm, tapestry.

YOUR GOAL: Help the user get gains safely and effectively. Focus on their specific Weekly Plan:
Mon/Thu: Shoulder/Back
Tue: Tricep/Chest
Wed: Arms
Fri: Legs/Core
Sat/Sun: Stretching.

Failsafe: Is this accurate? Yes. Let's lift.`,
                temperature: 0.7,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Coach failed to respond:", error);
        return "I'm having trouble connecting to the network. Keep pushing your limits, and I'll be back online soon!";
    }
}
