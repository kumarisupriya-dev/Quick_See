"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface Announcement {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    profiles?: {
        full_name: string;
    };
    created_by: string;
}

interface PollVote {
    id: string;
    user_id: string;
}

interface PollOption {
    id: string;
    option_text: string;
    poll_votes: PollVote[];
}

interface Poll {
    id: string;
    question: string;
    created_at: string;
    profiles?: {
        full_name: string;
    };
    poll_options: PollOption[];
    created_by: string;
}

export default function AnnouncementsDashboard() {
    const [loading, setLoading] = useState(true);
    const [submittingAnn, setSubmittingAnn] = useState(false);
    const [submittingPoll, setSubmittingPoll] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [annTitle, setAnnTitle] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [annPinned, setAnnPinned] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["",""]);

    const supabase = createClient();

    const fetchBoardData = async (batchId: string) => {
        try {
            const {data: annData, error: annError} = await supabase
                .from("announcements")
                .select(`
                *,
                profiles (
                full_name
                )
                `)
                .eq("batch_id", batchId)
                .order("is_pinned", {ascending: false})
                .order("created_at", {ascending: false})

            if (annError) throw annError;
            setAnnouncements(annData as unknown as Announcement[]);

            const {data: pollData, error: pollError} = await supabase
                .from("polls")
                .select(`
                *,
                profiles (
                full_name
                ),
                poll_options (
                id,
                option_text,
                poll_votes (
                id, 
                user_id
                )
                )
                `)
                .eq("batch_id", batchId)
                .order("created_at", {ascending: false});

            if (pollError) throw pollError;
            setPolls(pollData as unknown as Poll[]);
        } catch (err) {
            console.error("Failed to load class board:", err);
        }
    };

    useEffect(() => {
        async function loadProfileAndData() {
            try {
                setLoading(true);
                const {data: {user: authUser}} = await supabase.auth.getUser();
                if (!authUser) return;
                setUser(authUser);

                const {data: profileData}= await supabase
                    .from("profiles")
                    .select("batch_id, full_name, role")
                    .eq("id", authUser.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                    await fetchBoardData(profileData.batch_id);
                }
            } catch (err) {
                console.error("On load board error:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfileAndData();
    }, []);

    const handleShareAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!annTitle.trim() || !annContent.trim() || !profile?.batch_id || !user) return;

        setSubmittingAnn(true);
        try {
            const {error} = await supabase
                .from("announcements")
                .insert({
                    batch_id: profile.batch_id,
                    title: annTitle.trim(),
                    content: annContent.trim(),
                    is_pinned: annPinned,
                    created_by: user.id
                });
            if (error) throw error;
            setAnnTitle("");
            setAnnContent("");
            setAnnPinned(false);
            alert("📢 Class announcement posted!");
            await fetchBoardData(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to post: ${err.message || err}`);
        } finally {
            setSubmittingAnn(false);
        }
    };

    const handleTogglePin = async (ann: Announcement) => {
        if (!profile?.batch_id) return;
        try {
            const {error} = await supabase
                .from("announcements")
                .update({is_pinned: !ann.is_pinned})
                .eq("id", ann.id);

            if (error) throw error;
            await fetchBoardData(profile.batch_id);
        } catch (err: any) {
            console.error("Pin toggling failed:", err.message);
        }
    };

    const handleAddPollOption = () => {
        if (pollOptions.length >= 6) {
            alert("Maximum 6 poll options allowed!");
            return;
        }
        setPollOptions(prev => [...prev, ""]);
    };

    const handlePollOptionChange = (index: number, val: string) => {
        setPollOptions(prev => prev.map((o, idx) => idx === index ? val : o));
    };

    const handleRemovePollOption = (index: number) => {
        if (pollOptions.length <= 2) {
            alert("Minimum 2 options required!");
            return;
        }
        setPollOptions(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleCreatePoll = async (e: React.FormEvent) => {
        e.preventDefault();
        const validOptions = pollOptions.filter(o => o.trim() !== "");
        if (!pollQuestion.trim() || validOptions.length < 2 || !profile?.batch_id || !user) return;

        setSubmittingPoll(true);
        try {
            const {data: pollRecord, error: pollError} = await supabase
                .from("polls")
                .insert({
                    batch_id: profile.batch_id,
                    question: pollQuestion.trim(),
                    created_by: user.id
                })
                .select()
                .single();

            if (pollError) throw pollError;

            const optionInserts = validOptions.map(opt => ({
                poll_id: pollRecord.id,
                option_text: opt.trim()
            }));

            const {error: optionsError} = await supabase
                .from("poll_options")
                .insert(optionInserts);

            if (optionsError) throw optionsError;

            setPollQuestion("");
            setPollOptions(["", ""]);

            alert("📊 Live Class Poll created successfully!");
            await fetchBoardData(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to create poll: ${err.message || err}`);
        } finally {
            setSubmittingPoll(false);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        if (!user || !profile?.batch_id) return;
        try {
            const {error} = await supabase
                .from("poll_votes")
                .upsert({
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: user.id
                }, {onConflict: "poll_id,user_id"});

            if (error) throw error;
            await fetchBoardData(profile.batch_id);
        } catch (err: any) {
            console.error("Voting failed:", err.message);
        }
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Loading Class Announcements...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Cohort Board & Polls</h1>
                <p className={styles.subtitle}>
                    View pinned noticed from your Class Representatives and vote on active schedule polls.
                </p>
            </div>
            <div className={styles.grid}>
                {/* Board feed list */}
                <div className={styles.feedContainer}>
                    <h2 className={styles.sectionTitle}>📣 Class Notices</h2>
                    {announcements.length === 0 && polls.length === 0 && (
                        <div className={styles.emptyState}>
                            The board is completely clean! No notice postings yet.
                        </div>
                    )}
                    {/* Render notices */}
                    {announcements.map((ann) => (
                        <div
                        key={ann.id}
                        className={`${styles.announcementCard} ${ann.is_pinned ? styles.cardPinned : ""}`}
                        >
                            {ann.is_pinned && (
                                <div className={styles.pinnedHeader}>📌 Pinned Announcement</div>
                            )}
                            {/* Pin action */}
                            {profile?.role === "class_rep" && (
                                <button
                                type="button"
                                className={`${styles.pinAction} ${ann.is_pinned ? styles.pinActionActive : ""}`}
                                onClick={() => handleTogglePin(ann)}
                                title={ann.is_pinned ? "Unpin Announcement" : "Pin Announcement"}
                                >
                                    📌
                                </button>
                            )}
                            <h3 className={styles.announcementTitle}>{ann.title}</h3>
                            <p className={styles.announcementBody}>{ann.content}</p>
                            <div className={styles.announcementMeta}>
                                <span>By: {ann.profiles?.full_name || "Anonymous rep"}</span>
                                <span>•</span>
                                <span>Posted: {ann.created_at.slice(0, 10)}</span>
                            </div>
                        </div>
                    ))}
                    {/* Render interactive polls */}
                    {polls.map((poll) => {
                        const totalVotes = poll.poll_options.reduce(
                            (acc, opt) => acc + opt.poll_votes.length,
                            0
                        );
                        const userVote = poll.poll_options.find(opt =>
                        opt.poll_votes.some(v => v.user_id === user?.id)
                        );

                        return (
                            <div key={poll.id} className={styles.pollCard}>
                                <h3 className={styles.pollQuestion}>📊 Poll: {poll.question}</h3>
                                <div className={styles.pollOptionsList}>
                                    {poll.poll_options.map((opt) => {
                                        const optVotes = opt.poll_votes.length;
                                        const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                        const isSelected = userVote?.id === opt.id;

                                        return (
                                            <div key={opt.id} className={styles.pollOptionWrapper}>
                                                <button
                                                type="button"
                                                className={`${styles.btnVoteOption} ${isSelected ? styles.btnVoteOptionSelected : ""}`}
                                                onClick={() => handleVote(poll.id, opt.id)}
                                                >
                                                    <span>{opt.option_text}</span>
                                                    <span>{percentage}% ({optVotes})</span>
                                                </button>
                                                <div className={styles.pollProgressBg}>
                                                    <div
                                                    className={`${styles.pollProgressFill} ${isSelected ? styles.pollProgressFillSelected : ""}`}
                                                    style={{width: `${percentage}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className={styles.announcementMeta}>
                                    <span className={styles.totalVotes}>Total Votes: {totalVotes}</span>
                                    <span>•</span>
                                    <span>Created: {poll.created_at.slice(0, 10)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Sidebar input forms */}
                <div className={styles.sidebar}>
                    {/* Announcement sharing form */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTItle}>Share Announcement</h2>
                        <form onSubmit={handleShareAnnouncement} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Notice Title</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Chemistry Lab rescheduled"
                                value={annTitle}
                                onChange={(e) => setAnnTitle(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Content</label>
                                <textarea
                                className={styles.textarea}
                                placeholder="Write detailed announcements detials here..."
                                value={annContent}
                                onChange={(e) => setAnnContent(e.target.value)}
                                required
                                />
                            </div>
                            {profile?.role === "class_rep" && (
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel} style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer"}}>
                                        <input
                                        type="checkbox"
                                        checked={annPinned}
                                        onChange={(e) => setAnnPinned(e.target.checked)}
                                        style={{width: "1.125rem", height: "1.125rem"}}
                                        />
                                        Pin notice to top of feed
                                    </label>
                                </div>
                            )}
                            <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submittingAnn}
                            >
                                {submittingAnn ? "Posting..." : "Share Notice"}
                            </button>
                        </form>
                    </div>
                    {/* Poll creation form */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>Create Class Poll</h2>
                        <form onSubmit={handleCreatePoll} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Poll Question</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Schedule extra physics class?"
                                value={pollQuestion}
                                onChange={(e) => setPollQuestion(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formgroup}>
                                <label className={styles.label} style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                    <span>Poll Options</span>
                                    <button
                                    type="button"
                                    className={styles.btnAddOption}
                                    onClick={handleAddPollOption}
                                    >
                                        + Add Option
                                    </button>
                                </label>
                                <div className={styles.pollFormOptions}>
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} className={styles.optionInputRow}>
                                            <input
                                            type="text"
                                            className={styles.input}
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                                            required={idx < 2}
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                type="button"
                                                className={styles.btnRemoveOption}
                                                onClick={() => handleRemovePollOption(idx)}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submittingPoll}
                            >
                                {submittingPoll ? "Creating..." : "Launch Poll"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}