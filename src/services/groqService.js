const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Prioritized list of Vision Models (Verified 2026)
const VISION_MODELS = [
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Tier 1: Flagship Multimodal (Strongest)
    "meta-llama/llama-4-scout-17b-16e-instruct",     // Tier 2: Efficient Multimodal
    // "llama-3.2-90b-vision-preview" (Decommissioned)
    // "llama-3.2-11b-vision-preview" (Decommissioned)
];

export async function analyzeFoodImage(base64Image, mode = 'food') {
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

    const FOOD_PROMPT = `You are a nutrition expert AI. 
            Analyze the food image and return a STRICT JSON object.
            
            RULES:
            1. **VISUAL ESTIMATION**: Estimate calories and macros based on the food's visual appearance and volume.
            2. **FORMAT**: Return raw JSON only.
            
            Output format:
            {
                "foods": [
                    {
                        "name": "Food Name",
                        "calories": 100,
                        "protein": "20g",
                        "carbs": "10g",
                        "fats": "5g",
                        "serving_size": "1 bowl"
                    }
                ]
            }`;

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
            // Continue to next model in the loop
        }
    }

    // If loop finishes without returning, all models failed
    console.error("All vision models failed.");
    throw new Error("Failed to analyze food. All available AI models are currently busy or out of quota. Please try again later. (" + (lastError?.message || "Unknown Error") + ")");
}
