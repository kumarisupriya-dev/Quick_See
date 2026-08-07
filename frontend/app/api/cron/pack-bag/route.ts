import { NextResponse } from "next/server";
import { createClient }from "@supabase/supabase-js";
import webpush from "web-push";

// 1.Initialize web-push details
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:support@quicksee.example.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}
export async function GET (request:Request) {
    try {
        //simple authorization check using a custom secret header (e.g. CRON_SECRET)
        // to prevent random public users from triggering notification broadcasts
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");

        if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
            return NextResponse.json({error: "Unauthorized access"}, {status: 401});
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing Supabase admin environment variables on server.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {persistSession: false}
        });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay();
        const tomorrowDateString = tomorrow.toISOString().split("T")[0];
        const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const tomorrowName = WEEKDAYS[tomorrowDay];

        const {data: subscriptions, error: subError} = await supabaseAdmin
            .from("push_subscriptions")
            .select(`
            user_id,
            subscription_json,
            profiles (
            batch_id
            )
            `);

        if (subError) throw subError;
        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({message: "No active path subscriptions found."});
        }
        let sentCount = 0;
        let failCount = 0;

        for (const sub of subscriptions) {
            const profile: any = sub.profiles;
            const batchId = profile?.batch_id;
            if (!batchId) continue;

            const {data: schedules} = await supabaseAdmin
                .from("schedules")
                .select("id, subject_name, start_time, room_number")
                .eq("batch_id", batchId)
                .eq("day_of_week", tomorrowDay);

            if (!schedules || schedules.length === 0) continue;

            const scheduleIds = schedules.map(s => s.id);

            const {data: overrides} = await supabaseAdmin
                .from("cancellations_reschedules")
                .select("schedule_id, is_canceled, new_start_time, new_room")
                .in("schedule_id", scheduleIds)
                .eq("target_date", tomorrowDateString);

            const overridesMap = new Map();
            if (overrides) {
                overrides.forEach(o => overridesMap.set(o.schedule_id, o));
            }
            const {data: checklists} = await supabaseAdmin
                .from("checklist_items")
                .select("item_description")
                .in("schedule_id", scheduleIds)
                .eq("target_date", tomorrowDateString)
                .eq("is_completed", false);

            const activeClasses: string[] = [];
            schedules.forEach(s => {
                const override = overridesMap.get(s.id);
                if (override?.is_canceled) return;

                const time = override?.new_start_time ? override.new_start_time.slice(0, 5) :
                    s.start_time.slice(0, 5);
                const  room = override?.new_room ? override.new_room : s.room_number;
                activeClasses.push(`${s.subject_name} at ${time} (Rm ${room})`);
            });

            if (activeClasses.length === 0) continue;

            let bodyText = `Tomorrow (${tomorrowName}) classes: ${activeClasses.join(",")}.`;
            if (checklists && checklists.length > 0) {
                const items = checklists.map(c => c.item_description).join(",");
                bodyText += `🎒 Pack: ${items}.`;
            } else {
                bodyText += " 👍 No prep items reported. You are good to go!";
            }
            try {
                const subJson = sub.subscription_json as unknown as webpush.PushSubscription;

                await webpush.sendNotification(
                    subJson,
                    JSON.stringify({
                        title: "🎒 Pack Your Bag for Tomorrow!",
                        body: bodyText,
                        url: "/dashboard"
                    })
                );
                sentCount++;
            } catch (pushErr: any) {
                console.error(`Failed to send push to user ${sub.user_id}:`, pushErr.message);
                failCount++;

                if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                    await supabaseAdmin
                        .from("push_subscriptions")
                        .delete()
                        .eq("user_id", sub.user_id);
                }
            }
        }

        return NextResponse.json({
            message: `Nightly cron alert finished.`,
            success_sent: sentCount,
            failed_sent: failCount
        });
    } catch (err: any) {
            console.error("Cron bag packing worker failed:", err);
            return NextResponse.json({error: err.message || "Cron execution failed"}, {status: 500});
        }
}