/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createRequire } from 'module';
import { prisma } from './prisma';

const require = createRequire(import.meta.url);

export interface VectorRecord {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding: number[];
}

export const loadVectorStore = async (): Promise<VectorRecord[]> => {
    const chunks = await prisma.documentChunk.findMany();
    return chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.content,
        metadata: (chunk.metadata as Record<string, any>) || {},
        embedding: chunk.embedding
    }));
};

// Store new records to DB
export const createVectorRecords = async (records: VectorRecord[]) => {
    // Prisma createMany is efficient
    await prisma.documentChunk.createMany({
        data: records.map(r => ({
            content: r.text,
            metadata: r.metadata,
            embedding: r.embedding
        }))
    });
};

export const processFile = async (
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<Document[]> => {
    let text: string;

    if (mimeType === 'application/pdf') {
        const pdf = require('pdf-parse');
        const data = await pdf(fileBuffer);
        text = data.text;
    } else {
        // Assume text/markdown/txt
        text = fileBuffer.toString('utf-8');
    }

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    return await splitter.createDocuments([text], [{ source: fileName }]);
};

export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
    if (process.env.GOOGLE_API_KEY) {
        // Use Google Gemini Embeddings (Free Tier available)
        console.log("Using Google Gemini Embeddings (text-embedding-004)");
        try {
            const embeddings = new GoogleGenerativeAIEmbeddings({
                modelName: "text-embedding-004",
                apiKey: process.env.GOOGLE_API_KEY
            });
            const result = await embeddings.embedDocuments(texts);
            if (!result || result.length === 0 || result[0].length === 0) {
                 console.warn("Google Embeddings returned empty result:", JSON.stringify(result));
            }
            return result;
        } catch (e) {
            console.error("Google Embeddings Error details:", e);
            throw e;
        }
    }

    if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing API Key. Please providing OPENAI_API_KEY or GOOGLE_API_KEY in .env file.");
    }
    // Requires process.env.OPENAI_API_KEY
    const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
    });
    return embeddings.embedDocuments(texts);
};

export const embedQuery = async (text: string): Promise<number[]> => {
    if (process.env.GOOGLE_API_KEY) {
         const embeddings = new GoogleGenerativeAIEmbeddings({
            modelName: "text-embedding-004",
            apiKey: process.env.GOOGLE_API_KEY
        });
        return embeddings.embedQuery(text);
    }

    if (!process.env.OPENAI_API_KEY) {
         throw new Error("Missing API Key. Please providing OPENAI_API_KEY or GOOGLE_API_KEY in .env file.");
    }
    const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
    });
    return embeddings.embedQuery(text);
}

// Simple cosine similarity
export const cosineSimilarity = (a: number[], b: number[]) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    // Prevent division by zero
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
