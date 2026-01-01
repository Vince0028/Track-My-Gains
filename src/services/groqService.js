import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_NAME = "gemini-2.5-flash"; // Using Flash for speed/vision

export async function analyzeFoodImage(base64Image, mode = 'food') {
    if (!apiKey) {
        throw new Error("API Key missing. Please check VITE_GEMINI_API_KEY.");
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
                        "calories": 100, // Exact number
                        "protein": "2.6g", // Exact decimal string
                        "carbs": "10.5g", // Exact decimal string
                        "fats": "5.2g", // Exact decimal string
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
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: mode === 'label' ? LABEL_PROMPT : FOOD_PROMPT
        });

        // Remove header if present (data:image/jpeg;base64,)
        const base64Data = base64Image.split(',')[1] || base64Image;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            },
            { text: "Analyze this meal for macros." },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown if model ignores instruction
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Vision Analysis Error:", error);
        throw new Error("Failed to analyze food. " + error.message);
    }
}
