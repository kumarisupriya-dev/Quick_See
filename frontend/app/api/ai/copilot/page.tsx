"use client";

import {useEffect, useRef, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface ChatMessage {
    role: "user" | "model";
    content: string;
}

export default function AiCopilotDashboard() {
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const SUGGESTIONS = [
        "What classes do I have tomorrow?",
        "What checklist prep items are pending?",
        "Show my target GPA projection.",
        "Recommend study material files shared by my cohort."
    ];

    useEffect(() => {
        async function loadUserSession() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    setMessages([
                        {
                            role: "model",
                            content: `👋 Hi! I am your **Quick See Academic Copilot**.\n\nI have loaded your cohort's class timetables, daily preparation checksheets, cancellation updates, shared study drivees, and your target GPA records.\n\nHow can I help you coordinate your studies today?`
                        }
                    ]);
                }
            } catch (err) {
                console.error("Failed to authenticate session:", err);
            } finally {
                setLoading(false);
            }
        }
        loadUserSession();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages, sending]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || !userId || sending) return;

        const userMsg: ChatMessage = {role: "user", content: messageText.trim()};
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch("/api/ai/copilot", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    message: messageText.trim(),
                    userId,
                    chatHistory: history
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to load response");
            }
            if (data.response) {
                setMessages(prev => [...prev, {role: "model", content: data.response}]);
            }
        } catch (err: any) {
            setMessages(prev => [
                ...prev,
                {role: "model", content: `❌ Error: ${err.message || "Failed to contact copilot."}`}
            ]);
        } finally {
            setSending(false);
        }
    };

    const formatMessageContent = (content: string) => {
        const lines = content.split("\n");
        return lines.map((line, idx) => {
            let formatted = line;
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                const textWithoutBullet = formatted.replace(/^[-*]\s+/, "");
                return (
                    <li
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: textWithoutBullet}}
                    style={{marginLeft: "1rem", marginBottom: "0.25rem"}}
                    />
                );
            }
            return (
                <p
                key={idx}
                dangerouslySetInnerHTML={{ __html: formatted}}
                style={{marginBottom: "0.5rem"}}
                />
            );
        });
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Syncing Copilot with cohort databases...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>AI Academic Copilot</h1>
                <p className={styles.subtitle}>
                    Ask questions about your schedules, cancellations, deadline, checklist prep tasks, and GPA goals.
                </p>
            </div>
            <div className={styles.chatWrapper}>
                {/* Scrollable chat feed */}
                <div className={styles.chatHistory}>
                    {messages.map((msg, index) => (
                        <div
                        key={index}
                        className={`${styles.messageRow} ${
                            msg.role === "user" ? styles.messagesRowUser : styles.messageRowModel
                        }`}
                        >
                            <span className={styles.messageSender}>
                                {msg.role === "user" ? "You" : "Copilot"}
                            </span>
                            <div
                            className={`${styles.messageBubble} ${
                                msg.role === "user" ? styles.bubbleUser : styles.bubbleModel
                            }`}
                            >
                                {formatMessageContent(msg.content)}
                            </div>
                        </div>
                    ))}
                    {/* Typing loader */}
                    {sending && (
                        <div className={`${styles.messageRow} ${styles.messageRowModel}`}>
                            <span className={styles.messageSender}>Copilot</span>
                            <div className={styles.typingIndicator}>
                                <div className={styles.dot}></div>
                                <div className={styles.dot}></div>
                                <div className={styles.dot}></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef}/>
                </div>
                {/* Suggestions pills */}
                <div className={styles.suggestions}>
                    {SUGGESTIONS.map((s, idx) => (
                        <button
                        key={idx}
                        type="button"
                        className={styles.suggestionBtn}
                        onClick={() => handleSend(s)}
                        disabled={sending}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                {/* Message input area */}
                <div className={styles.inputArea}>
                    <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(input);
                    }}
                    className={styles.form}
                    >
                        <input
                        type="text"
                        className={styles.input}
                        placeholder="Ask copilot about ypur checklist, schedules, resources, or grades..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={sending}
                        required
                        />
                        <button
                        type="submit"
                        className={styles.sendBtn}
                        disabled={sending || !input.trim()}
                        >
                            Send Prompt
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}