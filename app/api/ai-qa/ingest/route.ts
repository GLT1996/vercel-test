import { NextRequest, NextResponse } from 'next/server';
import { processFile, generateEmbeddings, createVectorRecords, VectorRecord } from '@/lib/rag-util';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    console.log("POST /api/ai-qa/ingest started");
    try {
        const formData = await req.formData();
        console.log("FormData parsed");
        const files = formData.getAll('files') as File[];

        if (!files.length) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        let addedCount = 0;

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = file.name;
            const mimeType = file.type;

            // Process text
            console.log(`Processing file: ${fileName}`);
            const docs = await processFile(buffer, fileName, mimeType);
            if (docs.length === 0) continue;

            // Generate embeddings
            const texts = docs.map(d => d.pageContent);
            console.log(`Generating embeddings for ${texts.length} chunks from file: ${fileName}`);
            const embeddings = await generateEmbeddings(texts);
            // 打印embeddings的内容
            if (embeddings.length > 0 && embeddings[0].length > 0) {
                console.log("Embeddings generated successfully.");
                console.log("First embedding dim:", embeddings[0].length);
                console.log("First 5 values:", embeddings[0].slice(0, 5));
            } else {
                console.log("Embeddings generated but appear empty:", embeddings);
            }
            console.log("Full Embeddings count:", embeddings.length);

            // Create records
            const newRecords: VectorRecord[] = docs.map((doc, i) => ({
                id: crypto.randomUUID(), // Node 16+ global
                text: doc.pageContent,
                metadata: doc.metadata,
                embedding: embeddings[i]
            }));

            // Save to DB
            await createVectorRecords(newRecords);
            addedCount++;
        }

        return NextResponse.json({ success: true, added: addedCount });
    } catch (error: unknown) {
        console.error("Ingest error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
