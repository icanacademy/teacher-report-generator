const fs = require('fs');
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const TEACHERS_DATABASE_ID = process.env.NOTION_TEACHERS_DATABASE_ID;
const SKILLS_DATABASE_ID = process.env.NOTION_SKILLS_DATABASE_ID;
const FOCUSSKILL_DATABASE_ID = process.env.NOTION_FOCUSSKILL_DATABASE_ID;

// Endpoint to fetch ALL students from Notion (with pagination)
app.get('/api/students', async (req, res) => {
    try {
        console.log('Attempting to fetch ALL students from database ID:', DATABASE_ID);

        let allStudents = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const response = await notion.databases.query({
                database_id: DATABASE_ID,
                sorts: [
                    {
                        property: 'Full Name',
                        direction: 'ascending',
                    },
                ],
                start_cursor: nextCursor,
                page_size: 100
            });

            console.log(`Fetched ${response.results.length} students in this batch`);

            const students = response.results.map(page => {
                const properties = page.properties;

                let studentId = 'N/A';
                const possibleIdFields = ['Student ID', 'student id', 'ID', 'StudentID', 'student_id'];
                let studentIdProp = null;

                for (const fieldName of possibleIdFields) {
                    if (properties[fieldName]) {
                        studentIdProp = properties[fieldName];
                        break;
                    }
                }

                if (studentIdProp) {
                    if (studentIdProp.unique_id) {
                        const prefix = studentIdProp.unique_id.prefix || '';
                        const number = studentIdProp.unique_id.number || '';
                        studentId = prefix + '-' + number;
                    } else if (studentIdProp.rich_text && studentIdProp.rich_text.length > 0) {
                        studentId = studentIdProp.rich_text[0].plain_text;
                    } else if (studentIdProp.title && studentIdProp.title.length > 0) {
                        studentId = studentIdProp.title[0].plain_text;
                    } else if (studentIdProp.number !== null && studentIdProp.number !== undefined) {
                        studentId = studentIdProp.number.toString();
                    } else if (studentIdProp.select) {
                        studentId = studentIdProp.select.name;
                    } else if (studentIdProp.formula && studentIdProp.formula.string) {
                        studentId = studentIdProp.formula.string;
                    }
                }

                // Helper function to get number value
                const getNumber = (prop) => {
                    if (prop?.number !== null && prop?.number !== undefined) {
                        return prop.number;
                    }
                    return null;
                };

                // Helper function to get text value
                const getText = (prop) => {
                    if (prop?.rich_text?.length > 0) {
                        return prop.rich_text[0].plain_text;
                    }
                    if (prop?.title?.length > 0) {
                        return prop.title[0].plain_text;
                    }
                    if (prop?.select?.name) {
                        return prop.select.name;
                    }
                    return null;
                };

                return {
                    id: page.id,
                    fullName: properties['Full Name']?.title?.[0]?.plain_text || 'Unknown',
                    studentId: studentId,
                    wpmInitial: getNumber(properties['WPM Initial']),
                    gbwtInitial: getText(properties['GBWT Initial']),
                    readingLevelInitial: getText(properties['Reading Level Initial']),
                    interviewScore: getNumber(properties['Interview Score'])
                };
            });

            allStudents = allStudents.concat(students);

            hasMore = response.has_more;
            nextCursor = response.next_cursor;
        }

        console.log(`Total students fetched: ${allStudents.length}`);
        if (allStudents.length > 0) {
            console.log('Sample student:', allStudents[0]);
        }

        res.json(allStudents);
    } catch (error) {
        console.error('Error fetching students from Notion:', error);
        let errorMessage = 'Failed to fetch students from Notion';
        if (error.code === 'object_not_found') {
            errorMessage = 'Database not found or not shared with integration. Please share the database with your Notion integration.';
        } else if (error.code === 'unauthorized') {
            errorMessage = 'Invalid API token. Please check your Notion integration token.';
        }
        res.status(500).json({
            error: errorMessage,
            details: error.message
        });
    }
});

