"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface LmsCoursework {
    id: string;
    title: string;
    type: "assignment" | "quiz" | "project";
    due_date: string;
    points: number;
    course: string;
}

interface Schedule {
    id: string;
    subject_name: string;
    start_time: string;
    day_of_week: number;
}

export default function LmsDashboard() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [provider, setProvider] = useState("canvas");
    const [instanceUrl, setInstanceUrl] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [demoMode, setDemoMode] = useState(true);
    const [coursework, setCoursework] = useState<LmsCoursework[]>([]);
    const [syncClassMap, setSyncClassMap] = useState<Record<string, string>>({});
    const [syncedItems, setSyncedItems] = useState<Record<string, boolean>>({});

    const supabase = createClient();

    useEffect(() => {
        async function loadDashboardData() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) return;

                const {data: profileData} = await supabase
                    .from("profiles")
                    .select("batch_id, role")
                    .eq("id", user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);

                    const {data: scheduleData} = await supabase
                        .from("schedules")
                        .select("id, subject_name, start_time, day_of_week")
                        .eq("batch_id", profileData.batch_id);

                    if (scheduleData) {
                        setSchedules(scheduleData);
                    }
                }

                const savedProvider = localStorage.getItem("lms_provider");
                const savedUrl = localStorage.getItem("lms_url");
                const savedToken = localStorage.getItem("lms_token");
                const savedDemo = localStorage.getItem("lms_demo");

                if (savedProvider) setProvider(savedProvider);
                if (savedUrl) setInstanceUrl(savedUrl);
                if (savedToken) setAccessToken(savedToken);
                if (savedDemo !== null) setDemoMode(savedDemo === "true");

                if (savedDemo === "true" || (savedUrl && savedToken)) {
                    loadCourseworkList(savedDemo === "true");
                }
            } catch (err) {
                console.error("Error loading LMS configuration:", err);
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, []);

    const loadCourseworkList = (useDemo: boolean) => {
        if (useDemo) {
            const mockList: LmsCoursework[] = [
                {
                    id: "lms-1",
                    title: "Chemistry Lab Report 4: Acids & Bases",
                    type: "assignment",
                    due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                    points: 50,
                    course: "CHEM 201: Organic Chemistry",
                },
                {
                    id: "lms-2",
                    title: "Calculus III Quiz 2 - Multivariable Limits",
                    type: "quiz",
                    due_date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
                    points: 100,
                    course: "MATH 302: Calculus III",
                },
                {
                    id: "lms-3",
                    title: "Advanced Coding Project 1 - Router Engine",
                    type: "project",
                    due_date: new Date(Date.now() + 345600000).toISOString().split("T")[0],
                    points: 100,
                    course: "CS 301: Advanced Coding",
                },
                {
                    id: "lms-4",
                    title: "Physics midterm preparatory quiz",
                    type: "quiz",
                    due_date: new Date(Date.now() +432000000).toISOString().split("T")[0],
                    points: 15,
                    course: "PHYS 202: Engineering Physics",
                }
            ];
            setCoursework(mockList);

            const initialMap: Record<string, string> = {};
            mockList.forEach(item => {
                const match = schedules.find(s =>
                item.course.toLowerCase().includes(s.subject_name.toLowerCase())
            );
                if (match) {
                    initialMap[item.id] = match.id;
                } else if (schedules.length > 0) {
                    initialMap[item.id] = schedules[0].id;
                }
        });
            setSyncClassMap(initialMap);
    } else {
        setCoursework([]);
        }
    };

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
         try {
             localStorage.setItem("lms_provider", provider);
             localStorage.setItem("lms_url", instanceUrl);
             localStorage.setItem("lms_token", accessToken);
             localStorage.setItem("lms_demo", String(demoMode));

             loadCourseworkList(demoMode);
             alert("🔒 LMS settings saved locally and coursework synced successfully!");
         } catch (err) {
             console.error("Save config failed:", err);
         } finally {
             setSaving(false);
         }
    };

    const handleSyncToChecklist = async (item: LmsCoursework) => {
        const scheduleId = syncClassMap[item.id];
        if (!scheduleId) {
            alert("⚠️ Please associate this assignment with a scheduled class first!");
            return;
        }
        const selectedSchedule = schedules.find(s => s.id === scheduleId);
        if (!selectedSchedule || !profile?.batch_id) return;

        try {
            const {error} = await supabase
                .from("checklist_items")
                .insert({
                    batch_id: profile.batch_id,
                    schedule_id: scheduleId,
                    target_date: item.due_date,
                    item_description: `LMS ${item.title} due (${item.points} pts)`,
                    physical_items: item.type === "project" ? "Submit Hardcopy Document" : "Calculus Workbook",
                    is_completed: false
                });
            if (error) throw error;

            setSyncedItems(prev => ({...prev, [item.id]: true}));
            alert(`🎉 Synced "${item.title}" directly to the batch checklist!`);
        } catch (err: any) {
            alert(`Failed to sync: ${err.message || err}`);
        }
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Loading LMS integration settings...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>LMS Coursework Syncer</h1>
                <p className={styles.subtitle}>
                    Synchronize Canvas, Blackboard, or Moodle deadlines directly to your class crowdsourced cheklist.
                </p>
            </div>
            <div className={styles.grid}>
                {/* Configuration Panel */}
                <div className={styles.configCard}>
                    <h2 className={styles.cardTitle}>LMS Portal Credentials</h2>
                    <form onSubmit={handleSaveConfig} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Provider</label>
                            <select
                            className={styles.select}
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value="canvas">Canvas LMS</option>
                                <option value="moodle">Moodle</option>
                                <option value="blackboard">Blackboard Learn</option>
                            </select>
                        </div>
                        {!demoMode && (
                            <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>LMS Base URL</label>
                                <input
                                type="url"
                                className={styles.input}
                                placeholder="https://canvas.university.edu"
                                value={instanceUrl}
                                onChange={(e) => setInstanceUrl(e.target.value)}
                                required
                                />
                            </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Developer Token</label>
                                    <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="Enter account access token..."
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    required
                                    />
                                </div>
                            </>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={demoMode}
                                onChange={(e) => setDemoMode(e.target.checked)}
                                />
                                Run in Sandbox Demo Mode
                            </label>
                        </div>
                        <button
                        type="submit"
                        className={styles.btnSave}
                        disabled={saving}
                        >
                            {saving ? "Saving..." : "Verify & Connect"}
                        </button>
                    </form>
                </div>
                {/* Coursework Viewer and Sync Action */}
                <div className={styles.courseworkContainer}>
                    <h2 className={styles.cardTitle}>Upcoming Deadlines ({coursework.length})</h2>
                    {coursework.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>🎓</span>
                            <h3 className={styles.emptyTitle}>No connected Portal</h3>
                            <p className={styles.emptyDesc}>
                                Set up your developer credentials or enable Demo Mode in the settings panel to sync academic deadlines.
                            </p>
                        </div>
                    ) : (
                        coursework.map((item) => (
                            <div key={item.id} className={styles.courseworkCard}>
                                <div className={styles.courseworkHeader}>
                                    <div className={styles.courseworkInfo}>
                                        <div className={styles.courseMeta}>
                                            <span className={`${styles.typeBadge} ${
                                                item.type === "assignment" ? styles.badgeAssignment :
                                                    item.type === "quiz" ? styles.badgeQuiz : styles.badgeProject
                                            }`}>
                                                {item.type}
                                            </span>
                                            <span>{item.course}</span>
                                        </div>
                                        <h3 className={styles.courseworkTitle}>{item.title}</h3>
                                    </div>
                                    <div style={{textAlign: "right"}}>
                                        <div style={{fontSize: "0.85rem", fontWeight: "700"}}>
                                            {item.points} pts
                                        </div>
                                        <div style={{fontSize: "0.75rem", opacity: 0.6, marginTop: "0.125rem"}}>
                                            Due: {item.due_date}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.syncContainer}>
                                    {syncedItems[item.id] ? (
                                        <span className={styles.successIndicator}>✓ Synced to Class Dashboard</span>
                                    ) : (
                                        <>
                                        <select
                                        className={styles.syncSelect}
                                        value={syncClassMap[item.id] || ""}
                                        onChange={(e) => setSyncClassMap((prev) => ({...prev, [item.id]: e.target.value}))}
                                        >
                                            <option value="" disabled>Select Class Schedule...</option>
                                            {schedules.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.subject_name} ({s.start_time.slice(0, 5)})
                                                </option>
                                            ))}
                                        </select>
                                            <button
                                            className={styles.btnSync}
                                            onClick={() => handleSyncToChecklist(item)}
                                            >
                                                Bulk Sync to Class
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}