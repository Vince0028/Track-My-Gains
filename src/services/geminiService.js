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

// --- GEMINI VISION IMPLEMENTATION ---

// Vision Models (Strongest to Fastest)
const VISION_MODELS = [
    "gemini-2.0-pro-exp-02-05", // Experimental Pro (Strongest if available)
    "gemini-1.5-pro",           // Stable Pro (High Quality)
    "gemini-2.0-flash",         // V2 Flash
    "gemini-1.5-flash"          // Stable Flash (Fast)
];

const LABEL_PROMPT = `You are a nutrition expert AI. 
Analyze the nutrition label text in the image and return a STRICT JSON object.

RULES:
1. **PRIORITIZE PER SERVING**: ALWAYS extract values from the "Per Serving" column. IGNORE "Per 100g" unless it is the ONLY column available.
2. **PRESERVE DECIMALS**: Return the EXACT decimal numbers found (e.g., if text says "2.6g", return 2.6, NOT 2).
3. **STRICT OCR**: Read the exact numbers for Calories, Protein, Carbs, and Fats.
4. **FORMAT**: Return raw JSON only.

Output format:
{
    "foods": [
        {
            "name": "Scanned Label Item",
            "calories": 100,
            "protein": "2.6g",
            "carbs": "10.5g",
            "fats": "5.2g",
            "serving_size": "1 serving"
        }
    ]
}`;

const FOOD_PROMPT = `You are a nutrition expert AI. 
Analyze the food image and return a STRICT JSON object.

ANALYSIS CHAIN OF THOUGHT:
1. **IDENTIFY & SEGMENT**: List every distinct component. If mixed (e.g. Fried Rice), estimate ratios.
2. **BRAND RECOGNITION**: Scan for logos/wrappers (e.g. "McDonalds"). If found, use official data.
3. **STATE & TEXTURE**:
   - **Density**: Is it dense (fudge) or airy (cake)? Adjust caloric density.
   - **Cooking State**: Identify if COOKED or RAW. Use appropriate caloric density (e.g. 100g Cooked Rice ~130cal vs Raw ~360cal).
4. **VOLUME & DEPTH**:
   - **Single Items**: If "1 chip" or "2 cookies", calculate for that specific count/weight (e.g. 1 chip = 2g), NOT a standard serving.
   - **Shadows**: Use peak shadows to determine if a pile is a mound or flat layer.
   - **Bone/Shells**: Subtract 30-40% volume for bone-in meat (wings/ribs) before calculating calories.
5. **HIDDEN DETECTIVE**: check for sheen/gloss. Add 1-2tsp oil/butter if shiny.
6. **CONTEXT**: Restaurant container = higher oil/sodium.

RULES:
1. **VISUAL PRECISION**: Don't guess generic values; derive them from the visual volume & density.
2. **SINGLE ITEM CHECK**: STRICTLY enforce the single item count rule.
3. **FORMAT**: Return raw JSON only.

Output format:
{
    "foods": [
        {
            "name": "Food Name",
            "calories": 100,
            "protein": "20g",
            "carbs": "10g",
            "fats": "5g",
            "serving_size": "1 bowl (approx 300g)"
        }
    ]
}`;

export async function analyzeImageWithGemini(base64Image, mode = 'food', weightHint = null, userProfile = null) {
    if (!apiKey) {
        throw new Error("GEMINI API Key missing.");
    }

    // Clean base64 string (remove data URL prefix if present)
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    let prompt = mode === 'label' ? LABEL_PROMPT : FOOD_PROMPT;

    // Add Weight Hint Constraint
    if (mode === 'food' && weightHint) {
        prompt += `\n\n**CRITICAL CONSTRAINT**: The user has weighed this plate. The TOTAL weight of all food items MUST sum approximately to **${weightHint}g**. Distribute this weight intelligently across the identified ingredients based on visual ratios.`;
    }

    // Biometric Calibration (Hand Size from Height)
    if (mode === 'food' && userProfile && userProfile.height) {
        const heightCm = parseFloat(userProfile.height);
        // Heuristic: Hand width is approx 5% of height? Or use average breadth.
        // Better heuristic: Average palm width is ~8.4cm (male) ~7.4cm (female).
        // Let's use a dynamic scaling factor: Height * 0.05
        const estHandWidth = (heightCm * 0.05).toFixed(1);
        prompt += `\n\n**BIOMETRIC CALIBRATION**: The user is ${heightCm}cm tall. Estimated hand width is ~${estHandWidth}cm. IF A HAND IS VISIBLE, use this specific measurement as a ruler to determine scale/volume.`;
    }
    let lastError = null;

    for (const modelName of VISION_MODELS) {
        try {
            console.log(`Attempting Gemini analysis with model: ${modelName}`);

            // Note: genAI is initialized at top of file
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg", // Assuming JPEG for simplicity, or we could detect
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json", // Force JSON mode
                }
            });

            const response = await result.response;
            const text = response.text();

            console.log(`Success with Gemini model: ${modelName}`);

            // Parse JSON
            try {
                // Remove any markdown code blocks if the model puts them in despite mimeType
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            } catch (jsonError) {
                console.warn(`Gemini JSON parse error for ${modelName}:`, jsonError);
                // Try next model if JSON is malformed
                throw new Error("Malformed JSON response");
            }

        } catch (error) {
            console.error(`Gemini Attempt failed for ${modelName}:`, error.message);
            lastError = error;
            // Explicitly continue to check next available model
            continue;
        }
    }

    throw new Error("All Gemini vision models failed: " + (lastError?.message || "Unknown error"));
}
