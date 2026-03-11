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
const pdf = pdfParse;

const db = new Database("shamela.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    source_type TEXT, -- 'file' or 'url'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER,
    content TEXT,
    embedding BLOB, -- Store as JSON string or binary
    page_number INTEGER,
    FOREIGN KEY(book_id) REFERENCES books(id)
  );
`);

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
  const books = db.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
  res.json(books);
});

app.get("/api/books/:id", (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
  const chunks = db.prepare("SELECT id, content, page_number FROM chunks WHERE book_id = ?").all(req.params.id);
  res.json({ ...book, chunks });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  let content = "";
  const title = req.body.title || req.file.originalname;

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    } else {
      content = fs.readFileSync(filePath, "utf-8");
    }

    const info = db.prepare("INSERT INTO books (title, author, source_type, content) VALUES (?, ?, ?, ?)").run(
      title,
      req.body.author || "Unknown",
      "file",
      content
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

    res.json({ success: true, bookId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process file" });
  }
});

app.post("/api/scrape", async (req, res) => {
  const { url, title } = req.body;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Basic scraping: get all text from main/article or body
    const content = $("article").text() || $("main").text() || $("body").text();
    
    const info = db.prepare("INSERT INTO books (title, author, source_type, content) VALUES (?, ?, ?, ?)").run(
      title || url,
      "Web Scraper",
      "url",
      content
    );

    const bookId = info.lastInsertRowid;
    const paragraphs = content.split(/\n+/);
    const insertChunk = db.prepare("INSERT INTO chunks (book_id, content, page_number) VALUES (?, ?, ?)");
    
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].trim()) {
        insertChunk.run(bookId, paragraphs[i].trim(), 1);
      }
    }

    res.json({ success: true, bookId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to scrape URL" });
  }
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
