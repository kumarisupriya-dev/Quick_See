"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import {createClient} from "../../../utils/supabase/client";

interface Schedule {
    id: string;
    subject_name: string;
    room_number: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ReschedulePage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [userRole, setUserRole] = useState("student");
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [isCanceled, setIsCanceled] = useState(false);
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");
    const [newRoom, setNewRoom] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        async function loadFormRequirements() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }
                setUserId(user.id);
                const {data: profile} = await supabase
                    .from("profiles")
                    .select("role, batch_id")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role);

                    if (profile.batch_id) {
                        const {data: scheduleData} = await supabase
                            .from("schedules")
                            .select("id, subject_name, room_number, start_time, end_time, day_of_week")
                            .eq("batch_id", profile.batch_id)
                            .order("day_of_week", {ascending: true})
                            .order("start_time", {ascending: true})

                        if (scheduleData) setSchedules(scheduleData);
                    }
                }
            } catch (err) {
                console.error("Error loading reschedule requirements:", err);
            } finally {
                setLoading(false);
            }
        }
        loadFormRequirements();
    }, [supabase, router]);

    const handlePromoteToRep = async () => {
        if (!userId) return;
        try {
            const {error} = await supabase
                .from("profiles")
                .update({role: "class_rep"})
                .eq("id", userId);
            if (error) throw error;

            setUserRole("class_rep");
            setErrorMsg("");
            setSuccessMsg("Success! You are now a Class Representative. You can save changes.");
        } catch (err: any) {
            setErrorMsg(`Failed to promote: ${err.message}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            if (userRole === "student") {
                throw new Error(
                    "Permission Denied: Only Class Representatives or Admin can report cancellations/reschedules."
                );
            }
            if (!targetDate) throw new Error("Please select a target date.");
            const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);
            if (!selectedSchedule) throw new Error("Please select a class.");

            const dateObj = new Date(targetDate);
            const targetDayOfWeek = dateObj.getDay();

            if (targetDayOfWeek !== selectedSchedule.day_of_week) {
                throw new Error(
                    `Date Mismatch: The selected class is scheduled for a ${WEEKDAYS[selectedSchedule.day_of_week]}, but the selected target date is a ${WEEKDAYS[targetDayOfWeek]}.`
                );
            }
            const {error} = await supabase
                .from("cancellations_reschedules")
                .upsert(
                    {
                        schedule_id: selectedScheduleId,
                        target_date: targetDate,
                        is_canceled: isCanceled,
                        new_start_time: isCanceled ? null : newStartTime || null,
                        new_end_time: isCanceled ? null : newEndTime || null,
                        new_room: isCanceled ? null : newRoom.trim() || null,
                    },
                    {onConflict: "schedule_id, target_date"}
                );

            if (error) throw error;

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                Loading reschedule settings...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Report Schedule Update</h2>
                    <p className={styles.subtitle}>
                        Mark a class as canceled or change its room/time for a specific day
                    </p>
                </div>

                {userRole === "student" && (
                    <div className={styles.roleAlert}>
                        🔒 <strong>Class Rep Permissions Required:</strong> Your current role is <strong>Student</strong>
                        Only Class Representatives can post updates.
                        <br />
                        <button
                        onClick={handlePromoteToRep}
                        className={styles.btnPromote}
                        style={{marginTop: "0.5rem"}}
                        >
                            👑 Promote Me to Class Rep (Testing Mode)
                        </button>
                    </div>
                )}
                {errorMsg && (
                    <div className={styles.errorAlert}>
                        <span>{errorMsg}</span>
                    </div>
                )}
                {successMsg && (
                    <div className={styles.successAlert}>
                        <span>{successMsg}</span>
                    </div>
                )}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Select class */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Select Class</label>
                        <select
                        className={styles.select}
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        required
                        >
                            <option value="">Choose Class...</option>
                            {schedules.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {WEEKDAYS[s.day_of_week]} — {s.subject_name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Date selector */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Target Date</label>
                        <input
                        type="date"
                        className={styles.input}
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        required
                        />
                    </div>
                    {/* Cancel Checkbox */}
                    <label className={styles.checkboxContainer}>
                        <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isCanceled}
                        onChange={(e) => setIsCanceled(e.target.checked)}
                        />
                        <span className={styles.label} style={{userSelect: "none"}}>
                            Class is Canceled
                        </span>
                    </label>
                    {/* Reschedule fields (only if not canceled) */}
                    {!isCanceled && (
                        <div className={styles.rescheduleFields}>
                            <div className={styles.timeRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>New Start Time</label>
                                    <input
                                    type="time"
                                    className={styles.input}
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>New End Time</label>
                                    <input
                                    type="time"
                                    className={styles.input}
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>New Room Number</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Room 402, Lab A"
                                value={newRoom}
                                onChange={(e) => setNewRoom(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <button
                    type="submit"
                    className={styles.btnSubmit}
                    disabled={submitting || (userRole === "student" && !successMsg)}
                    >
                        {submitting && <span className={styles.spinner}></span>}
                        Save Update
                    </button>

                    <Link href="/dashboard" className={styles.btnCancel}>
                        Cancel
                    </Link>
                </form>
            </div>
        </div>
    );
}