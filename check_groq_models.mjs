import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GROQ_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env file");
}

if (!apiKey) {
    console.error("No VITE_GROQ_API_KEY found in .env");
    process.exit(1);
}

console.log(`Using Key: ${apiKey.slice(0, 5)}...`);

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
        fs.writeFileSync('groq_models.json', JSON.stringify(data, null, 2));
        console.log("Saved models to groq_models.json");
    } catch (err) {
        console.error("Failed to fetch models:", err);
    }
}

listModels();
