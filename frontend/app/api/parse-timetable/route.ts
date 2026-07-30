import {NextResponse} from "next/server";
import {GoogleGenAI} from "@google/genai";

export async function POST(request: Request) {
    try {
        const {fileUrl} = await request.json();
        if (!fileUrl) {
            return NextResponse.json({error: "Missing file URL"}, {status: 400});
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your .env.local file."},
                {status: 500}
            );
        }
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file from supabase: ${response.statusText}`);
        }
        const contentType = response.headers.get("content-type") || "application/pdf";
        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const ai = new GoogleGenAI({apiKey});
        const prompt = `
        Analyze the attached academic timetable file (could be an image or a PDF).
        Extract all scheduled lectures/classes and structure them into the requested JSON schema.
        
        RULES:
        1. For day_of_week, use integers: 1 for Monday, 2 for Tuesday, 3 for Wednesday, 4 for Thursday, 5 for Friday, 6 for Saturday, 0 for Sunday.
        2. Ensure start_time and end_time are extracted in "HH:MM" format (24-hour style, e.g. "09:30","14:15").
        3. Extract subject_name, room_number, and instructor (if listed).
        4. Do not include lunch breaks, recess, or study halls. Only academic courses.`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: contentType,
                    },
                },
                prompt,
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type : "OBJECT",
                    properties: {
                        schedules: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    subject_name: {type: "STRING"},
                                    room_number: {type: "STRING"},
                                    start_time: {type: "STRING"},
                                    end_time: {type: "STRING"},
                                    day_of_week: {type: "INTEGER"},
                                    instructor: {type: "STRING"},
                                },
                                required: ["subject_name", "room_number", "start_time", "end_time", "day_of_week"],
                            },
                        },
                    },
                    required: ["schedules"],
                },
            },
        });

        const parsedText = result.text;
        if (!parsedText) {
            throw new Error("Gemini returned an empty response.");
        }
        const data = JSON.parse(parsedText);
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("AI Parser Route Error:", err);
        return NextResponse.json({error: err.message || "Failed to parse timetable"}, {status: 500});
    }
}