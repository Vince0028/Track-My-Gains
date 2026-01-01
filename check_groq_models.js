import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const apiKey = process.env.VITE_GROQ_API_KEY;

if (!apiKey) {
    console.error("No VITE_GROQ_API_KEY found in .env");
    process.exit(1);
}

async function listModels() {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        data.data.forEach(model => {
            console.log(`- ${model.id}`);
        });
    } catch (err) {
        console.error("Failed to fetch models:", err);
    }
}

listModels();
