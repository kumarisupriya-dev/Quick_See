import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {GoogleGenAI} from "@google/genai";

export async function POST(request: Request) {
    try {
        const {message, userId, chatHistory = []} = await request.json();

        if (!message || !userId) {
            return NextResponse.json({error: "Missing message or userId"}, {status: 400});
        }
        const apiKey = process.env.GEMINI_API_KEY;
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

        const {data: profile, error: profileError} = await supabaseAdmin
            .from("profiles")
            .select("batch_id, full_name, role")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({error: "Failed to retrieve student profile"}, {status: 404});
        }
        const batchId = profile.batch_id;

        const {data: schedules} = await supabaseAdmin
            .from("schedules")
            .select("subject_name, start_time, end_time, day_of_week, room_number, instructor")
            .eq("batch_id", batchId);

        const {data: cancellations} = await supabaseAdmin
            .from("cancellations")
            .select("date, schedule_id, status, notes")
            .eq("batch_id", batchId);

        const {data: resources} = await supabaseAdmin
            .from("study_resources")
            .select("title, description, category, file_url, upvotes")
            .eq("batch_id", batchId);

        const {data: checklist} = await supabaseAdmin
            .from("checklist_items")
            .select("description, upvotes, status")
            .eq("batch_id", batchId);

        const {data: gpaRecords} = await supabaseAdmin
            .from("gpa_records")
            .select("course_name, semester, credits, grade, grade_point")
            .eq("user_id", userId);

        const ai = new GoogleGenAI({apiKey});

        const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayName = WEEKDAYS[new Date().getDay()];

        const systemInstruction = `
        You are the Quick See Academic Copilot, a helpful AI academic assistant.
        You goal is to help the student succeed by answering queries based on the provided context of their cohort batch.
        
        STUDENT PROFILE:
        - Name: ${profile.full_name || "Student"}
        - Role: ${profile.role || "Student"}
        
        TODAY'S DATE: ${new Date().toDateString()} (${todayName})
        
        CURRENT CLASS TIMETABLE SCHEDULES:
        ${JSON.stringify(schedules || [], null, 2)}
        
        TODAY'S / TOMORROW'S CANCELLATIONS OR RESCHEDULES:
        ${JSON.stringify(cancellations || [], null, 2)}
        
        SHARED COURSE STUDY MATERIALS DRIVE LINKS:
        ${JSON.stringify(resources || [], null, 2)}
        
        DAILY COHORT PREPARATION CHECKLIST ITEMS:
        ${JSON.stringify(checklist || [], null, 2)}
        
        STUDENT'S PRIVATE GPA RECORDS:
        ${JSON.stringify(gpaRecords || [], null, 2)}
        
        RULES: 
        1. ONLY use the provided context to answer to answer questions about schedules, checklists, resources, and GPA targets.
        2. If the user asks about something not in the context, help them write it or provide advice (e.g. studying strategies, calculator estimations), but make it clear when you are estimating rather than reading verified batch data.
        3. Be encouraging, concise, and academically focused.
        4. Format all replies cleanly in GitHub-style Markdown.
        `;

        const contents = chatHistory.map((ch: any) => ({
            role: ch.role,
            parts: [{text: ch.content}]
        }));
        contents.push({
            role: "user",
            parts: [{text: message}]
        });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction
            }
        });

        const textResponse = result.text;
        if (!textResponse) {
            throw new Error("Gemini returned an empty response.");
        }
        return NextResponse.json({response: textResponse});
    } catch (err: any) {
        console.error("AI Copilot API Route Error:", err);
        return NextResponse.json({error: err.message || "Failed to query AI copilot"}, {status: 500});
    }
}