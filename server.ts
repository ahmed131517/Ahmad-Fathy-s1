import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import mammoth from "mammoth";
import axios from "axios";
import * as cheerio from "cheerio";

// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";
// @ts-ignore
import epubParser from "epub-parser";
const pdf = pdfParse;

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("shamela.db");

// Job tracking
interface Job {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'running' | 'done' | 'error';
  type: 'file' | 'web' | 'sync' | 'crawl';
}
const jobs: Job[] = [];

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    source_type TEXT, -- 'file' or 'url'
    content TEXT,
    category TEXT DEFAULT 'General',
    format TEXT,
    is_indexed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations for existing DBs
try { db.exec("ALTER TABLE books ADD COLUMN category TEXT DEFAULT 'General'"); } catch (e) {}
try { db.exec("ALTER TABLE books ADD COLUMN format TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE books ADD COLUMN is_indexed INTEGER DEFAULT 0"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER,
    content TEXT,
    embedding BLOB, -- Store as JSON string or binary
    page_number INTEGER,
    FOREIGN KEY(book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    target_id INTEGER,
    type TEXT, -- 'commentary', 'abridgment', etc.
    FOREIGN KEY(source_id) REFERENCES books(id),
    FOREIGN KEY(target_id) REFERENCES books(id)
  );
`);

// Mock relationships if empty
const relCount = db.prepare("SELECT COUNT(*) as count FROM relationships").get() as any;
if (relCount.count === 0) {
  const books = db.prepare("SELECT id FROM books LIMIT 2").all() as any[];
  if (books.length >= 2) {
    db.prepare("INSERT INTO relationships (source_id, target_id, type) VALUES (?, ?, ?)").run(books[0].id, books[1].id, 'commentary');
  }
}

const app = express();
app.use(express.json({ limit: '50mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// API Routes
app.get("/api/books", (req, res) => {
  const books = db.prepare("SELECT *, strftime('%s', created_at) * 1000 as dateAdded FROM books ORDER BY created_at DESC").all();
  res.json(books);
});

app.get("/api/books/:id", (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
  const chunks = db.prepare("SELECT id, content, page_number FROM chunks WHERE book_id = ?").all(req.params.id);
  res.json({ ...book, chunks });
});

app.delete("/api/books/:id", (req, res) => {
  try {
    const bookId = req.params.id;
    db.prepare("DELETE FROM chunks WHERE book_id = ?").run(bookId);
    db.prepare("DELETE FROM books WHERE id = ?").run(bookId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

app.get("/api/jobs", (req, res) => {
  res.json(jobs);
});

app.get("/api/relationships", (req, res) => {
  const rels = db.prepare("SELECT * FROM relationships").all();
  res.json(rels);
});

app.post("/api/relationships", (req, res) => {
  const { source_id, target_id, type } = req.body;
  db.prepare("INSERT INTO relationships (source_id, target_id, type) VALUES (?, ?, ?)").run(source_id, target_id, type);
  res.json({ success: true });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  let content = "";
  const title = req.body.title || req.file.originalname;

  const jobId = Date.now().toString();
  jobs.push({ id: jobId, name: title, progress: 10, status: 'running', type: 'file' });

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    } else if (req.file.mimetype === "application/epub+zip") {
      const data: any = await new Promise((resolve, reject) => {
        epubParser.open(filePath, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      content = data.easy?.text || "";
    } else {
      content = fs.readFileSync(filePath, "utf-8");
    }

    const format = req.file.originalname.split('.').pop()?.toUpperCase() || 'FILE';
    const info = db.prepare("INSERT INTO books (title, author, source_type, content, format, category, is_indexed) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      title,
      req.body.author || "Unknown",
      "file",
      content,
      format,
      "مستورد",
      1
    );

    const bookId = info.lastInsertRowid;

    // Simple chunking (e.g., by paragraph or fixed size)
    const paragraphs = content.split(/\n\s*\n/);
    const insertChunk = db.prepare("INSERT INTO chunks (book_id, content, page_number) VALUES (?, ?, ?)");
    
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].trim()) {
        insertChunk.run(bookId, paragraphs[i].trim(), Math.floor(i / 5) + 1); // Mock page number
      }
    }

    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.progress = 100;
      job.status = 'done';
    }

    res.json({ success: true, bookId, jobId });
  } catch (error) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'error';
    }
    console.error(error);
    res.status(500).json({ error: "Failed to process file" });
  }
});

app.post("/api/scrape", async (req, res) => {
  const { url, title } = req.body;
  const jobId = Date.now().toString();
  jobs.push({ id: jobId, name: title || url, progress: 10, status: 'running', type: 'web' });

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Basic scraping: get all text from main/article or body
    const content = $("article").text() || $("main").text() || $("body").text();
    
    const info = db.prepare("INSERT INTO books (title, author, source_type, content, format, category, is_indexed) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      title || url,
      "Web Scraper",
      "url",
      content,
      "WEB",
      "مقالات",
      1
    );

    const bookId = info.lastInsertRowid;
    const paragraphs = content.split(/\n+/);
    const insertChunk = db.prepare("INSERT INTO chunks (book_id, content, page_number) VALUES (?, ?, ?)");
    
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].trim()) {
        insertChunk.run(bookId, paragraphs[i].trim(), 1);
      }
    }

    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.progress = 100;
      job.status = 'done';
    }

    res.json({ success: true, bookId, jobId });
  } catch (error) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'error';
    }
    console.error(error);
    res.status(500).json({ error: "Failed to scrape URL" });
  }
});

app.post("/api/crawl", async (req, res) => {
  const { url, depth } = req.body;
  const jobId = Date.now().toString();
  jobs.push({ id: jobId, name: `Crawl: ${url}`, progress: 0, status: 'running', type: 'crawl' });

  // Mock crawling
  setTimeout(() => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.progress = 50;
      setTimeout(() => {
        job.progress = 100;
        job.status = 'done';
      }, 5000);
    }
  }, 2000);

  res.json({ success: true, jobId });
});

// Semantic Search (RAG)
// Note: Frontend will provide the embedding for the query
app.post("/api/search", (req, res) => {
  const { queryEmbedding, limit = 5 } = req.body;
  
  // Since we can't do vector search in SQLite easily without extensions,
  // we'll fetch all chunks with embeddings and calculate similarity in JS.
  // For production, use a vector DB. For this applet, we'll store embeddings as JSON.
  
  const chunks = db.prepare("SELECT chunks.*, books.title as bookTitle FROM chunks JOIN books ON chunks.book_id = books.id WHERE embedding IS NOT NULL").all();
  
  const results = chunks.map((chunk: any) => {
    const emb = JSON.parse(chunk.embedding);
    const similarity = dotProduct(queryEmbedding, emb);
    return { ...chunk, similarity };
  })
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, limit);

  res.json(results);
});

app.post("/api/chunks/:id/embedding", (req, res) => {
  const { embedding } = req.body;
  db.prepare("UPDATE chunks SET embedding = ? WHERE id = ?").run(JSON.stringify(embedding), req.params.id);
  res.json({ success: true });
});

app.get("/api/chunks/unindexed", (req, res) => {
  const chunks = db.prepare("SELECT * FROM chunks WHERE embedding IS NULL LIMIT 50").all();
  res.json(chunks);
});

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
