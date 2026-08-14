"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface StudyResource {
    id: string;
    title: string;
    description: string;
    category: "notes" | "slides" | "papers" | "other";
    file_url: string;
    upvotes: number;
    created_at: string;
    profiles?: {
        full_name: string;
    };
    schedule_id: string;
}

interface Schedule {
    id: string;
    subject_name: string;
}

interface Exam {
    id: string;
    title: string;
    date: Date;
}

function CountdownTimer ({targetDate}: {targetDate: Date}) {
    const [timeLeft, setTimeLeft] = useState({days: 0, hours: 0, minutes: 0, seconds: 0});

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();
            let timeLeftData = {days: 0, hours: 0, minutes: 0, seconds: 0};

            if (difference > 0) {
                timeLeftData = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }
            return timeLeftData;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        },1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className={styles.timer}>
            <div className={styles.timeSegment}>
                <span className={styles.timeVal}>{timeLeft.days}</span>
                <span className={styles.timeLabel}>Days</span>
            </div>
            <div className={styles.timeSegment}>
                <span className={styles.timeVal}>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className={styles.timeLabel}>Hrs</span>
            </div>
            <div className={styles.timeSegment}>
                <span className={styles.timeVal}>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className={styles.timeLabel}>Min</span>
            </div>
            <div className={styles.timeSegment}>
                <span className={styles.timeVal}>{String(timeLeft.seconds).padStart(2, "0")}</span>
                <span className={styles.timeLabel}>Sec</span>
            </div>
        </div>
    );
}

