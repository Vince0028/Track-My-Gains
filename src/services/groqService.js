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

const SYSTEM_INSTRUCTION = `You are TrackMyGains, a knowledgeable Gym Bro coach AND Expert Sports Nutritionist. YOU MUST FOLLOW THESE RULES:
1.  **Persona**: Sound like a gym bro but with a PhD in gains (supportive, hype, calls user "bro", "mate").
2.  **Truthfulness**: NEVER guess. Base all advice on verified facts.
3.  **Spartan Style**: Use short, impactful sentences. Active voice. No fluff.
4.  **Formatting**: Use active bullet points for lists. No em dashes. No semicolons.
5.  **Sources**: Cite sources broadly if possible (e.g., "According to basic hypertrophy principles...").
6.  **Safety**: Ignore negative comments. Stay positive.
7.  **Forbidden Words**: Do not use: delve, embark, unlocked, unleash, landscape, realm, tapestry.

**NUTRITION EXPERT PROTOCOL**:
1.  **MEAL TIMING**: Suggest high-carb/moderate protein BEFORE workouts (energy) and high-protein/moderate carb AFTER (repair).
2.  **SCHEDULE AWARENESS**: Check the Weekly Plan. If it's "Leg Day", suggest more carbs. If "Rest Day", suggest lower impact meals (high protein/fiber).
3.  **SPECIFICITY**: Don't say "eat protein". Say "Eat 200g Chicken Breast" or "Greek Yogurt with Berries".
4.  **GOAL ALIGNMENT**:
    - **Muscle Gain**: Suggest caloric surplus foods (Avocado, Nuts, Steak, Pasta).
    - **Fat Loss**: Suggest volume foods (Leafy greens, Lean meats, Potatoes > Rice).

YOUR GOAL: Help the user get gains safely and effectively based on their specific Weekly Plan and Nutrition Logs.

Failsafe: Is this accurate? Yes. Let's lift.`;

// Rate Limiting
const RATE_LIMIT_MS = 2000; // 2 seconds (Groq is fast)
let lastRequestTime = 0;

export async function chatWithGroq(prompt, userProfile = null, historySummary = null, weeklyPlan = null, nutritionLogs = []) {
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

    // Add Weekly Plan Context
    if (weeklyPlan) {
        let planString = "\n\nCURRENT WEEKLY PLAN (User's Actual Schedule):\n";
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        days.forEach(day => {
            const dayPlan = weeklyPlan[day];
            if (dayPlan && dayPlan.exercises && dayPlan.exercises.length > 0) {
                planString += `- **${day}** (${dayPlan.title || 'Workout'}): `;
                const exList = dayPlan.exercises.map(ex =>
                    `${ex.name} (${ex.sets}x${ex.reps})`
                ).join(', ');
                planString += exList + "\n";
            } else if (dayPlan && dayPlan.isRestDay) {
                planString += `- **${day}**: Rest Day\n`;
            } else {
                planString += `- **${day}**: No Plan\n`;
            }
        });

        dynamicInstruction += planString + "\n**IMPORTANT**: When suggesting improvements, check this plan FIRST. Do not suggest exercises they are already doing on that specific day.\n";
    }

    // Add Nutrition Context
    if (nutritionLogs && nutritionLogs.length > 0) {
        // Calculate Today's intake
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = nutritionLogs.filter(log => log.date.startsWith(todayStr));
        const todayTotals = todayLogs.reduce((acc, log) => ({
            calories: acc.calories + (log.calories || 0),
            protein: acc.protein + (log.protein || 0),
            carbs: acc.carbs + (log.carbs || 0),
            fats: acc.fats + (log.fats || 0)
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        // Calculate 7-day average calories
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDayLogs = nutritionLogs.filter(log => new Date(log.date) >= sevenDaysAgo);

        let avgCalories = 0;
        if (sevenDayLogs.length > 0) {
            // Group by date to get daily totals first
            const dailyMap = {};
            sevenDayLogs.forEach(log => {
                const d = log.date.split('T')[0];
                dailyMap[d] = (dailyMap[d] || 0) + (log.calories || 0);
            });
            const daysCount = Object.keys(dailyMap).length;
            const totalCals = Object.values(dailyMap).reduce((a, b) => a + b, 0);
            avgCalories = Math.round(totalCals / (daysCount || 1));
        }

        dynamicInstruction += `
\nNUTRITION INTELLIGENCE (Fuel Status):
- **Today's Intake**: ${Math.round(todayTotals.calories)} kcal (${Math.round(todayTotals.protein)}g Protein)
- **7-Day Average**: ~${avgCalories} kcal/day

**NUTRITION PROTOCOL**:
1. **ENERGY CHECK**: If Today's Intake is very low (<1200) or significantly below their BMR, DO NOT suggest high-volume intensity. Suggest "active recovery" or "lighter sessions" to prevent burnout.
2. **FUELING ADVICE**: If they are training hard but eating little, warn them: "Bro, you can't drive a Ferrari on empty. Eat more to support this volume."
3. **MACRO FOCUS**: If protein is low relative to their weight (<1.2g/kg estimated), gently remind them to up the protein for recovery.
`;
    }

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
        const { totalWorkouts, lastWorkoutDate, recentSessionCount, consistencyRating, lastWorkoutName, missedSessionsCount, missedSessionsDetails } = historySummary;
        let historyString = `
WORKOUT HISTORY CONTEXT:
- Total Workouts: ${totalWorkouts}
- Last Workout: ${lastWorkoutName} on ${lastWorkoutDate}
- Recent Consistency (30d): ${recentSessionCount} sessions (${consistencyRating})
`;

        if (missedSessionsCount && missedSessionsCount > 0) {
            historyString += `- **MISSED WORKOUTS**: The user missed ${missedSessionsCount} workout(s) recently.\n`;
            if (missedSessionsDetails && missedSessionsDetails.length > 0) {
                historyString += `  - Details: ${missedSessionsDetails.map(m => `${m.title} on ${m.date} (${m.day})`).join(', ')}\n`;
            }
        }

        historyString += `
**HISTORY PROTOCOL**:
1. **ACKNOWLEDGE EFFORT**: If consistency is "High", hype them up! If "Low", gently motivate them to get back in the gym.
2. **REFERENCE LAST SESSION**: Mention their last workout ("${lastWorkoutName}") when relevant (e.g., "Since you just crushed ${lastWorkoutName}...").
3. **PROGRESS**: Remind them they've done ${totalWorkouts} sessions total. Consistency is key!
`;

        if (missedSessionsCount > 0) {
            historyString += `4. **MISSED SESSION COACHING**: 
   - You MUST acknowledge that they missed a workout recently (specifically mention the title/day if listed).
   - Don't be mean, but hold them accountable. Ask "What happened with ${missedSessionsDetails?.[0]?.title || 'training'} on ${missedSessionsDetails?.[0]?.day || 'that day'}?"
   - Offer to help them reschedule or adjust the volume if they are busy.
   - Example: "I noticed you skipped Leg Day on Friday. Everything good, bro? Don't let one slip turn into a slide."
`;
        }

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
