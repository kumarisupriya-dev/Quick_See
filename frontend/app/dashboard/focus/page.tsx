"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface Attendee {
    id: string;
    user_id: string;
    profiles?: {
        full_name: string;
    };
}

interface FocusSession {
    id: string;
    topic: string;
    description: string;
    location: string;
    session_time: string;
    max_capacity: number;
    created_by: string;
    created_at: string;
    profiles?: {
        full_name: string;
    };
    focus_attendees: Attendee[];
}

export default function FocusSessionsPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [sessions, setSessions] = useState<FocusSession[]>([]);
    const [topic, setTopic] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [sessionTime, setSessionTime] = useState("");
    const [maxCapacity, setMaxCapacity] = useState<number>(6);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [timerRunning, setTimerRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    const supabase = createClient();

    const fetchSessions = async (batchId: string) => {
        try {
            const {data, error} = await supabase
                .from("focus_sessions")
                .select(`
                *,
                profiles (
                full_name
                ),
                focus_attendees (
                id,
                user_id,
                profiles (
                full_name
                )
                )
                `)
                .eq("batch_id", batchId)
                .order("session_time", {ascending: true});

            if (error) throw error;
            if (data) {
                setSessions(data as unknown as FocusSession[]);
            }
        } catch (err) {
            console.error("Failed to load study sessions:", err);
        }
    };

    useEffect(() => {
        async function loadProfileAndSessions() {
            try {
                setLoading(true);
                const {data: {user: authUser}} = await supabase.auth.getUser();
                if (!authUser) return;
                setUser(authUser);

                const {data: profileData} = await supabase
                    .from("profiles")
                    .select("batch_id, full_name")
                    .eq("id", authUser.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                    await fetchSessions(profileData.batch_id);
                }
            } catch (err) {
                console.error("Failed to retrieve profile:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfileAndSessions();
    }, []);

    useEffect(() => {
        let interval: any = null;
        if (timerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            if (!isBreak) {
                alert("🔔 Study session complete! Take a 5-minute break.");
                setIsBreak(true);
                setTimeLeft(5 * 60);
            } else {
                alert("💪 Break finished! Time to focus for another 25 minutes.");
                setIsBreak(false);
                setTimeLeft(25 * 60);
            }
            setTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [timerRunning, timeLeft, isBreak]);

    const toggleTimer = () => setTimerRunning(!timerRunning);
    const resetTimer = () => {
        setTimerRunning(false);
        setIsBreak(false);
        setTimeLeft(25 * 60);
    };
    const formatTimerText = () => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !location.trim() || !sessionTime || !profile?.batch_id || !user) return;

        setSubmitting(true);
        try {
            const {data: sessionData, error: sessionError} = await supabase
                .from("focus_sessions")
                .insert({
                    batch_id: profile.batch_id,
                    topic: topic.trim(),
                    description: description.trim(),
                    location: location.trim(),
                    session_time: new Date(sessionTime).toISOString(),
                    max_capacity: maxCapacity,
                    created_by: user.id
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            const {error: attendeeError} = await supabase
                .from("focus_attendees")
                .insert({
                    session_id: sessionData.id,
                    user_id: user.id
                });

            if (attendeeError) throw attendeeError;

            setTopic("");
            setDescription("");
            setLocation("");
            setSessionTime("");
            setMaxCapacity(6);

            alert("📅 Focus Study session created!");
            await fetchSessions(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to schedule study group: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoinSession = async (sessionId: string) => {
        if (!user || !profile?.batch_id) return;
        try {
            const {error} = await supabase
                .from("focus_attendees")
                .insert({
                    session_id: sessionId,
                    user_id: user.id
                });
            if (error) throw error;
            await fetchSessions(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to join: ${err.message}`);
        }
    };

    const handleLeaveSession = async (sessionId: string) => {
        if (!user || !profile?.batch_id) return;
        try {
            const {error} = await supabase
                .from("focus_attendees")
                .delete()
                .eq("session_id", sessionId)
                .eq("user_id", user.id);

            if (error) throw error;
            await fetchSessions(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to leave: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Loading Study Rooms...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Study Groups & Focus Rooms</h1>
                <p className={styles.subtitle}>
                    Coordinate study sessions with your classmates and focus together using the Pomodoro timer.
                </p>
            </div>
            <div className={styles.grid}>
                {/* Main panel: Active focus co-working schedules */}
                <div>
                    <h2 className={styles.sectionTitle}>📅 Active Study Sessions</h2>
                    {sessions.length === 0 ? (
                        <div className={styles.emptyState}>
                            No study sessions scheduled yet. Create one on the right to invite your cohort!
                        </div>
                    ) : (
                        <div className={styles.sessionList}>
                            {sessions.map((session) => {
                                const count = session.focus_attendees.length;
                                const isFull = count >= session.max_capacity;
                                const isUserAttending = session.focus_attendees.some(
                                    a => a.user_id === user?.id
                                );

                                return (
                                    <div key={session.id} className={styles.sessionCard}>
                                        <div className={styles.sessionInfo}>
                                            <div className={styles.sessionHeader}>
                                                <span
                                                className={`${styles.capacityBadge} ${isFull ? styles.capacityFull : ""}`}
                                                >
                                                    👥 {count} / {session.max_capacity} Seats
                                                </span>
                                                <h3 className={styles.sessionTopic}>{session.topic}</h3>
                                            </div>
                                            {session.description && (
                                                <p className={styles.sessionDesc}>{session.description}</p>
                                            )}
                                            <div className={styles.sessionDetails}>
                                                <span>📍 Location: {session.location}</span>
                                                <span>•</span>
                                                <span>
                                                    🕒 Time: {new Date(session.session_time).toLocaleString()}
                                                </span>
                                                <span>•</span>
                                                <span>By: {session.profiles?.full_name || "Student"}</span>
                                            </div>
                                            {/* Attendee names display */}
                                            {count > 0 && (
                                                <div className={styles.attendeeList}>
                                                    <span className={styles.attendeeTitle}>Attendees:</span>
                                                    <span className={styles.attendeeNames}>
                                                        {session.focus_attendees.map(a => a.profiles?.full_name || "Student").join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.actions}>
                                            {isUserAttending ? (
                                                <button
                                                type="button"
                                                className={styles.btnLeave}
                                                onClick={() => handleLeaveSession(session.id)}
                                                >
                                                    Leave Group
                                                </button>
                                            ) : (
                                                <button
                                                type="button"
                                                className={styles.btnJoin}
                                                onClick={() => handleJoinSession(session.id)}
                                                disabled={isFull}
                                                >
                                                    {isFull ? "Full" : "Join Session"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {/* Sidebar: Pomodoro and creation form */}
                <div className={styles.sidebar}>
                    {/* Pomodoro clock card */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>⏱️ Focus Pomodoro Timer</h2>
                        <div className={styles.pomoWidget}>
                            <span className={styles.pomoStatus}>
                                {isBreak ? "🌸 Break Interval" : "📖 Study Interval"}
                            </span>
                            <div className={`${styles.pomoTimer} ${isBreak ? styles.pomotimerbreak : ""}`}>
                                {formatTimerText()}
                            </div>
                            <div className={styles.pomoControls}>
                                <button
                                type="button"
                                className={styles.btnPrim}
                                onClick={toggleTimer}
                                >
                                    {timerRunning ? "Pause" : "Start"}
                                </button>
                                <button
                                type="button"
                                className={styles.btnSec}
                                onClick={resetTimer}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Creation form card */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>Schedule Study Group</h2>
                        <form onSubmit={handleCreateSession} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Study Topic / Subject</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Calculus III Exam Prep"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Location / Link</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Library Room 304 or Zoom Link"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Session Date & Time</label>
                                <input
                                type="datetime-local"
                                className={styles.input}
                                value={sessionTime}
                                onChange={(e) => setSessionTime(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Max Capacity (Attendees)</label>
                                <select
                                className={styles.select}
                                value={maxCapacity}
                                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                                >
                                    {[2, 4, 6, 8, 10, 15, 20].map((num) => (
                                        <option key={num} value={num}>{num} Seats</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Session Goals</label>
                                <textarea
                                className={styles.textarea}
                                placeholder="e.g. Discuss mick exam papers and solve different integration questions together..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submitting}
                            >
                                {submitting ? "Scheduling..." : "Schedule Session"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}