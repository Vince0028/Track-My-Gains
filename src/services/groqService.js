const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL_NAME = "llama-3.2-90b-vision-preview"; // High-performance Vision Model

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

    try {
        // Ensure base64 string is properly formatted (data:image/jpeg;base64,...)
        const imageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL_NAME,
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
            const errorData = await response.json();
            console.error("Groq API Error Details:", errorData);
            throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Clean up markdown if model ignores instruction (less likely with json_mode but good safety)
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Vision Analysis Error:", error);
        throw new Error("Failed to analyze food. " + error.message);
    }
}
