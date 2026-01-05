const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Prioritized list of Vision Models (Verified 2026)
const VISION_MODELS = [
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Tier 1: Flagship Multimodal (Strongest)
    "meta-llama/llama-4-scout-17b-16e-instruct",     // Tier 2: Efficient Multimodal
    // "llama-3.2-90b-vision-preview" (Decommissioned)
    // "llama-3.2-11b-vision-preview" (Decommissioned)
];

export async function analyzeFoodImage(base64Image, mode = 'food', weightHint = null, userProfile = null) {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ API Key missing.");
    }

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

    const FOOD_PROMPT_BASE = `You are a nutrition expert AI. 
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

    let FOOD_PROMPT = FOOD_PROMPT_BASE;
    if (weightHint) {
        FOOD_PROMPT += `\n\n**CRITICAL CONSTRAINT**: The user has weighed this plate. The TOTAL weight of all food items MUST sum approximately to **${weightHint}g**. Distribute this weight intelligently across the identified ingredients based on visual ratios.`;
    }

    // Biometric Calibration
    if (userProfile && userProfile.height) {
        const heightCm = parseFloat(userProfile.height);
        const estHandWidth = (heightCm * 0.05).toFixed(1);
        FOOD_PROMPT += `\n\n**BIOMETRIC CALIBRATION**: The user is ${heightCm}cm tall. Estimated hand width is ~${estHandWidth}cm. IF A HAND IS VISIBLE, use this specific measurement as a ruler to determine scale/volume.`;
    }

    // Ensure base64 string is properly formatted
    const imageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    let lastError = null;

    // Iterate through models for fallback
    for (const modelName of VISION_MODELS) {
        try {
            console.log(`Attempting analysis with model: ${modelName}`);

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: mode === 'label' ? LABEL_PROMPT : FOOD_PROMPT
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: imageUrl
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1024,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Safe parse
                console.warn(`Groq API Error (${modelName}):`, response.status, errorData);
                // Throw to trigger catch block and try next model
                throw new Error(`Model ${modelName} failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Clean up markdown
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();

            console.log(`Success with model: ${modelName}`);
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error(`Attempt failed for ${modelName}:`, error.message);
            lastError = error;
            // Explicitly continue to check next available model
            continue;
        }
    }

    // If loop finishes without returning, all models failed
    console.error("All vision models failed.");
    throw new Error("Failed to analyze food. All available AI models are currently busy or out of quota. Please try again later. (" + (lastError?.message || "Unknown Error") + ")");
}

// --- GROQ CHAT IMPLEMENTATION ---

const CHAT_MODELS = [
    "llama-3.3-70b-versatile",    // Tier 1: Flagship (Fast & Smart)
    "llama-3.1-70b-versatile",    // Tier 2: Fallback
    "mixtral-8x7b-32768"          // Tier 3: High speed fallback
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

// Rate Limiting
const RATE_LIMIT_MS = 2000; // 2 seconds (Groq is fast)
let lastRequestTime = 0;

export async function chatWithGroq(prompt, userProfile = null, historySummary = null) {
    if (!GROQ_API_KEY) {
        return "CONFIGURATION ERROR: Groq API Key is missing.";
    }

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
        return "Hold up bro, you're typing too fast! Give me a sec.";
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
        dynamicInstruction += profileString + `
\n\n**PERSONALIZATION PROTOCOL**:
1. **IDENTITY**: Occasionaly use the user's name ("${full_name || 'Bro'}") to build rapport, but don't overdo it.
2. **GOAL FOCUS**: Your advice must specifically target "${fitness_goals}". If they want fat loss, don't talk about dirty bulking.
3. **BIOMETRIC SAFETY**: 
   - **Blood Pressure**: If "${blood_pressure}" indicates hypertension (sys>130 or dia>80), STRICTLY warn against high-stimulant pre-workouts and heavy valsalva maneuvers.
   - **bmi Context**: Their stats are ${height}cm / ${weight}kg. Adjust advice for their build (e.g., if heavy, suggest low-impact cardio).
   - **Age Factor**: User is ${age}. Adjust recovery volume and joint safety advice accordingly.
4. **RESPONSE STYLE**: Be the helpful, knowledgeable gym bro who knows them personally.
`;
    }

    // Add Workout History Context
    if (historySummary) {
        const { totalWorkouts, lastWorkoutDate, recentSessionCount, consistencyRating, lastWorkoutName } = historySummary;
        const historyString = `
WORKOUT HISTORY CONTEXT:
- Total Workouts: ${totalWorkouts}
- Last Workout: ${lastWorkoutName} on ${lastWorkoutDate}
- Recent Consistency (30d): ${recentSessionCount} sessions (${consistencyRating})

**HISTORY PROTOCOL**:
1. **ACKNOWLEDGE EFFORT**: If consistency is "High", hype them up! If "Low", gently motivate them to get back in the gym.
2. **REFERENCE LAST SESSION**: Mention their last workout ("${lastWorkoutName}") when relevant (e.g., "Since you just crushed ${lastWorkoutName}...").
3. **PROGRESS**: Remind them they've done ${totalWorkouts} sessions total. Consistency is key!
`;
        dynamicInstruction += historyString;
    }

    let lastError = null;

    for (const modelName of CHAT_MODELS) {
        try {
            console.log(`Attempting chat with Groq model: ${modelName}`);

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: dynamicInstruction },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Groq API Error (${modelName}): ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error(`Chat attempt failed for ${modelName}:`, error.message);
            lastError = error;
            // Try next model
        }
    }

    return "Connection Error: My brain is fried (API limit or error). Try again in a bit, bro.";
}
