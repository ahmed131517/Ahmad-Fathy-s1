export interface Book {
  id: number | string;
  title: string;
  author: string;
  author_death_year?: string;
  ai_summary?: string;
  source_type: 'file' | 'url' | 'db';
  content: string;
  created_at: string;
  is_indexed: boolean;
  has_pdf: boolean;
  has_notes: boolean;
  category: string;
  chapters?: Chapter[];
  chunks?: Chunk[];
  scientific_status?: string;
  usage_stats?: { searches: number; notes: number };
  century?: number;
  madhhab?: string;
  relevance?: number;
  editions?: Edition[];
  related_books?: { id: number | string; relation: string; title: string }[];
  format?: string;
  dateAdded?: number;
  versions?: { id: string; name: string; content: string }[];
}

export interface Edition {
  id: string;
  publisher: string;
  cover_url?: string;
  investigator?: string;
}

export interface Shelf {
  id: string;
  name: string;
  book_ids: (number | string)[];
}

export interface Chapter {
  id: number | string;
  title: string;
  page_number: number;
}

export interface BookRelationship {
  source: number | string; // book id
  target: number | string; // book id
  type: 'commentary' | 'footnote' | 'abridgment' | 'original';
}

export interface Chunk {
  id: number | string;
  book_id: number | string;
  content: string;
  page_number: number;
  bookTitle?: string;
  similarity?: number;
  embedding?: number[];
  startIndex: number;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface MCQ {
  id: string;
  book_id: number | string;
  page_number: number;
  text_range: string;
  questions: MCQQuestion[];
  answered: boolean;
  correct: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
