import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Book } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const geminiService = {
  async inferRelationships(books: Book[]) {
    const prompt = `Analyze the following list of books and infer relationships between them (e.g., commentary, abridgment, original).
    Return the result as a JSON array of objects with the following structure:
    {
      "sourceBookId": string | number,
      "targetBookId": string | number,
      "relation": "commentary" | "footnote" | "abridgment" | "original"
    }
    
    Books:
    ${JSON.stringify(books.map(b => ({ id: b.id, title: b.title, summary: b.ai_summary })))}
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(response.text || "[]");
  },
  async generateEmbedding(text: string) {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [text],
    });
    return result.embeddings[0].values;
  },

  async generateText(prompt: string, model: string = "gemini-3.1-pro-preview") {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });
      return response.text || "لم يتم إرجاع أي نص.";
    } catch (error) {
      console.error("Gemini Generate Text Error:", error);
      throw error;
    }
  },

  async chat(message: string, context: string, deepThinking: boolean = false, model: string = "gemini-3.1-pro-preview") {
    if (model !== "gemini-3.1-pro-preview") {
      return `عذراً، ${model} غير مدعوم حالياً في هذا المساعد.`;
    }
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Context from the library:\n${context}\n\nUser Question: ${message}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: "You are an expert Islamic scholar assistant. Answer questions based on the provided context from the library. Always cite the source book and page if available. Use a respectful and academic tone in Arabic.",
        thinkingConfig: {
          thinkingLevel: deepThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
        },
      },
    });
    return response.text;
  },

  async ocr(base64Data: string, mimeType: string = "image/jpeg", model: string = "gemini-3.1-pro-preview") {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            { 
              text: `Extract all Arabic text from this document/image with extreme precision. 
              This document may contain historical scripts, complex calligraphy, or classical typesetting.
              
              Guidelines:
              1. Recognize and preserve all diacritics (tashkeel) if present.
              2. Handle historical ligatures and traditional Arabic fonts accurately.
              3. Maintain the original layout, including paragraphs, poetry verses (abyat), and marginalia.
              4. If there are multiple columns or side-notes, extract them in a logical reading order.
              5. Correct common OCR misinterpretations of similar-looking Arabic characters (e.g., differentiating between 'ya' and 'alif maqsura').
              6. Output ONLY the extracted text without any commentary or meta-text.` 
            },
          ],
        },
      ],
      config: {
        systemInstruction: "You are a specialized expert in Arabic paleography and digital transcription. Your task is to perform high-fidelity OCR on Arabic documents, ranging from modern prints to ancient manuscripts. You have deep knowledge of various Arabic scripts (Naskh, Thuluth, Kufic, Maghrebi, etc.) and classical Arabic grammar.",
      }
    });
    return response.text;
  },

  async summarize(text: string, model: string = "gemini-3.1-pro-preview") {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { text: `Summarize the following text and extract scientific benefits (فوائد علمية) in Arabic:\n\n${text}` },
          ],
        },
      ],
    });
    return response.text;
  },

  async tts(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  },

  async generateMCQs(text: string, model: string = "gemini-3.1-pro-preview") {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            {
              text: `بناءً على هذا النص العربي، قم بتوليد 3 أسئلة اختيار من متعدد، مع تحديد الإجابة الصحيحة وشرح بسيط لسبب الاختيار.
              أخرج النتيجة بصيغة JSON التالية:
              {
                "questions": [
                  {
                    "question": "...",
                    "options": ["...", "...", "...", "..."],
                    "correct_answer": "...",
                    "explanation": "..."
                  }
                ]
              }
              النص:
              ${text}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "{}");
  },
};
