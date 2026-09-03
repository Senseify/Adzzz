require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "992012").trim();

// Ensure data folder exists (uses /tmp in serverless environments like Vercel)
const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? "/tmp" : path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dataDir, "birthday.db");
const db = new DatabaseSync(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    admin_reply TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    replied_at TEXT
  );

  CREATE TABLE IF NOT EXISTS future_letter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    letter_text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    data TEXT,
    completed INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
  );
`);

// Prepared Statements for efficiency & security
const insertAnswerStmt = db.prepare(`
  INSERT INTO answers (question_id, question_text, answer_text, created_at)
  VALUES (?, ?, ?, ?)
`);

const insertQuestionStmt = db.prepare(`
  INSERT INTO questions (question_text, created_at)
  VALUES (?, ?)
`);

const insertLetterStmt = db.prepare(`
  INSERT INTO future_letter (letter_text, created_at)
  VALUES (?, ?)
`);

const upsertInteractionStmt = db.prepare(`
  INSERT INTO interactions (name, data, completed, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    data = excluded.data,
    completed = excluded.completed,
    updated_at = excluded.updated_at
`);

const getAllAnswersStmt = db.prepare(`
  SELECT id, question_id, question_text, answer_text, status, created_at
  FROM answers
  ORDER BY id DESC
`);

const getAllQuestionsStmt = db.prepare(`
  SELECT id, question_text, admin_reply, status, created_at, replied_at
  FROM questions
  ORDER BY id DESC
`);

const getLatestLetterStmt = db.prepare(`
  SELECT id, letter_text, created_at
  FROM future_letter
  ORDER BY id DESC
  LIMIT 1
`);

const getAllInteractionsStmt = db.prepare(`
  SELECT name, data, completed, updated_at
  FROM interactions
`);

const replyQuestionStmt = db.prepare(`
  UPDATE questions
  SET admin_reply = ?, status = 'replied', replied_at = ?
  WHERE id = ?
`);

const updateAnswerStatusStmt = db.prepare(`
  UPDATE answers
  SET status = ?
  WHERE id = ?
`);

// In-memory active session tokens for secure admin access
const activeSessions = new Set();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Authentication Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = req.cookies.admin_session || bearerToken;
  if (token && activeSessions.has(token)) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
}

// =======================================================================
// PUBLIC API ENDPOINTS (SUBMISSIONS ONLY — NEVER EXPOSE DATA PUBLICLY)
// =======================================================================

// 1. Submit answer to one of the 6 questions
app.post("/api/answers", (req, res) => {
  try {
    const { questionId, questionText, answerText } = req.body;
    if (!questionId || !questionText || !answerText || !answerText.trim()) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const now = new Date().toISOString();
    insertAnswerStmt.run(Number(questionId), questionText.trim(), answerText.trim(), now);

    return res.json({ success: true, message: "Answer saved ❤️" });
  } catch (err) {
    console.error("Error saving answer:", err);
    return res.status(500).json({ success: false, message: "Failed to save answer." });
  }
});

// 2. Submit a question from her to him
app.post("/api/questions", (req, res) => {
  try {
    const { questionText } = req.body;
    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ success: false, message: "Question text is required." });
    }

    const now = new Date().toISOString();
    insertQuestionStmt.run(questionText.trim(), now);

    return res.json({ success: true, message: "Question sent ❤️" });
  } catch (err) {
    console.error("Error saving question:", err);
    return res.status(500).json({ success: false, message: "Failed to send question." });
  }
});

// 3. Submit future letter
app.post("/api/letter", (req, res) => {
  try {
    const { letterText } = req.body;
    if (!letterText || !letterText.trim()) {
      return res.status(400).json({ success: false, message: "Letter text is required." });
    }

    const now = new Date().toISOString();
    insertLetterStmt.run(letterText.trim(), now);

    return res.json({ success: true, message: "Letter sealed ❤️" });
  } catch (err) {
    console.error("Error saving future letter:", err);
    return res.status(500).json({ success: false, message: "Failed to save letter." });
  }
});

// 4. Save Message in the Stars completion
app.post("/api/stars-progress", (req, res) => {
  try {
    const { completed, message } = req.body;
    const now = new Date().toISOString();
    upsertInteractionStmt.run("stars_message", message || "", completed ? 1 : 0, now);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving stars progress:", err);
    return res.status(500).json({ success: false });
  }
});

// 5. Generic interaction tracking (Unsaid thoughts read, moments opened)
app.post("/api/interaction", (req, res) => {
  try {
    const { name, data, completed } = req.body;
    if (!name) return res.status(400).json({ success: false });
    const now = new Date().toISOString();
    const completedVal = typeof completed === "number" ? completed : (completed ? 1 : 0);
    upsertInteractionStmt.run(name, data || "", completedVal, now);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving interaction:", err);
    return res.status(500).json({ success: false });
  }
});

// =======================================================================
// AUTHENTICATION ENDPOINTS
// =======================================================================

app.post("/api/admin/login", (req, res) => {
  const entered = String(req.body.password || "").trim();
  if (!entered || entered !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Incorrect passkey." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.add(token);

  res.cookie("admin_session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({ success: true, message: "Welcome back.", token });
});

app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = req.cookies.admin_session || bearerToken;
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie("admin_session");
  return res.json({ success: true, message: "Logged out." });
});

app.get("/api/admin/check-auth", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = req.cookies.admin_session || bearerToken;
  const isAuthenticated = Boolean(token && activeSessions.has(token));
  return res.json({ authenticated: isAuthenticated });
});

// =======================================================================
// PROTECTED ADMIN ENDPOINTS (DATA RETRIEVAL & REPLIES)
// =======================================================================

app.get("/api/admin/data", requireAdmin, (req, res) => {
  try {
    const answers = getAllAnswersStmt.all();
    const questions = getAllQuestionsStmt.all();
    const futureLetter = getLatestLetterStmt.all()[0] || null;
    const interactions = getAllInteractionsStmt.all();

    // Calculate metrics
    const answeredQuestionIds = new Set(answers.map((a) => a.question_id));
    const starsInteraction = interactions.find((i) => i.name === "stars_message");
    const momentsInteraction = interactions.find((i) => i.name === "moments_opened_count");
    const unsaidInteraction = interactions.find((i) => i.name === "unsaid_thoughts_read");

    return res.json({
      success: true,
      stats: {
        questionsAnswered: answeredQuestionIds.size,
        totalQuestionsAnswered: answers.length,
        questionsAskedCount: questions.length,
        hasFutureLetter: Boolean(futureLetter),
        starsCompleted: Boolean(starsInteraction && starsInteraction.completed),
        momentsOpenedCount: momentsInteraction ? (parseInt(momentsInteraction.data, 10) || momentsInteraction.completed || 0) : 0,
        unsaidThoughtsRead: Boolean(unsaidInteraction && unsaidInteraction.completed)
      },
      answers,
      questions,
      futureLetter,
      interactions
    });
  } catch (err) {
    console.error("Error fetching admin data:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard data." });
  }
});

// Admin reply to her questions
app.post("/api/admin/reply", requireAdmin, (req, res) => {
  try {
    const { questionId, replyText } = req.body;
    if (!questionId || !replyText || !replyText.trim()) {
      return res.status(400).json({ success: false, message: "Question ID and reply text are required." });
    }

    const now = new Date().toISOString();
    replyQuestionStmt.run(replyText.trim(), now, Number(questionId));

    return res.json({ success: true, message: "Reply saved." });
  } catch (err) {
    console.error("Error saving admin reply:", err);
    return res.status(500).json({ success: false, message: "Failed to save reply." });
  }
});

// Admin mark answer as read
app.post("/api/admin/answer-status", requireAdmin, (req, res) => {
  try {
    const { answerId, status } = req.body;
    if (!answerId || !status) {
      return res.status(400).json({ success: false });
    }
    updateAnswerStatusStmt.run(status, Number(answerId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Error updating answer status:", err);
    return res.status(500).json({ success: false });
  }
});

// =======================================================================
// ROUTES & STATIC ASSETS
// =======================================================================

// Serve Admin Dashboard HTML
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Serve main website and static assets
app.use(express.static(__dirname));

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✨ Birthday Website & Secret Admin Backend running on http://localhost:${PORT}`);
    console.log(`🔐 Secret Admin Dashboard available at http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
