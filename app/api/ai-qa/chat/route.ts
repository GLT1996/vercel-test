import { NextRequest, NextResponse } from 'next/server';
import { loadVectorStore, embedQuery, cosineSimilarity, VectorRecord } from '@/lib/rag-util';
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const question = lastMessage.content;

        // 1. Retrieve relevant info
        const store = await loadVectorStore();

        let contextText = "";
        let topContext: (VectorRecord & { score: number })[] = [];
        if (store.length > 0) {
            const queryEmbedding = await embedQuery(question);

            const scored = store.map(record => ({
                ...record,
                score: cosineSimilarity(queryEmbedding, record.embedding)
            }));

            // Sort by score desc
            scored.sort((a, b) => b.score - a.score);

            // Take top 5
            topContext = scored.slice(0, 5);
            contextText = topContext.map(c => c.text).join("\n---\n");
        }

        // 2. Generate Answer
        let model;
        if (process.env.GOOGLE_API_KEY) {
             model = new ChatGoogleGenerativeAI({
                model: "gemini-pro",
                apiKey: process.env.GOOGLE_API_KEY,
                maxOutputTokens: 2048,
            });
        } else {
             model = new ChatOpenAI({
                modelName: "gpt-4o",
                temperature: 0.7,
            });
        }

        const systemPrompt = `You are a helpful AI assistant. Use the following pieces of context to answer the user's question.
If the answer is not in the context, say so, but you can use your general knowledge to help explain if relevant, but prioritize the context.
Always answer in the same language as the user question.

Context:
${contextText}
`;

        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(question)
        ]);

        return NextResponse.json({
            answer: response.content,
            context: topContext
        });

    } catch (error: unknown) {
        console.error("Chat error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
