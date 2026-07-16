const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up Multer for image uploads (stored in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { createClient } = require('@libsql/client');

// Connect to existing database
let db;
let tursoDb;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    tursoDb = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('Connected to Turso cloud database.');
} else {
    const dbPath = path.resolve(__dirname, '../../data/health_tracker.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to local database:', err.message);
        } else {
            console.log('Connected to the local SQLite health_tracker database.');
        }
    });
}

// Global DB helpers
const fetchAll = async (query, params = []) => {
    if (tursoDb) {
        const result = await tursoDb.execute({ sql: query, args: params });
        return result.rows;
    }
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const runQuery = async (query, params = []) => {
    if (tursoDb) {
        const result = await tursoDb.execute({ sql: query, args: params });
        // Turso returns rowsAffected or lastInsertRowid
        return result.lastInsertRowid || result.rowsAffected;
    }
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            // In sqlite3, this.lastID is for inserts, this.changes is for updates/deletes
            else resolve(this.lastID || this.changes);
        });
    });
};

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await fetchAll('SELECT * FROM daily_logs ORDER BY log_date DESC');
        const symptoms = await fetchAll('SELECT * FROM symptoms');
        const bowel_movements = await fetchAll('SELECT * FROM bowel_movements');
        
        const logsWithSymptoms = logs.map(log => ({
            ...log,
            symptoms: symptoms.filter(s => s.log_date === log.log_date),
            bowel_movements: bowel_movements.filter(bm => bm.log_date === log.log_date)
        }));
        
        res.json(logsWithSymptoms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route: Get a single day's full data (logs + meals + supps + symps)
app.get('/api/logs/:date', async (req, res) => {
    const date = req.params.date;
    try {
        const log = await fetchAll('SELECT * FROM daily_logs WHERE log_date = ?', [date]);
        const meals = await fetchAll('SELECT * FROM meals WHERE log_date = ?', [date]);
        const supps = await fetchAll('SELECT * FROM supplements WHERE log_date = ?', [date]);
        const symps = await fetchAll('SELECT * FROM symptoms WHERE log_date = ?', [date]);
        const phase_times = await fetchAll('SELECT * FROM phase_times WHERE log_date = ?', [date]);
        const bowel_movements = await fetchAll('SELECT * FROM bowel_movements WHERE log_date = ?', [date]);
        
        res.json({
            log: log[0] || null,
            meals,
            supplements: supps,
            symptoms: symps,
            phase_times: phase_times,
            bowel_movements: bowel_movements
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route: AI Image Scan
app.post('/api/scan', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_google_api_key_here') {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `
        You are an expert medical data extractor. Read this whiteboard image containing daily health logs.
        The CURRENT YEAR is 2026. If a date is missing the year, you MUST use 2026. 
        CRITICAL INSTRUCTIONS:
        1. WATER TALLY MARKS: Count the tally marks for water VERY CAREFULLY. A group with a diagonal strike through it counts as exactly 5. Make sure to count every group and stray mark accurately.
        2. SLEEP/WAKE TIMES: Look closely for sleep time (usually PM) and wake up time (usually AM). NOTE: If the board says "12:xx PM" for "Sleep (Last Night)", they almost certainly meant 12:xx AM (midnight). Use common sense and parse it as "00:xx" in 24-hour time to avoid 20+ hour sleep anomalies.
        3. PHASE TIMES: Extract any exact clock times written next to phases (e.g. Lunch 1:00 PM) into the phase_times array.
        4. SUPPLEMENTS: Be extremely thorough when reading supplements, especially in the Wakeup / Morning Prep phase (e.g., L-Glutamine, etc.). Don't miss them!
        5. BOWEL MOVEMENTS: The board lists multiple bowel movements. Extract the total count, and for EACH individual bowel movement, extract whether it was 'Complete' or 'Incomplete' and the Bristol Scale number (1-7).
        6. SYMPTOMS: Look carefully at the grid for symptoms (Cramp, Bloating, Abdominal Pressure, Pain, Itch, etc.). Extract the severity numbers for each phase they appear in.
        7. PAIN QUARTERS: Pain is often written as '<Quarter>q-<Severity>' (e.g., '6q-3' means Quarter 6 has severity 3. '8q-1' means Quarter 8 has severity 1). Pay VERY close attention to the order: the number BEFORE 'q' is the area (store in notes as 'q6'), the number AFTER the dash is the severity.
        8. PHASE NOTES: If there are any general text notes written for a phase (e.g., "burning feeling"), extract it by creating a symptom with symptom_name: "Phase Note", severity: 0, and notes: "<the text>".
        9. EXACT PHASE NAMES: You MUST use the EXACT phase names from this list for all 'phase', 'timing' and 'meal_type' fields: "Wakeup / Morning Prep", "Breakfast", "Post-Breakfast", "Lunch", "Post-Lunch", "Snack", "Dinner", "Post-Dinner", "Bedtime", "Overnight". Do NOT shorten them (e.g., do not use "Wakeup").

        Extract the data into a JSON structure exactly matching this schema:
        {
          "log_date": "YYYY-MM-DD",
          "cycle_day": int,
          "sleep_time": "string (MUST be 24-hour HH:mm format, e.g. 22:30)",
          "wake_up_time": "string (MUST be 24-hour HH:mm format, e.g. 08:00)",
          "sleep_wakeups": int,
          "water_count": int (count the individual vertical tally lines carefully. e.g. 7 vertical lines = 7),
          "bowel_movement_count": int,
          "bowel_movements": [{"complete": "string (Complete/Incomplete)", "scale": int}],
          "exercises": [{"timing": "string", "exercise_name": "string"}],
          "supporting_therapy": "string",
          "phase_times": [{"phase": "string", "time": "string"}],
          "meals": [{"meal_type": "string", "food_items": "string"}],
          "supplements": [{"timing": "string", "supplement_name": "string"}],
          "symptoms": [{"timing": "string", "symptom_name": "string", "severity": int, "notes": "string (optional, e.g. q1, q6 for pain area)"}]
        }
        Return ONLY valid JSON, without any markdown formatting block.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: req.file.buffer.toString("base64"),
                        mimeType: req.file.mimetype,
                    },
                }
            ]
        });

        const rawText = response.text;
        // Clean markdown backticks if present
        const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonStr);

        res.json(extractedData);
    } catch (error) {
        console.error('AI Scan Error:', error);
        if (error.status === 429) {
             return res.status(429).json({ error: "Google AI daily free tier limit reached (1500 scans). Please try again tomorrow." });
        }
        if (error.message && error.message.includes('503')) {
            res.status(503).json({ error: 'Google AI is currently experiencing high demand. Please wait a few seconds and try again.' });
        } else {
            res.status(500).json({ error: 'Failed to process image with AI' });
        }
    }
});