// Endpoint to fetch ALL teachers from Notion (with pagination)
app.get('/api/teachers', async (req, res) => {
    try {
        console.log('Attempting to fetch ALL teachers from database ID:', TEACHERS_DATABASE_ID);

        let allTeachers = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const response = await notion.databases.query({
                database_id: TEACHERS_DATABASE_ID,
                sorts: [
                    {
                        property: 'Full Name',
                        direction: 'ascending',
                    },
                ],
                start_cursor: nextCursor,
                page_size: 100
            });

            console.log(`Fetched ${response.results.length} teachers in this batch`);

            const teachers = response.results.map(page => {
                const properties = page.properties;

                let teacherId = 'N/A';
                const possibleIdFields = ['ID', 'Teacher ID', 'teacher id', 'TeacherID', 'teacher_id', 'ID Number'];
                let teacherIdProp = null;

                for (const fieldName of possibleIdFields) {
                    if (properties[fieldName]) {
                        teacherIdProp = properties[fieldName];
                        break;
                    }
                }

                if (teacherIdProp) {
                    if (teacherIdProp.unique_id) {
                        const prefix = teacherIdProp.unique_id.prefix || '';
                        const number = teacherIdProp.unique_id.number || '';
                        teacherId = prefix + '-' + number;
                    } else if (teacherIdProp.rich_text && teacherIdProp.rich_text.length > 0) {
                        teacherId = teacherIdProp.rich_text[0].plain_text;
                    } else if (teacherIdProp.title && teacherIdProp.title.length > 0) {
                        teacherId = teacherIdProp.title[0].plain_text;
                    } else if (teacherIdProp.number !== null && teacherIdProp.number !== undefined) {
                        teacherId = teacherIdProp.number.toString();
                    } else if (teacherIdProp.select) {
                        teacherId = teacherIdProp.select.name;
                    } else if (teacherIdProp.formula && teacherIdProp.formula.string) {
                        teacherId = teacherIdProp.formula.string;
                    }
                }

                return {
                    id: page.id,
                    fullName: properties['Full Name']?.title?.[0]?.plain_text || 'Unknown',
                    teacherId: teacherId,
                };
            });

            allTeachers = allTeachers.concat(teachers);

            hasMore = response.has_more;
            nextCursor = response.next_cursor;
        }

        console.log(`Total teachers fetched: ${allTeachers.length}`);
        if (allTeachers.length > 0) {
            console.log('Sample teacher:', allTeachers[0]);
        }

        res.json(allTeachers);
    } catch (error) {
        console.error('Error fetching teachers from Notion:', error);
        let errorMessage = 'Failed to fetch teachers from Notion';
        if (error.code === 'object_not_found') {
            errorMessage = 'Teacher database not found or not shared with integration. Please share the database with your Notion integration.';
        } else if (error.code === 'unauthorized') {
            errorMessage = 'Invalid API token. Please check your Notion integration token.';
        }
        res.status(500).json({
            error: errorMessage,
            details: error.message
        });
    }
});

app.get('/api/skills', async (req, res) => {
    try {
        console.log('Attempting to fetch skills from database ID:', SKILLS_DATABASE_ID);
        let allSkills = [];
        let hasMore = true;
        let nextCursor = undefined;

        const getPlainText = (prop) => {
            if (prop?.rich_text?.length > 0) {
                return prop.rich_text[0].plain_text;
            }
            if (prop?.title?.length > 0) {
                return prop.title[0].plain_text;
            }
            return '';
        };

        while (hasMore) {
            const response = await notion.databases.query({
                database_id: SKILLS_DATABASE_ID,
                start_cursor: nextCursor,
                page_size: 100,
            });

            const skills = response.results.map(page => {
                const properties = page.properties;

                return {
                    subject: getPlainText(properties.SUBJECT),
                    skill: getPlainText(properties.SKILL),
                    microskills: [
                        getPlainText(properties['MICROSKILLS 1']),
                        getPlainText(properties['MICROSKILLS 2']),
                        getPlainText(properties['MICROSKILLS 3']),
                        getPlainText(properties['MICROSKILLS 4']),
                        getPlainText(properties['MICROSKILLS 5']),
                    ].filter(ms => ms),
                };
            });

            allSkills = allSkills.concat(skills);
            hasMore = response.has_more;
            nextCursor = response.next_cursor;
        }

        const skillsBySubject = allSkills.reduce((acc, item) => {
            if (!acc[item.subject]) {
                acc[item.subject] = [];
            }
            acc[item.subject].push({
                skill: item.skill,
                microskills: item.microskills,
            });
            return acc;
        }, {});

        res.json(skillsBySubject);
    } catch (error) {
        console.error('Error fetching skills from Notion:', error);
        res.status(500).json({ error: 'Failed to fetch skills from Notion' });
    }
});

