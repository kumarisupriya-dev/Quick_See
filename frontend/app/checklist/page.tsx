"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface Profile {
    batch_id: string;
}

interface Schedule {
    id: string;
    subject_name: string;
    start_time: string;
    end_time: string;
    room_number: string;
    day_of_week: number;
}

interface ChecklistItem {
    id: string;
    schedule_id: string;
    target_date: string;
    item_description: string;
    is_completed: boolean;
    upvotes: number;
    reported_count: number;
    created_by: string | null;
}

export default function ChecklistPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    });
    const [newDescriptions, setNewDescriptions] = useState<Record<string, string>>({});
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                const {data: profileData, error: profileError} = await supabase
                    .from("profiles")
                    .select("batch_id")
                    .eq("id", user.id)
                    .single();

                if (profileError) throw profileError;
                if (!profileData || !profileData.batch_id) {
                    router.push("/onboaridng");
                    return;
                }
                setProfile(profileData);
            } catch (err: any) {
                console.error("Error loading checklist profile:", err);
                setErrorMsg(err.message || "Failed to initialize profile.");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [supabase, router]);

    useEffect(() => {
        const batchId = profile?.batch_id;
        if (!batchId) return;
        async function loadDayChecklists() {
            try {
                const dateObj = new Date(selectedDate);
                const dayOfWeek = dateObj.getDay();
                const {data: scheduleData, error: scheduleError} = await supabase
                    .from("schedules")
                    .select("id, subject_name, start_time, end_time, room_number, day_of_week")
                    .eq("batch_id", batchId)
                    .eq("day_of_week", dayOfWeek)
                    .order("start_time", {ascending: true})
                if (scheduleError) throw scheduleError;

                if (!scheduleData || scheduleData.length === 0) {
                    setSchedules([]);
                    setChecklistItems([]);
                    return;
                }
                setSchedules(scheduleData);

                const scheduleIds = scheduleData.map((s) => s.id);
                const {data: checklistData, error: checklistError} = await supabase
                    .from("checklist_items")
                    .select("*")
                    .in("schedule_id", scheduleIds)
                    .eq("target_date", selectedDate);

                if (checklistError) throw checklistError;
                setChecklistItems(checklistData || []);
            } catch (err: any) {
                console.log("Error loading checklist data:", err);
                setErrorMsg(err.message || "Failed to load checklist details.");
            }
        }
        loadDayChecklists();
    }, [selectedDate, profile?.batch_id, supabase]);

    useEffect(() => {
        if (schedules.length  === 0) return;

        const channel = supabase
            .channel("realtime-checklist")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "checklist_items",
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        const newItem = payload.new as ChecklistItem;
                        if (newItem.target_date === selectedDate) {
                            setChecklistItems((prev) => {
                                if (prev.some((item) => item.id === newItem.id)) return prev;
                                return [...prev, newItem];
                            });
                        }
                    } else if (payload.eventType === "UPDATE") {
                        const updatedItem = payload.new as ChecklistItem;
                        setChecklistItems((prev) =>
                        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
                        );
                    } else if (payload.eventType === "DELETE") {
                        const deletedId = payload.old.id;
                        setChecklistItems((prev) => prev.filter((item) => item.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [schedules, selectedDate, supabase]);

    const handleToggleCheck = async (id: string, currentState: boolean) => {
        setErrorMsg("");
        const {error} = await supabase
            .from("checklist_items")
            .update({is_completed: !currentState})
            .eq("id", id);

        if (error) setErrorMsg(error.message);
    };

    const handleUpvote = async (id: string, currentVotes: number) => {
        setErrorMsg("");
        const {error} = await supabase
            .from("checklist_items")
            .update({upvotes: currentVotes + 1})
            .eq("id", id);
        if (error) setErrorMsg(error.message);
    };

    const handleReport = async (id: string, currentReports: number) => {
        setErrorMsg("");
        const {error} = await supabase
            .from("checklist_items")
            .update({reported_count: currentReports + 1})
            .eq("id", id);
        if (error) setErrorMsg(error.message);
    };

    const handleAddItem = async (scheduleId: string) => {
        const desc = newDescriptions[scheduleId]?.trim();
        if (!desc) return;

        setErrorMsg("");
        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) return;

            const {error} = await supabase
                .from("checklist_items")
                .insert({
                    schedule_id: scheduleId,
                    target_date: selectedDate,
                    item_description: desc,
                    is_completed: false,
                    upvotes: 0,
                    reported_count: 0,
                    created_by: user.id,
                });

            if (error) throw error;
            setNewDescriptions((prev) => ({...prev, [scheduleId]: ""}));
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to add checklist item.");
        }
    };

    const handleInputChange = (scheduleId: string, value: string) => {
        setNewDescriptions((prev) => ({...prev, [scheduleId]: value}));
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                Loading checklists...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>Material & Prep Checklist</h2>
                    <p className={styles.subtitle}>
                        Crowdsourced daily requirements. Add and verify what to bring for class today.
                    </p>
                </div>
                {/* Date Selection */}
                <div className={styles.datePickerRow}>
                    📅
                    <input
                    type="date"
                    className={styles.dateInput}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>
            {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
            {schedules.length === 0 ? (
                <div className={styles.noClassesCard}>
                    ☕ No classes are scheduled on this day. Take a break!
                </div>
            ) : (
                schedules.map((course) => {
                    const courseItems = checklistItems.filter((item) => item.schedule_id === course.id);
                    return (
                        <div key={course.id} className={styles.classCard}>
                            <div className={styles.classHeader}>
                                <h3 className={styles.className}>{course.subject_name}</h3>
                                <span className={styles.classTime}>
                                    📍 Room {course.room_number} ({course.start_time.slice(0, 5)} - {course.end_time.slice(0,5)})
                                </span>
                            </div>
                            <div className={styles.itemList}>
                                {courseItems.length === 0 ? (
                                    <div className={styles.emptyItems}>
                                        No checklist items reported yet. Add one below!
                                    </div>
                                ) : (
                                    courseItems.map((item) => {
                                        const isReportedHeavy = item.reported_count >= 3;
                                        return (
                                            <div
                                            key={item.id}
                                            className={`${styles.itemRow} ${item.is_completed ? styles.itemRowCompleted : ""} ${isReportedHeavy ? styles.itemRowReported : ""}`}
                                            >
                                                {/* Checkbox Status */}
                                                <label className={styles.itemLabel}>
                                                    <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={item.is_completed}
                                                    onChange={() => handleToggleCheck(item.id, item.is_completed)}
                                                    />
                                                    <span
                                                    className={`${styles.itemText} ${item.is_completed ? styles.itemTextCompleted : ""}`}
                                                    >
                                                        {item.item_description}
                                                        {isReportedHeavy && (
                                                            <span style={{color: "var(--danger)", fontSize: "0.75rem", marginLeft: "0.5rem", fontWeight: "700"}}>
                                                                (⚠️ Reported Incorrect)
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                                {/* Peer upvote and report buttons */}
                                                <div className={styles.actionButtons}>
                                                    <button
                                                    type="button"
                                                    className={styles.btnVote}
                                                    onClick={() => handleUpvote(item.id, item.upvotes)}
                                                    >
                                                        👍 {item.upvotes}
                                                    </button>
                                                    <button
                                                    type="button"
                                                    className={styles.btnReport}
                                                    onClick={() => handleReport(item.id, item.reported_count)}
                                                    title="Report incorrect info"
                                                    >
                                                        ⚠️ {item.reported_count > 0 && item.reported_count}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {/* Inline form to add checklist item */}
                            <div className={styles.addItemRow}>
                                <input
                                type="text"
                                className={styles.addInput}
                                placeholder="e.g. Bring lab workbook, submit project..."
                                value={newDescriptions[course.id] || ""}
                                onChange={(e) => handleInputChange(course.id, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddItem(course.id);
                                }}
                                />
                                <button
                                type="button"
                                className={styles.btnAdd}
                                onClick={() => handleAddItem(course.id)}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}