// Route: AI Insights Chat
app.post('/api/insights/ask', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_google_api_key_here') {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    try {
        // Fetch full DB context
        const logs = await fetchAll('SELECT * FROM daily_logs');
        const meals = await fetchAll('SELECT * FROM meals');
        const supplements = await fetchAll('SELECT * FROM supplements');
        const symptoms = await fetchAll('SELECT * FROM symptoms');

        const dbContext = {
            daily_logs: logs,
            meals: meals,
            supplements: supplements,
            symptoms: symptoms
        };

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `
        You are an expert medical data analyst assisting a patient with tracking their health and finding correlations.
        Here is a complete JSON dump of their entire health tracking history (logs, meals, supplements, symptoms):
        
        ${JSON.stringify(dbContext)}
        
        Based ONLY on this data, please answer the following question accurately and conversationally.
        CRITICAL INSTRUCTION: Keep your response EXTREMELY short and concise (1-3 sentences maximum). Provide only a high-level summary. Do NOT list out all the details, bullet points, or specific dates unless the user explicitly asks for them. End your response by offering to provide more details if they want them.
        
        Patient's Question: "${question}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt
        });

        res.json({ answer: response.text });
    } catch (err) {
        console.error('AI Insights Error:', err);
        res.status(500).json({ error: 'Failed to process question with AI' });
    }
});

// Route: AI Weekly Summary
app.get('/api/insights/summary', async (req, res) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_google_api_key_here') {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    try {
        const logs = await fetchAll('SELECT * FROM daily_logs ORDER BY log_date DESC LIMIT 7');
        const symptoms = await fetchAll('SELECT * FROM symptoms ORDER BY log_date DESC LIMIT 50');
        const meals = await fetchAll('SELECT * FROM meals ORDER BY log_date DESC LIMIT 50');
        const supplements = await fetchAll('SELECT * FROM supplements ORDER BY log_date DESC LIMIT 50');

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `
        You are an expert health data analyst. 
        Here is the patient's data for the most recent week:
        Logs: ${JSON.stringify(logs)}
        Symptoms: ${JSON.stringify(symptoms)}
        Meals: ${JSON.stringify(meals)}
        Supplements: ${JSON.stringify(supplements)}
        
        Task 1: Write a very concise, 2-sentence summary of their health over this past week. Focus on the most prominent symptoms or overall well-being.
        Task 2: Analyze the data for correlations. Identify the main symptoms and for each, provide a brief analysis of potential triggers (like specific food, sleep hours, cycle day, or supplements) or what seems to be working well if the symptom is improving.

        Return ONLY a raw JSON object matching this schema, without any markdown formatting block:
        {
            "summary": "string",
            "symptomDetails": [
                {
                    "symptom": "string (e.g. Bloating)",
                    "analysis": "string (correlation analysis)"
                }
            ]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        console.log('AI RAW RESPONSE:', response.text);
        const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(jsonStr);

        res.json(parsedData);
    } catch (err) {
        console.error('AI Summary Error:', err);
        if (err.status === 429) {
             return res.status(429).json({ error: "Google AI rate limit reached (15 requests per minute limit). Please wait 60 seconds and try again." });
        }
        res.status(500).json({ error: 'Failed to generate summary: ' + err.message });
    }
});

