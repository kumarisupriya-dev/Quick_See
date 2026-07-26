"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {createClient} from "../../utils/supabase/client";
import styles from "./page.module.css";

interface Profile {
    full_name: string;
    batch_id: string;
    batches: {
        graduation_year: number;
        section_name: string;
        departments: {
            name: string;
        };
    };
}

interface Schedule {
    id: string;
    subject_name: string;
    room_number: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
    instructor: string;
    cancellations_reschedules?: {
        is_canceled: boolean;
        new_start_time: string | null;
        new_end_time: string | null;
        new_room: string | null;
    }[];
}

interface Override {
    schedule_id: string;
    target_date: string;
    is_canceled: boolean;
    new_start_time: string | null;
    new_end_time: string | null;
    new_room: string | null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DashboardPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
    const [dailyOverrides, setDailyOverrides] = useState<Record<string, Override>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [datesList, setDatesList] = useState<Date[]>([]);
    const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

    useEffect(() => {
        const list: Date[] = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            list.push(d);
        }
        setDatesList(list);
    }, []);

    useEffect(() => {
        async function loadInitialDate() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) return;

            const {data: profileData, error: profileError} = await supabase
                .from("profiles")
                .select(`
                full_name,
                batch_id,
                batches (
                graduation_year,
                section_name,
                departments (
                name
                )
                )
                `)
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;
            if (!profileData || !profileData.batch_id) return;

            const typedProfile = profileData as unknown as Profile;
            setProfile(typedProfile);

            const {data: scheduleData, error: scheduleError} = await supabase
                .from("schedules")
                .select(`
                id,
                subject_name,
                room_number,
                start_time,
                end_time,
                day_of_week,
                instructor
                `)
                .eq("batch_id", typedProfile.batch_id)
                .order("start_time", {ascending: true});

            if (scheduleError) throw scheduleError;
            if (scheduleData) setAllSchedules(scheduleData);
            } catch (err) {
                console.error("Dashboard initialization error:", err);
            } finally {
                setLoading(false);
            }
        }
        loadInitialDate();
    }, [supabase]);

    useEffect(() => {
        if (!profile?.batch_id) return;
        async function loadDateOverrides() {
            try {
                const dateString = selectedDate.toISOString().split("T")[0];

                const {data: overrideData, error: overrideError} = await supabase
                    .from("cancellations_reschedules")
                    .select(`
                    schedule_id,
                    is_canceled,
                    new_start_time,
                    new_end_time,
                    new_room
                    `)
                    .eq("target_date", dateString);

                if (overrideError) throw overrideError;

                const overridesMap: Record<string, Override> = {};
                if (overrideData) {
                    overrideData.forEach((o: any) => {
                        overridesMap[o.schedule_id] = o;
                    });
                }
                setDailyOverrides(overridesMap);
            } catch (err) {
                console.error("Error loading overrides:", err);
            }
        }
        loadDateOverrides();
    }, [selectedDate, profile?.batch_id, supabase]);

    useEffect(() => {
        if (!profile?.batch_id) return;

        const channel = supabase
            .channel("realtime-overrides")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "cancellations_reschedules",
                },
                (payload) => {
                    const dateString = selectedDate.toISOString().split("T")[0];

                    if (payload.eventType === "DELETE") {
                        const deleteId = payload.old.schedule_id;
                        setDailyOverrides((prev) => {
                            const updated = {...prev};
                            delete updated[deleteId];
                            return updated;
                        });
                    } else {
                        const newOverride = payload.new as Override;
                        if (newOverride.target_date === dateString) {
                            setDailyOverrides((prev) => ({
                                ...prev,
                                [newOverride.schedule_id]: newOverride,
                            }));
                        }
                    }
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.batch_id, selectedDate, supabase]);

    const formatDateLabel = (date: Date) => {
        return date.toLocaleDateString("en-US", {weekday: "short"});
    };

    const getActiveDayClasses = () => {
        const dayOfWeek = selectedDate.getDay();

        return allSchedules
            .filter((s) => s.day_of_week === dayOfWeek)
            .map((s) => {
                const override = dailyOverrides[s.id];
                return {
                    ...s,
                    cancellations_reschedules: override ? [override] : [],
                };
            });
    };

    const getWeeklyGroupedClasses = () => {
        const grouped: Record<number, Schedule[]> = {1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
        allSchedules.forEach((s) => {
            if (s.day_of_week >= 1 && s.day_of_week <= 6) {
                grouped[s.day_of_week].push(s);
            }
        });
        return grouped;
    };
    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                Loading dashboard...
            </div>
        );
    }
    const activeDayClasses = getActiveDayClasses();
    const weeklyGrouped = getWeeklyGroupedClasses();

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <div className={styles.welcomeSection}>
                    <h2 className={styles.greeting}>
                        Hello, {profile?.full_name || "Student"}!
                    </h2>
                    {profile?.batches && (
                        <div className={styles.batchBadge}>
                            🎓 {profile.batches.departments.name} — Class of {profile.batches.graduation_year} ({profile.batches.section_name}
                        </div>
                    )}
                </div>
                {/* View mod toggle */}
                <div className={styles.viewToggle}>
                    <button
                    className={`${styles.toggleBtn} ${viewMode === "daily" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setViewMode("daily")}
                    >
                        Daily View
                    </button>
                    <button
                    className={`${styles.toggleBtn} ${viewMode === "weekly" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setViewMode("weekly")}
                    >
                        Weekly Grid
                    </button>
                </div>
            </div>
            {viewMode === "daily" ? (
                <div className={styles.dashboardLayout}>
                    <div className={styles.mainContent}>
                        {/* Day selector strip */}
                        <div className={styles.daySelector}>
                            {datesList.map((date, idx) => {
                                const isActive = date.toDateString() === selectedDate.toDateString();
                                return (
                                    <button
                                    key={idx}
                                    className={`${styles.dayButton} ${isActive ? styles.dayButtonActive : ""}`}
                                    onClick={() => setSelectedDate(date)}
                                    >
                                        <span className={styles.dayName}>{formatDateLabel(date)}</span>
                                        <span className={styles.dayDate}>{date.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {/* Daily schedule list */}
                        <div className={styles.scheduleList}>
                            {activeDayClasses.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyStateIcon}>☕</div>
                                    <h3 className={styles.emptyStateTitle}>No Classes Today</h3>
                                    <p className={styles.emptyStateDesc}>
                                        Enjoy your day off, catch up on studies, or update tomorrow's checklist!
                                    </p>
                                </div>
                            ) : (
                                activeDayClasses.map((schedule) => {
                                    const override = schedule.cancellations_reschedules?.[0];
                                    const isCanceled = override?.is_canceled || false;
                                    const isRescheduled = override && !isCanceled && (override.new_start_time || override.new_room);

                                    return (
                                        <div key={schedule.id} className={styles.card}>
                                            {/* Time */}
                                            <div className={styles.timeContainer}>
                                                <span className={styles.timeStart}>
                                                    {isRescheduled && override.new_start_time
                                                    ? override.new_start_time.slice(0, 5)
                                                    : schedule.start_time.slice(0, 5)}
                                                </span>
                                                <span className={styles.timeEnd}>
                                                    to{" "}
                                                    {isRescheduled && override.new_end_time
                                                    ? override.new_end_time.slice(0, 5)
                                                    : schedule.end_time.slice(0, 5)}
                                                </span>
                                            </div>
                                            {/* Details */}
                                            <div className={styles.classDetails}>
                                                <h4 className={styles.subjectName}>
                                                    {schedule.subject_name}
                                                </h4>
                                                <span className={styles.instructorName}>
                                                    {schedule.instructor || "No Instructor Assigned"}
                                                </span>
                                                {isRescheduled && (
                                                    <div className={styles.reschedDetails}>
                                                        ⚠️ Rescheduled from original time ({schedule.start_time.slice(0, 5)})
                                                    </div>
                                                )}
                                            </div>
                                            {/* Status and location */}
                                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                                <div className={styles.locationContainer}>
                                                    📍 Room{" "}
                                                    {isRescheduled && override.new_room
                                                    ? override.new_room
                                                    : schedule.room_number}
                                                </div>
                                                {isCanceled && (
                                                    <span className={`${styles.badge} ${styles.badgeCanceled}`}>
                                                        Canceled
                                                    </span>
                                                )}
                                                {isRescheduled && (
                                                    <span className={`${styles.badge} ${styles.badgeRescheduled}`}>
                                                        Rescheduled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {/* Quick actions panel */}
                    <div className={styles.sideContent}>
                        <div className={styles.quickActions}>
                            <h3 className={styles.actionTitle}>Quick Actions</h3>
                            <Link href="/ai-parser" className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>
                                🤖 AI Syllabus Uplaod
                            </Link>
                            <Link href="/checklist" className={styles.actionButton}>
                                🎒 Daily Item Checklist
                            </Link>
                            <Link href="/dashboard/reschedule" className={styles.actionButton}>
                                📅 Report Cancel/Reschedule
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.weeklyGrid}>
                    {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                        const classes = weeklyGrouped[dayNum] || [];
                        return (
                            <div key={dayNum} className={styles.weeklyDayColumn}>
                                <h3 className={styles.weeklyDayHeader}>{WEEKDAYS[dayNum]}</h3>
                                {classes.length === 0 ? (
                                    <div className={styles.emptyState} style={{padding: "1.5rem", fontSize: "0.8rem"}}>
                                        No classes
                                    </div>
                                ) : (
                                    classes.map((cls) => (
                                        <div key={cls.id} className={styles.weeklyClassCard}>
                                            <span className={styles.weeklyTime}>
                                                {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                                            </span>
                                            <h4 className={styles.weeklySubject}>{cls.subject_name}</h4>
                                            <span className={styles.weeklyRoom}>📍 Rm {cls.room_number}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}