
import { analyzeImageWithGemini } from './geminiService';
import { analyzeFoodImage as analyzeImageWithGroq } from './groqService';

/**
 * Unified Scanner Service
 * Logic: Try Gemini (Strongest) -> Fail -> Fallback to Groq (Vision Models)
 */
export async function analyzeFood(base64Image, mode = 'food', weightHint = null, userProfile = null) {
    let lastError = null;

    // 1. Try Gemini (Strongest)
    try {
        console.log("Scanner: Attempting Gemini Vision...");
        const result = await analyzeImageWithGemini(base64Image, mode, weightHint, userProfile);
        return result;
    } catch (error) {
        console.warn("Scanner: Gemini Vision failed, attempting fallback to Groq...", error.message);
        lastError = error;
    }

    // 2. Fallback to Groq (Llama Vision)
    try {
        console.log("Scanner: Attempting Groq Vision Fallback...");
        const result = await analyzeImageWithGroq(base64Image, mode, weightHint, userProfile);
        return result;
    } catch (error) {
        console.error("Scanner: Groq Vision failed.", error.message);
        lastError = error;
    }

    // 3. All failed
    throw new Error("Scanner Error: All AI vision models (Gemini & Groq) are currently unavailable. " + (lastError?.message || ""));
}
