import {NextResponse} from  "next/server";
import {createClient} from "@supabase/supabase-js";
import {GoogleGenAI} from "@google/genai";
async function POST(request: Request) {
    try {
        const {deckId, topic} = await request.json();

        if (!deckId || !topic) {
            return NextResponse.json({error: "Missing deckId or topic"}, {status: 400});
        }
        const apiKey = process.env.GEMEINI_API_KEY;;
        if (!apiKey) {
            return NextResponse.json({
                error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your .env.local file."
            }, {status: 500});
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing Supabase environment variables on server.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {persistSession: false}
        });
        const ai = new GoogleGenAI({apiKey});

        const prompt = `Generate 5 educational flashcards for the academic topic: "${topic}.
        Each flashcard must contain a clear, concise question for the front side and a detailed correct answer for the back side.
        Focus on key concepts, definitions, formulas, or study items.`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        flashcards: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    question: {type: "STRING"},
                                    answer: {type: "STRING"}
                                },
                                required: ["question", "answer"]
                            }
                        }
                    },
                    required: ["flashcards"]
                }
            }
        });

        const parsedText = result.text;
        if (!parsedText) {
            throw new Error("Gemini returned an empty response.");
        }
        const {flashcards} = JSON.parse(parsedText);

        const inserts = flashcards.map((c: any) => ({
            deck_id: deckId,
            question: c.question.trim(),
            answer: c.answer.trim()
        }));

        const {error: insertError} = await supabaseAdmin
            .from("flashcards")
            .insert(inserts);

        if (insertError) throw insertError;

        return NextResponse.json({success: true, count: inserts.length});
    } catch (err: any) {
        console.error("AI Flashcard Generation Route Error:", err);
        return NextResponse.json({error: err.message || "Failed to generate flashcards"}, {status: 500});
    }
}
