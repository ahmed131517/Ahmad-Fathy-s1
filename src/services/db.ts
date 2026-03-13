import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Book, Chunk, MCQ } from '../types';

interface LibraryDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { 'by-category': string };
  };
  chunks: {
    key: string;
    value: Chunk;
    indexes: { 'by-bookId': string };
  };
  mcqs: {
    key: string;
    value: MCQ;
    indexes: { 'by-bookId': string };
  };
  notes: {
    key: string;
    value: {
      id: string;
      bookId: string;
      chapterId: string;
      paragraphIndex: number;
      content: string;
      createdAt: number;
    };
    indexes: { 'by-bookId': string; 'by-chapterId': string };
  };
  annotations: {
    key: string;
    value: {
      id: string;
      bookId: string;
      chapterId: string;
      data: string; // Data URL
      createdAt: number;
    };
    indexes: { 'by-bookId': string; 'by-chapterId': string };
  };
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<LibraryDB>('library-db', 4, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('books')) {
          const store = db.createObjectStore('books', {
            keyPath: 'id',
          });
          store.createIndex('by-category', 'category');
        }
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', {
            keyPath: 'id',
          });
          chunkStore.createIndex('by-bookId', 'book_id');
        }
        if (!db.objectStoreNames.contains('mcqs')) {
          const mcqStore = db.createObjectStore('mcqs', {
            keyPath: 'id',
          });
          mcqStore.createIndex('by-bookId', 'book_id');
        }
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', {
            keyPath: 'id',
          });
          noteStore.createIndex('by-bookId', 'bookId');
          noteStore.createIndex('by-chapterId', 'chapterId');
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', {
            keyPath: 'id',
          });
          annotationStore.createIndex('by-bookId', 'bookId');
          annotationStore.createIndex('by-chapterId', 'chapterId');
        }
      },
    });
  }
  return dbPromise;
};

export const addBook = async (book: Book) => {
  const db = await initDB();
  return db.put('books', book);
};

export const updateIndexedStatus = async () => {
  const db = await initDB();
  const books = await db.getAll('books');
  
  for (const book of books) {
    const chunks = await db.getAllFromIndex('chunks', 'by-bookId', book.id as string);
    const hasChunks = chunks.length > 0;
    
    if (book.is_indexed !== hasChunks) {
      const updatedBook = { ...book, is_indexed: hasChunks };
      await db.put('books', updatedBook);
    }
  }
};

export const getBook = async (id: string | number) => {
  const db = await initDB();
  return db.get('books', id as string);
};

export const getAllBooks = async () => {
  const db = await initDB();
  return db.getAll('books');
};

export const getBooksByCategory = async (category: string) => {
  const db = await initDB();
  return db.getAllFromIndex('books', 'by-category', category);
};

export const deleteBook = async (id: string) => {
  const db = await initDB();
  const tx = db.transaction(['books', 'chunks', 'mcqs'], 'readwrite');
  await tx.objectStore('books').delete(id);
  
  // Delete associated chunks
  const chunkStore = tx.objectStore('chunks');
  const chunkIndex = chunkStore.index('by-bookId');
  let chunkCursor = await chunkIndex.openCursor(IDBKeyRange.only(id as any));
  while (chunkCursor) {
    await chunkCursor.delete();
    chunkCursor = await chunkCursor.continue();
  }

  // Delete associated mcqs
  const mcqStore = tx.objectStore('mcqs');
  const mcqIndex = mcqStore.index('by-bookId');
  let mcqCursor = await mcqIndex.openCursor(IDBKeyRange.only(id));
  while (mcqCursor) {
    await mcqCursor.delete();
    mcqCursor = await mcqCursor.continue();
  }
  
  await tx.done;
};

export const addChunk = async (chunk: Chunk) => {
  const db = await initDB();
  return db.put('chunks', chunk);
};

export const getChunksByBookId = async (bookId: string) => {
  const db = await initDB();
  return db.getAllFromIndex('chunks', 'by-bookId', bookId);
};

export const getAllChunks = async () => {
  const db = await initDB();
  return db.getAll('chunks');
};

export const addMCQ = async (mcq: MCQ) => {
  const db = await initDB();
  return db.put('mcqs', mcq);
};

export const getMCQsByBookId = async (bookId: string | number) => {
  const db = await initDB();
  return db.getAllFromIndex('mcqs', 'by-bookId', bookId as string);
};

export const updateMCQ = async (mcq: MCQ) => {
  const db = await initDB();
  return db.put('mcqs', mcq);
};

export const addNote = async (note: any) => {
  const db = await initDB();
  return db.put('notes', note);
};

export const getNotesByChapterId = async (chapterId: string) => {
  const db = await initDB();
  return db.getAllFromIndex('notes', 'by-chapterId', chapterId);
};

export const deleteNote = async (id: string) => {
  const db = await initDB();
  return db.delete('notes', id);
};

export const saveAnnotation = async (annotation: any) => {
  const db = await initDB();
  return db.put('annotations', annotation);
};

export const getAnnotationByChapterId = async (chapterId: string) => {
  const db = await initDB();
  const annotations = await db.getAllFromIndex('annotations', 'by-chapterId', chapterId);
  return annotations[0] || null;
};

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const searchChunks = async (queryEmbedding: number[], limit: number = 5) => {
  const chunks = await getAllChunks();
  
  // Calculate similarity for each chunk
  const chunksWithSimilarity = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding || [])
  }));
  
  // Sort by similarity descending
  chunksWithSimilarity.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  
  // Return top K
  return chunksWithSimilarity.slice(0, limit);
};

export const dbService = {
  getBooks: async () => {
    try {
      const localBooks = await getAllBooks();
      const response = await fetch('/api/books');
      const remoteBooks = await response.json();
      // Use a Map to deduplicate books by ID, preferring local if both exist
      const bookMap = new Map();
      remoteBooks.forEach((b: any) => bookMap.set(b.id.toString(), b));
      localBooks.forEach((b: any) => bookMap.set(b.id.toString(), b));
      return Array.from(bookMap.values());
    } catch (err) {
      console.warn("Failed to fetch remote books, returning local only.");
      return await getAllBooks();
    }
  },
  deleteBook: async (id: string) => {
    // Delete from local IDB
    await deleteBook(id);
    // Try to delete from remote SQLite
    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Failed to delete remote book:", err);
    }
  },
  uploadFile: async (formData: FormData) => {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  scrapeUrl: async (url: string, title: string) => {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    });
    return response.json();
  },
  crawlUrl: async (url: string, depth: number) => {
    const response = await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, depth }),
    });
    return response.json();
  }
};