// Endpoint to fetch FocusSkill data from Notion
app.get('/api/focusskills', async (req, res) => {
    try {
        console.log('Attempting to fetch focus skills from database ID:', FOCUSSKILL_DATABASE_ID);
        let allFocusSkills = [];
        let hasMore = true;
        let nextCursor = undefined;

        const getPlainText = (prop) => {
            if (prop?.rich_text?.length > 0) {
                return prop.rich_text[0].plain_text;
            }
            if (prop?.title?.length > 0) {
                return prop.title[0].plain_text;
            }
            return '';
        };

        while (hasMore) {
            const response = await notion.databases.query({
                database_id: FOCUSSKILL_DATABASE_ID,
                sorts: [
                    {
                        property: 'FocusSkill',
                        direction: 'ascending',
                    },
                ],
                start_cursor: nextCursor,
                page_size: 100,
            });

            console.log(`Fetched ${response.results.length} focus skills in this batch`);

            const focusSkills = response.results.map(page => {
                const properties = page.properties;
                return getPlainText(properties.FocusSkill);
            }).filter(skill => skill); // Remove empty values

            allFocusSkills = allFocusSkills.concat(focusSkills);
            hasMore = response.has_more;
            nextCursor = response.next_cursor;
        }

        console.log(`Total focus skills fetched: ${allFocusSkills.length}`);
        res.json(allFocusSkills);
    } catch (error) {
        console.error('Error fetching focus skills from Notion:', error);
        let errorMessage = 'Failed to fetch focus skills from Notion';
        if (error.code === 'object_not_found') {
            errorMessage = 'FocusSkill database not found or not shared with integration. Please share the database with your Notion integration.';
        } else if (error.code === 'unauthorized') {
            errorMessage = 'Invalid API token. Please check your Notion integration token.';
        }
        res.status(500).json({
            error: errorMessage,
            details: error.message
        });
    }
});

// ── CSV Cache System for Report History ──
const CSV_FILE_PATH = './reports.csv';
let csvCache = null;
let csvMtime = null;

const ONLINE_CSV_FILE_PATH = './online-reports.csv';
let onlineCsvCache = null;
let onlineCsvMtime = null;

const CSV_HEADERS = [
    'Date', 'Day of Week', 'Student Name', 'WPM Initial', 'GBWT Initial',
    'Reading Level Initial', 'Interview Score', 'Teacher Name', 'Subject',
    'Skill Focus', 'SF Met', 'Current Lesson', 'Homework', 'Activities Finished',
    'Activities Not Finished', 'Student Gender', 'Attention', 'Retention',
    'Comprehension', 'Behavior', 'Handwriting', 'Conversation',
    'Skills', 'Scores', 'Narrative'
];

const ONLINE_CSV_HEADERS = [...CSV_HEADERS, 'Class Type'];

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
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
}

function splitCSVLines(content) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            currentLine += char;
        } else if (char === '\n' && !inQuotes) {
            if (currentLine.trim()) lines.push(currentLine);
            currentLine = '';
        } else if (char === '\r') {
            // skip
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) lines.push(currentLine);
    return lines;
}

function loadCSV() {
    if (!fs.existsSync(CSV_FILE_PATH)) return [];
    const stat = fs.statSync(CSV_FILE_PATH);
    if (csvCache && csvMtime && stat.mtimeMs === csvMtime) return csvCache;

    const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = splitCSVLines(content);
    if (lines.length < 2) { csvCache = []; csvMtime = stat.mtimeMs; return []; }

    const headerFields = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headerFields.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
        row._rowIndex = i;
        rows.push(row);
    }
    csvCache = rows;
    csvMtime = stat.mtimeMs;
    return rows;
}

function invalidateCSVCache() {
    csvCache = null;
    csvMtime = null;
}

function loadOnlineCSV() {
    if (!fs.existsSync(ONLINE_CSV_FILE_PATH)) return [];
    const stat = fs.statSync(ONLINE_CSV_FILE_PATH);
    if (onlineCsvCache && onlineCsvMtime && stat.mtimeMs === onlineCsvMtime) return onlineCsvCache;

    const content = fs.readFileSync(ONLINE_CSV_FILE_PATH, 'utf-8');
    const lines = splitCSVLines(content);
    if (lines.length < 2) { onlineCsvCache = []; onlineCsvMtime = stat.mtimeMs; return []; }

    const headerFields = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headerFields.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
        row._rowIndex = i;
        rows.push(row);
    }
    onlineCsvCache = rows;
    onlineCsvMtime = stat.mtimeMs;
    return rows;
}

