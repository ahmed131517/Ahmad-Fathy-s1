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
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<LibraryDB>('library-db', 3, {
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
      },
    });
  }
  return dbPromise;
};

export const addBook = async (book: Book) => {
  const db = await initDB();
  return db.put('books', book);
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
