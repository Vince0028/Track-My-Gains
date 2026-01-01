import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Priority list of models to try
const MODELS = [
    "gemini-2.5-flash",       // Primary
    "gemini-2.0-flash-exp",   // Secondary (Experimental)
    "gemini-1.5-flash",       // Fallback (Fast)
    "gemini-1.5-pro",         // Final Fallback (Quality)
];

const SYSTEM_INSTRUCTION = `You are TrackMyGains, a knowledgeable Gym Bro coach. YOU MUST FOLLOW THESE RULES:
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

Failsafe: Is this accurate? Yes. Let's lift.`;

// Rate Limiting Logic
const RATE_LIMIT_MS = 5000; // 5 seconds between requests
let lastRequestTime = 0;

export async function askCoach(prompt, userProfile = null) {
    if (!apiKey) {
        console.error("VITE_GEMINI_API_KEY is missing!");
        return "CONFIGURATION ERROR: API Key is missing. Please add VITE_GEMINI_API_KEY to your Vercel Environment Variables.";
    }

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
        const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastRequestTime)) / 1000);
        return `Whoa, slow down bro! I need ${remaining} more seconds to catch my breath.`;
    }
    lastRequestTime = now;

    // Construct dynamic system instruction
    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (userProfile) {
        const { full_name, age, gender, height, weight, fitness_goals, blood_pressure } = userProfile;
        const profileString = `
USER PROFILE:
- Name: ${full_name || 'Lightweight'}
- Age: ${age || 'Unknown'}
- Gender: ${gender || 'Unknown'}
- Height: ${height || '?'} cm
- Weight: ${weight || '?'} kg
- Blood Pressure: ${blood_pressure || 'Unknown'}
- Goal: ${fitness_goals || 'Getting Huge'}
`;
        dynamicInstruction += profileString + "\n\nTAILOR YOUR ADVICE TO THIS PROFILE.";
    }

    // Try models in order
    for (const modelName of MODELS) {
        try {
            console.log(`Attempting to generate with model: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: dynamicInstruction,
            });

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                },
            });
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error.message);
            // If it's the last model, throw the error to be caught by the outer block
            if (modelName === MODELS[MODELS.length - 1]) {
                console.error("All models failed.");
                return `Connection Error: All AI models are currently busy or down. Please try again later. (${error.message})`;
            }
            // Otherwise loop to next model
            continue;
        }
    }
}
