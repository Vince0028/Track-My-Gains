const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// List of potential vision models to try in order of preference
const VISION_MODELS = [
    "llama-3.2-90b-vision-preview", // Deprecated but might work for some keys? (Users report fail)
    "llama-3.2-11b-vision-preview", // Deprecated
    "llama-3.2-11b-vision-instruct", // Likely candidate
    "llama-3.2-90b-vision-instruct", // Likely candidate
    "llama-3.2-11b-vision",          // Possible production ID
    "llama-3.2-90b-vision",          // Possible production ID
    "meta-llama/llama-3.2-11b-vision-instruct", // Namespaced
    "meta-llama/llama-4-scout-17b-16e-instruct", // Preview
];

export const analyzeFoodImage = async (base64Image) => {
    if (!GROQ_API_KEY) {
        throw new Error("Groq API Key is missing. Please check your .env file.");
    }

    let lastError = null;

    // Try models sequentially until one works
    for (const model of VISION_MODELS) {
        try {
            console.log(`Attempting analysis with model: ${model}`);
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Analyze this food image. Identify the food item and estimate its calories and macronutrients (protein, carbs, fats) for a standard serving size. Return ONLY a valid JSON object with the following structure: { \"food_name\": \"Name\", \"calories\": 0, \"protein\": \"0g\", \"carbs\": \"0g\", \"fats\": \"0g\", \"serving_size\": \"description\" }. Do not include any markdown formatting or extra text."
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image // Must be a data URL e.g. "data:image/jpeg;base64,..."
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 500,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error?.message || "Unknown error";

                // If the error is about model not found or decommissioned, continue to next model
                if (errorMessage.includes("model") || errorMessage.includes("found") || errorMessage.includes("support")) {
                    console.warn(`Model ${model} failed: ${errorMessage}. Trying next...`);
                    lastError = new Error(`Model ${model}: ${errorMessage}`);
                    continue;
                }

                // If it's another error (e.g. Rate limit, invalid key), throw immediately
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error("No content received from Groq API");
            }

            // Attempt to parse JSON
            try {
                const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanContent);
            } catch (e) {
                console.error("Failed to parse JSON:", content);
                throw new Error("Failed to parse food data. Raw response: " + content);
            }

        } catch (error) {
            console.error(`Error with model ${model}:`, error);
            lastError = error;
            // If it's a network error or something not model-specific, we might still want to try next?
            // But usually fetch errors are fatal to the request not the model. 
            // We'll treat fetch errors as "try next" just in case.
        }
    }

    throw lastError || new Error("Failed to analyze image with any available vision model.");
};