function invalidateOnlineCSVCache() {
    onlineCsvCache = null;
    onlineCsvMtime = null;
}

// Search reports endpoint
app.get('/api/reports/search', (req, res) => {
    try {
        const { student, teacher, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        let rows = loadCSV();

        if (student) {
            const s = student.toLowerCase();
            rows = rows.filter(r => (r['Student Name'] || '').toLowerCase().includes(s));
        }
        if (teacher) {
            const t = teacher.toLowerCase();
            rows = rows.filter(r => (r['Teacher Name'] || '').toLowerCase().includes(t));
        }
        if (dateFrom) {
            rows = rows.filter(r => r['Date'] >= dateFrom);
        }
        if (dateTo) {
            rows = rows.filter(r => r['Date'] <= dateTo);
        }

        // Sort newest first
        rows.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''));

        const total = rows.length;
        const pageNum = Math.max(1, parseInt(page));
        const lim = Math.max(1, Math.min(100, parseInt(limit)));
        const totalPages = Math.ceil(total / lim) || 1;
        const start = (pageNum - 1) * lim;
        const paged = rows.slice(start, start + lim);

        const results = paged.map(r => ({
            rowIndex: r._rowIndex,
            date: r['Date'] || '',
            dayOfWeek: r['Day of Week'] || '',
            studentName: r['Student Name'] || '',
            teacherName: r['Teacher Name'] || '',
            subject: r['Subject'] || '',
            skillFocus: r['Skill Focus'] || '',
            sfMet: r['SF Met'] || ''
        }));

        res.json({ results, total, page: pageNum, totalPages });
    } catch (error) {
        console.error('Error searching reports:', error);
        res.status(500).json({ error: 'Failed to search reports' });
    }
});