// Route: Save or Update a daily log
app.post('/api/logs/save', async (req, res) => {
    const data = req.body;
    console.log("SAVE REQUEST:", JSON.stringify(data, null, 2));
    if (!data.log_date) return res.status(400).json({ error: 'log_date is required' });

    const log_date = data.log_date;

    // Using global runQuery

    try {
        // 1. Insert/Update daily_logs
        await runQuery(`
            INSERT OR REPLACE INTO daily_logs (
                log_date, cycle_day, water_count, susu_count, 
                bowel_movement_count, exercise, supporting_therapy, 
                sleep_time, sleep_wakeups, wake_up_time, total_sleep_hours, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            log_date, data.cycle_day, data.water_count, data.susu_count || 0,
            data.bowel_movement_count, data.exercise, data.supporting_therapy,
            data.sleep_time, data.sleep_wakeups, data.wake_up_time, data.total_sleep_hours
        ]);

            // 2. Meals
            if (data.meals && Array.isArray(data.meals)) {
                await runQuery("DELETE FROM meals WHERE log_date = ?", [log_date]);
                for (const meal of data.meals) {
                    await runQuery("INSERT INTO meals (log_date, meal_type, food_items) VALUES (?, ?, ?)", 
                        [log_date, meal.meal_type, meal.food_items]);
                }
            }

            // 3. Supplements
            if (data.supplements && Array.isArray(data.supplements)) {
                await runQuery("DELETE FROM supplements WHERE log_date = ?", [log_date]);
                for (const supp of data.supplements) {
                    await runQuery("INSERT INTO supplements (log_date, timing, supplement_name) VALUES (?, ?, ?)", 
                        [log_date, supp.timing, supp.supplement_name]);
                }
            }

            // 4. Symptoms
            if (data.symptoms && Array.isArray(data.symptoms)) {
                await runQuery("DELETE FROM symptoms WHERE log_date = ?", [log_date]);
                for (const symp of data.symptoms) {
                    await runQuery("INSERT INTO symptoms (log_date, timing, symptom_name, severity, notes) VALUES (?, ?, ?, ?, ?)", 
                        [log_date, symp.timing, symp.symptom_name, symp.severity, symp.notes || null]);
                }
            }

            // 5. Phase Times
            if (data.phase_times && Array.isArray(data.phase_times)) {
                await runQuery("DELETE FROM phase_times WHERE log_date = ?", [log_date]);
                for (const pt of data.phase_times) {
                    if (pt.time) {
                        await runQuery("INSERT INTO phase_times (log_date, phase, time) VALUES (?, ?, ?)", 
                            [log_date, pt.phase, pt.time]);
                    }
                }
            }

        // 6. Bowel Movements
        if (data.bowel_movements && Array.isArray(data.bowel_movements)) {
            await runQuery("DELETE FROM bowel_movements WHERE log_date = ?", [log_date]);
            for (let i = 0; i < data.bowel_movements.length; i++) {
                const bm = data.bowel_movements[i];
                await runQuery("INSERT INTO bowel_movements (log_date, idx, complete, scale) VALUES (?, ?, ?, ?)", 
                    [log_date, i, bm.complete, bm.scale]);
            }
        }

        res.json({ success: true, message: 'Data saved successfully' });
    } catch (err) {
        console.error('Database Save Error:', err);
        res.status(500).json({ error: 'Failed to save data to database: ' + err.message });
    }
});

// Route: Delete a daily log
app.delete('/api/logs/:date', async (req, res) => {
    const date = req.params.date;
    // Using global runQuery

    try {
        await runQuery("DELETE FROM daily_logs WHERE log_date = ?", [date]);
        await runQuery("DELETE FROM meals WHERE log_date = ?", [date]);
        await runQuery("DELETE FROM supplements WHERE log_date = ?", [date]);
        await runQuery("DELETE FROM symptoms WHERE log_date = ?", [date]);
        await runQuery("DELETE FROM phase_times WHERE log_date = ?", [date]);
        await runQuery("DELETE FROM bowel_movements WHERE log_date = ?", [date]);
        
        res.json({ success: true, message: 'Data deleted successfully' });
    } catch (err) {
        console.error('Database Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete data: ' + err.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
