import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const geminiService = {
  async generateEmbedding(text: string) {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [text],
    });
    return result.embeddings[0].values;
  },

  async generateText(prompt: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });
      return response.text || "لم يتم إرجاع أي نص.";
    } catch (error) {
      console.error("Gemini Generate Text Error:", error);
      throw error;
    }
  },

  async chat(message: string, context: string, deepThinking: boolean = false) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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

  async ocr(base64Image: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            { text: "Extract all Arabic text from this image accurately. Maintain the structure if possible." },
          ],
        },
      ],
    });
    return response.text;
  },

  async summarize(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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

  async generateMCQs(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