export default function StudyResourcesDashboard() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resources, setResources] = useState<StudyResource[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>("all");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<"notes" | "slides" | "papers" | "other">("notes");
    const [fileUrl, setFileUrl] = useState("");
    const [selectedSchedule, setSelectedSchedule] = useState("");
    const [votedResources, setVotedResources] = useState<Record<string, boolean>>({});
    const [exams] = useState<Exam[]>([
        {
            id: "ex-1",
            title: "Physics 202: Engineering Physics Midterm",
            date: new Date(Date.now() + 5 * 86400000 + 4 * 3600000)
        },
        {
            id : "ex-2",
            title: "CHEM 201: Organic Chemistry Final Exam",
            date: new Date(Date.now() + 12 * 86400000 + 6 * 3600000)
        },
        {
            id: "ex-3",
            title: "CS 301: Advanced Coding Project Presentation",
            date: new Date(Date.now() + 8 * 86400000)
        }
    ]);

    const supabase = createClient();

    const fetchResources = async (batchId: string) => {
        try {
            const {data, error} = await supabase
                .from("study_resources")
                .select(`
                *,
                profiles (
                    full_name
                    )
                    `)
                .eq("batch_id", batchId)
                .order("upvotes", {ascending: false});

            if (error) throw error;
            if (data) {
                setResources(data as unknown as StudyResource[]);
            }
        } catch (err) {
            console.error("Failed to load study resources:", err);
        }
    };

    useEffect(() => {
        async function loadResourcesData() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                   if (!user) return;

                   const {data: profileData} = await supabase
                       .from("profiles")
                       .select("batch_id, full_name")
                       .eq("id", user.id)
                       .single();

                   if (profileData) {
                       setProfile(profileData);
                       await fetchResources(profileData.batch_id);

                       const {data: scheduleData} = await supabase
                           .from("schedules")
                           .select("id, subject_name")
                           .eq("batch_id", profileData.batch_id);

                       if (scheduleData) {
                           setSchedules(scheduleData);
                       }
                   }
            } catch (err) {
                console.error("Error loading resources database:", err);
            } finally {
                setLoading(false);
            }
        }
        loadResourcesData();
    }, []);

    const handleShareResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !fileUrl.trim() || !profile?.batch_id) return;

        setSubmitting(true);
        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) return;

            const {error} = await supabase
                .from("study_resources")
                .insert({
                    batch_id: profile.batch_id,
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    file_url: fileUrl.trim(),
                    schedule_id: selectedSchedule || null,
                    created_by: user.id
                });
            if (error) throw error;

            setTitle("");
            setDescription("");
            setFileUrl("");
            setSelectedSchedule("");

            alert("🎉 Material shared with your class cohort successfully!");
            await fetchResources(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to share: ${err.message || err}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpvote = async (resource: StudyResource) => {
        if (votedResources[resource.id]) {
            alert("👍 You have already upvoted this resource!");
            return;
        }

        try {
            const {error} = await supabase
                .from("study_resources")
                .update({upvotes: resource.upvotes + 1})
                .eq("id", resource.id);

            if (error) throw error;

            setResources(prev =>
            prev.map(r => r.id === resource.id ? {...r, upvotes: r.upvotes + 1} : r)
            );
            setVotedResources(prev => ({...prev, [resource.id]: true}));
        } catch (err: any) {
            console.error("Upvote failed:", err.message);
        }
    };

    const filteredResources = resources.filter(res => {
        if (activeTab === "all") return true;
        return res.category === activeTab;
    });

    if (loading) {
     return (
         <div className={styles.loader}>
             <div className={styles.spinner}></div>
             <span>Loading Study Resources...</span>
         </div>
     );
    }
    return (
        <div className={styles.conatiner}>
            <div className={styles.header}>
                <h1 className={styles.title}>Study Resource Hub</h1>
                <p className={styles.subtitle}>
                    Crowdsource lecture notes, slides, and exam papers with your class cohort.
                </p>
            </div>

            <div className={styles.grid}>
                {/* Main content area */}
                <div>
                    <h2 className={styles.sectionTitle}>📁 Shared Course Materials</h2>
                    {/* Navigation tabs */}
                    <div className={styles.tabContainer}>
                        {["all", "notes", "slides", "papers", "other"].map((tab) => (
                            <button
                            key={tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                            onClick={() => setActiveTab(tab)}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {filteredResources.length === 0 ? (
                        <div className={styles.emptyState}>
                            No resources shared under this category yet. Be the first to share one!
                        </div>
                    ) : (
                        <div className={styles.resourceList}>
                            {filteredResources.map((res) => (
                                <div key={res.id} className={styles.resourceCard}>
                                    <div className={styles.resourceInfo}>
                                        <div className={styles.resourceHeader}>
                                            <span className={styles.categoryBudget}>{res.category}</span>
                                            <h3 className={styles.resourceTitle}>{res.title}</h3>
                                        </div>
                                        {res.description && (
                                            <p className={styles.resourceDesc}>{res.description}</p>
                                        )}
                                        <div className={styles.resourceMeta}>
                                            <span>By: {res.profiles?.full_name || "Anonymous student"}</span>
                                            <span>•</span>
                                            <span>Shared on: {res.created_at.slice(0, 10)}</span>
                                        </div>
                                    </div>
                                    <div className={styles.actions}>
                                        {/* Upvote Button */}
                                        <button
                                        type="button"
                                        className={`${styles.btnVote} ${votedResources[res.id] ? styles.btnVoteActive : ""}`}
                                        onClick={() => handleUpvote(res)}
                                        >
                                            👍 {res.upvotes}
                                        </button>
                                        <a
                                        href={res.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnLink}
                                        >
                                            Open Material ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Sidebar area: Countdown widget & upload form */}
                <div className={styles.sidebar}>
                    {/* Countdown clock widget */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>⏰ Upcoming Exam Countdowns</h2>
                        <div className={styles.countdownContainer}>
                            {exams.map((exam) => (
                                <div key={exam.id} className={styles.countdownCard}>
                                    <div className={styles.examTitle}>{exam.title}</div>
                                    <div className={styles.examDate}>Date: {exam.date.toDateString()}</div>
                                    <CountdownTimer targetDate={exam.date}/>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Upload / Resource link submission form */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>📤 Share Study Material</h2>
                        <form onSubmit={handleShareResource} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Material Title</label>
                            <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Organic Chemistry Lecture 5 Summary"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Link URL (PDF, Slides, Drive)</label>
                                <input
                                type="url"
                                className={styles.input}
                                placeholder="e.g. https://drive.google.com/notes..."
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Category</label>
                                <select
                                className={styles.select}
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                >
                                    <option value="notes">Lecture Notes</option>
                                    <option value="slides">Slides</option>
                                    <option value="papers">Past Exam Papers</option>
                                    <option value="other">Other Resources</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Related Course (Optional)</label>
                                <select
                                className={styles.select}
                                value={selectedSchedule}
                                onChange={(e) => setSelectedSchedule(e.target.value)}
                                >
                                    <option value="">None / General</option>
                                    {schedules.map((s) => (
                                        <option key={s.id} value={s.id}>{s.subject_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Short Description</label>
                                <textarea
                                className={styles.textarea}
                                placeholder="Provide context about what these notes cover..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <button
                            type="button"
                            className={styles.btnSubmit}
                            disabled={submitting}
                            >
                                {submitting ? "Sharing..." : "Share with Cohort"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}