// Get single report by row index
app.get('/api/reports/:rowIndex', (req, res) => {
    try {
        const rowIndex = parseInt(req.params.rowIndex);
        const rows = loadCSV();
        const row = rows.find(r => r._rowIndex === rowIndex);
        if (!row) return res.status(404).json({ error: 'Report not found' });

        // Parse JSON fields
        let skills = {};
        let scores = {};
        try { skills = JSON.parse(row['Skills'] || '{}'); } catch (e) { /* ignore */ }
        try { scores = JSON.parse(row['Scores'] || '{}'); } catch (e) { /* ignore */ }

        res.json({
            date: row['Date'] || '',
            dayOfWeek: row['Day of Week'] || '',
            studentName: row['Student Name'] || '',
            wpmInitial: row['WPM Initial'] || 'TBD',
            gbwtInitial: row['GBWT Initial'] || 'TBD',
            readingLevelInitial: row['Reading Level Initial'] || 'TBD',
            interviewScore: row['Interview Score'] || 'TBD',
            teacherName: row['Teacher Name'] || '',
            subject: row['Subject'] || '',
            skillFocus: row['Skill Focus'] || '',
            sfMet: row['SF Met'] || 'NO',
            currentLesson: row['Current Lesson'] || '',
            homework: row['Homework'] || '',
            activitiesFinished: row['Activities Finished'] || '',
            activitiesNotFinished: row['Activities Not Finished'] || '',
            studentGender: row['Student Gender'] || '',
            attention: row['Attention'] || '0',
            retention: row['Retention'] || '0',
            comprehension: row['Comprehension'] || '0',
            behavior: row['Behavior'] || '0',
            handwriting: row['Handwriting'] || '0',
            conversation: row['Conversation'] || '0',
            skills,
            scores,
            narrative: row['Narrative'] || ''
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

app.post('/api/generate-narrative', async (req, res) => {
    try {
        const {
            studentName,
            ratings,
            subject,
            skills,
            skillFocus,
            skillFocusMet,
            currentLesson,
            homework,
            activitiesFinished,
            activitiesNotFinished,
            studentGender,
            scores,
            date,
            dayOfWeek
        } = req.body;

        const skillsSummary = Object.entries(skills).map(([skill, data]) => {
            if (data.score === 'NA') {
                return `${skill}: NA`;
            }
            const weaknesses = data.weaknesses.length > 0 ? `Weaknesses: ${data.weaknesses.join(', ')}` : 'No weaknesses noted';
            return `${skill}: ${data.score}/5 (${weaknesses})`;
        }).join('\n- ');

        // Format scores for narrative
        const scoresList = [];
        const scoreLabels = {
            bookMaterials: 'Book/Materials',
            vocabulary: 'Vocabulary',
            classVideo: 'Class Video',
            homework: 'Homework',
            homeworkVocab: 'Homework: Vocabulary',
            weeklyTest: 'Weekly Test'
        };

        for (const [key, label] of Object.entries(scoreLabels)) {
            if (scores[key].score !== '' || scores[key].total !== '') {
                const score = scores[key].score !== '' ? scores[key].score : '-';
                const total = scores[key].total !== '' ? scores[key].total : '-';
                scoresList.push(`${label}: ${score}/${total}`);
            }
        }

        const scoresText = scoresList.length > 0 ? `\nScores:\n- ${scoresList.join('\n- ')}` : '';

        const prompt = `Instructions for AI: Generate a paragraph overall of the feedback based on the data below. First discuss the activities today. Then, in the report, generate an deep analysis of participation and its relationship with the outcome of the general skills with microskills. ${skillFocusMet ? 'Note that the skill focus was MET today - acknowledge this achievement.' : 'Note that the skill focus was NOT MET today - provide constructive recommendations for improvement.'} Do not restate the data already provided. If the goals are not achieved, then provide an action or recommendation methodology for the following day. Only based on the provided info but you may provide suggestions based on general knowledge. Use the student's first name to make it more personal. Make it one paragraph only AND AVOID BULLETS. use simple vocabulary. The student is a ${studentGender}.

the data:
Daily Monitoring Report
Student:${studentName}
Date:${date} ${dayOfWeek}
Teacher:${req.body.teacherName}
Class:${subject}
Skill Focus (SF):${skillFocus}
Skill Focus Met: ${skillFocusMet ? 'YES' : 'NO'}
Current Lesson:${currentLesson}
Homework:${homework}
Activities finished today: ${activitiesFinished}
Activities did NOT finish today: ${activitiesNotFinished}
Class Participation Ratings:
- Attention: ${ratings.attention}/5
- Retention: ${ratings.retention}/5
- Comprehension: ${ratings.comprehension}/5
- Behavior: ${ratings.behavior}/5
- Handwriting: ${ratings.handwriting}/5
- Conversation: ${ratings.conversation}/5
Skills Assessment:
- ${skillsSummary}${scoresText}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an AI assistant that generates personalized student reports for teachers. Follow the user's instructions carefully."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 250
        });

        let narrative = response.choices?.[0]?.message?.content ?? '';
        narrative = narrative.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

        // Save report data to CSV
        const classType = req.body.classType || 'In-Person';
        const isOnline = classType === 'Online';
        const csvFilePath = isOnline ? ONLINE_CSV_FILE_PATH : CSV_FILE_PATH;
        const headers = isOnline ? ONLINE_CSV_HEADERS : CSV_HEADERS;

        const skillsJSON = JSON.stringify(skills);
        const scoresJSON = JSON.stringify(scores);

        // Get student initial data from request body
        const wpmInitial = req.body.wpmInitial || 'TBD';
        const gbwtInitial = req.body.gbwtInitial || 'TBD';
        const readingLevelInitial = req.body.readingLevelInitial || 'TBD';
        const interviewScore = req.body.interviewScore || 'TBD';

        const rowValues = [
            date, dayOfWeek, studentName, wpmInitial, gbwtInitial,
            readingLevelInitial, interviewScore, req.body.teacherName, subject,
            skillFocus, skillFocusMet ? 'YES' : 'NO', currentLesson, homework, activitiesFinished,
            activitiesNotFinished, studentGender, ratings.attention, ratings.retention,
            ratings.comprehension, ratings.behavior, ratings.handwriting, ratings.conversation,
            skillsJSON, scoresJSON, narrative
        ];
        if (isOnline) {
            rowValues.push('Online');
        }
        const row = rowValues.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');

        if (!fs.existsSync(csvFilePath)) {
            fs.writeFileSync(csvFilePath, headers.join(',') + '\n');
        }
        fs.appendFileSync(csvFilePath, row + '\n');
        if (isOnline) {
            invalidateOnlineCSVCache();
        } else {
            invalidateCSVCache();
        }

        res.json({ narrative });

    } catch (error) {
        console.error('Error generating narrative:', error);
        res.status(500).json({ error: 'Failed to generate narrative report' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Network access: Find your IP with 'ifconfig | grep inet' and share http://YOUR_IP:${port}`);
});