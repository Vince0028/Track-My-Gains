import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, 'fitness data');
const outputFile = path.join(__dirname, 'populate_data.sql');
const targetUserId = '0a17aa0e-65a0-41ad-a0af-b7ce6ba83fc4'; // Old User ID to look for
const placeholderId = '0245dad7-f027-4bc6-a2a2-590e951d520d';

// Helper to escape SQL strings
const escapeSqlString = (value) => {
    if (value === null || value === undefined) return 'NULL';
    return "'" + String(value).replace(/'/g, "''") + "'";
};

// Helper to parse CSV line (basic parser handling quotes)
// Note: This is a simple parser. For complex CSVs with newlines in fields, a library is better, 
// but for this specific exported data, this should suffice if format is standard.
const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

const processFile = (filename, tableName, columnMapping) => {
    const filePath = path.join(inputDir, filename);
    if (!fs.existsSync(filePath)) return '';

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) return '';

    const headers = parseCsvLine(lines[0]);
    // Map headers to indices
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h.trim()] = i);

    let sql = '';

    // Check if user_id column exists
    if (headerMap['user_id'] === undefined) return '';

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length !== headers.length) continue;

        const userId = row[headerMap['user_id']];

        if (userId === targetUserId) {
            const values = columnMapping.map(col => {
                if (col === 'user_id') return `'${placeholderId}'`;

                const originalColName = col === 'exercises' ? 'exercises' : col; // mapping logic if needed

                let val = row[headerMap[col]];

                // Special handling for cleanups
                if (col === 'calories' || col === 'protein' || col === 'carbs' || col === 'fats') {
                    return val ? val : '0';
                }

                return escapeSqlString(val);
            });

            sql += `INSERT INTO public.${tableName} (${columnMapping.join(', ')}) VALUES (${values.join(', ')})`;

            if (tableName === 'weekly_plan') {
                sql += ` ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, updated_at = EXCLUDED.updated_at;\n`;
            } else {
                sql += ` ON CONFLICT (id) DO NOTHING;\n`;
            }
        }
    }
    return sql;
};

const generate = () => {
    let output = `-- SQL Script to populate data
-- IMPORTANT: Replace '${placeholderId}' with your actual new Supabase User UID before running.

`;

    // 1. Weekly Plan
    // CSV headers: user_id,plan,updated_at
    output += processFile('weekly_plan_rows.csv', 'weekly_plan', ['user_id', 'plan', 'updated_at']);
    output += '\n';

    // 2. Sessions
    // CSV headers: id,user_id,title,date,exercises,created_at
    output += processFile('sessions_rows.csv', 'sessions', ['id', 'user_id', 'title', 'date', 'exercises', 'created_at']);
    output += '\n';

    // 3. Daily Nutrition
    // CSV headers: id,user_id,date,meal_name,calories,protein,carbs,fats,foods,created_at
    output += processFile('daily_nutrition_rows.csv', 'daily_nutrition', ['id', 'user_id', 'date', 'meal_name', 'calories', 'protein', 'carbs', 'fats', 'foods', 'created_at']);
    output += '\n';

    fs.writeFileSync(outputFile, output);
    console.log(`Generated ${outputFile}`);
};

generate();
