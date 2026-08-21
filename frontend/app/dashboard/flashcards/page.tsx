"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface Flashcard {
    id: string;
    deck_id: string;
    question: string;
    answer: string;
}

interface FlashcardDeck {
    id: string;
    subject: string;
    description: string;
    created_by: string;
    created_at: string;
    profiles?: {
        full_name: string;
    };
    flashcards: {id: string}[];
}

export default function FlashcardsDashboard() {
    const [loading, setLoading] = useState(true);
    const [submittingDeck, setSubmittingDeck] = useState(false);
    const [submittingCard, setSubmittingCard] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [deckSubject, setDeckSubject] = useState("");
    const [deckDescription, setDeckDescription] = useState("");
    const [selectedDeckId, setSelectedDeckId] = useState("");
    const [cardQuestion, setCardQuestion] = useState("");
    const [cardAnswer, setCardAnswer] = useState("");
    const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
    const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [masteredCount, setMasteredCount] = useState(0);
    const [originalCount, setOriginalCount] = useState(0);

    const supabase = createClient();

    const fetchDecks = async (batchId: string) => {
        try {
            const {data, error} = await supabase
                .from("flashcard_decks")
                .select(`
                *,
                profiles (
                full_name
                ),
                flashcards (
                id
                )
                `)
                .eq("batch_id", batchId)
                .order("created_at", {ascending: false});

            if (error) throw error;
            if (data) {
                setDecks(data as unknown as FlashcardDeck[]);
            }
        } catch (err) {
            console.error("Failed to load decks:", err);
        }
    };

    useEffect(() => {
        async function loadProfileAndDecks() {
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
                    await fetchDecks(profileData.batch_id);
                }
            } catch (err) {
                console.error("Failed to load dashboard profile:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfileAndDecks();
    }, []);

    const handleStartReview = async (deck: FlashcardDeck) => {
        try {
            const {data: cards, error} = await supabase
                .from("flashcards")
                .select("*")
                .eq("deck_id", deck.id);

            if (error) throw error;

            if (!cards || cards.length === 0) {
                alert("This deck doesn't have any flashcards yet! Add some cards on the right.");
                return;
            }
            setActiveDeck(deck);
            setReviewQueue(cards as Flashcard[]);
            setOriginalCount(cards.length);
            setMasteredCount(0);
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch (err: any) {
            alert(`Failed to load review: ${err.message}`);
        }
    };

    const handleCreateDeck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deckSubject.trim() || !profile?.batch_id || !user) return;

        setSubmittingDeck(true);
        try {
            const {error} = await supabase
                .from("flashcard_decks")
                .insert({
                    batch_id: profile.batch_id,
                    subject: deckSubject.trim(),
                    description: deckDescription.trim(),
                    created_bt: user.id
                });

            if (error) throw error;

            setDeckSubject("");
            setDeckDescription("");

            alert("📁 New Study deck created!");
            await fetchDecks(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to create deck: ${err.message}`);
        } finally {
            setSubmittingDeck(false);
        }
    };

    const handleCreateCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeckId || !cardQuestion.trim() || !cardAnswer.trim()) return;

        setSubmittingCard(true);
        try {
            const {error} = await supabase
                .from("flashcards")
                .insert({
                    deck_id: selectedDeckId,
                    question: cardQuestion.trim(),
                    answer: cardAnswer.trim()
                });

            if (error) throw error;

            setCardQuestion("");
            setCardAnswer("");

            alert("⚡ Card added to deck!");
            await fetchDecks(profile.batch_id);
        } catch (err: any) {
            alert(`Failed to add card: ${err.message}`);
        } finally {
            setSubmittingCard(false);
        }
    };

    const handleMasteryFeedback = (difficulty: "easy" | "medium" | "hard") => {
        setIsFlipped(false);

        setTimeout(() => {
            const currentCard = reviewQueue[currentIndex];

            if (difficulty === "easy") {
                setReviewQueue(prev => prev.filter((_, idx) => idx !== currentIndex));
                setMasteredCount(prev => prev +1);

                if (currentIndex >= reviewQueue.length - 1) {
                    setCurrentIndex(0);
                }
            } else if (difficulty === "medium") {
                setReviewQueue(prev => {
                    const nextQueue = [...prev];
                    const [moved] = nextQueue.splice(currentIndex, 1);
                    nextQueue.push(moved);
                    return nextQueue;
                });

                if (currentIndex >= reviewQueue.length -1) {
                    setCurrentIndex(0);
                }
            } else {
                setReviewQueue(prev => {
                    const nextQueue = [...prev];
                    const [moved] = nextQueue.splice(currentIndex, 1);
                    nextQueue.push(moved);
                    return nextQueue;
                });

                if (currentIndex >= reviewQueue.length - 1) {
                    setCurrentIndex(0);
                }
            }
        }, 3000);
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Loading Flashcards...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Crowdsourced Flashcards</h1>
                <p className={styles.subtitle}>
                    Build shared study sets with your cohort and review them with spaced repetition logs.
                </p>
            </div>
            <div className={styles.grid}>
                {/* Main panel */}
                <div>
                    {activeDeck ? (
                        <div className={styles.playerCard}>
                            <div className={styles.playerHeader}>
                                <span>📖 Deck: {activeDeck.subject}</span>
                                <span>
                                    Progress: {masteredCount} / {originalCount} Mastered (
                                    {reviewQueue.length} remaining)
                                </span>
                            </div>
                            {reviewQueue.length === 0 ? (
                                <div style={{textAlign: "center", padding: "3rem"}}>
                                    <h3 style={{fontSize: "1.5rem", marginBottom: "0.5rem"}}>🎉 Mastery Achieved!</h3>
                                    <p style={{opacity: 0.6, fontSize: "0.9rem", marginBottom: "1.5rem"}}>
                                        You have successfully reviewed all flashcards in this set.
                                    </p>
                                    <button
                                    type="button"
                                    className={styles.btnPrim}
                                    onClick={() => setActiveDeck(null)}
                                    >
                                        Back to Decks
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Flippable flashcard wrapper */}
                                    <div
                                    className={styles.flipContainer}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    >
                                        <div
                                        className={`${styles.flipper} ${isFlipped ? styles.flipped : ""}`}
                                        >
                                            <div className={styles.front}>
                                                {reviewQueue[currentIndex]?.question}
                                            </div>
                                            <div className={styles.back}>
                                                {reviewQueue[currentIndex]?.answer}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.playerControls}>
                                        <span className={styles.btnText}>
                                            {isFlipped ? "How well did you know this answer?"
                                            : "💡 Click the card to reveal the answer"}
                                        </span>
                                        {isFlipped && (
                                            <div className={styles.masteryButtons}>
                                                <button
                                                type="button"
                                                className={styles.btnHard}
                                                onClick={() => handleMasteryFeedback("hard")}
                                                >
                                                    hard (Review Soon)
                                                </button>
                                                <button
                                                type="button"
                                                className={styles.btnMedium}
                                                onClick={() => handleMasteryFeedback("medium")}
                                                >
                                                    Medium (Loop Later)
                                                </button>
                                                <button
                                                type="button"
                                                className={styles.btnEasy}
                                                onClick={() => handleMasteryFeedback("easy")}
                                                >
                                                    Easy (Mastered)
                                                </button>
                                            </div>
                                        )}
                                        <button
                                        type="button"
                                        className={styles.btnSec}
                                        onClick={() => setActiveDeck(null)}
                                        style={{marginTop: "0.5rem"}}
                                        >
                                            Exit Session
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                        <h2 className={styles.sectionTitle}>📁 Cohort Flashcard Decks</h2>
                            {decks.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No flashcard decks shared yet. Create the deck on the right!
                                </div>
                            ) : (
                                <div className={styles.deckGrid}>
                                    {decks.map((deck) => (
                                        <div
                                        key={deck.id}
                                        className={styles.deckCard}
                                        onClick={() => handleStartReview(deck)}
                                        >
                                            <div className={styles.deckInfo}>
                                                <h3 className={styles.deckSubject}>{deck.subject}</h3>
                                                {deck.description && (
                                                    <p className={styles.deckDesc}>{deck.description}</p>
                                                )}
                                            </div>
                                            <div className={styles.deckMeta}>
                                                <span>⚡ {deck.flashcards.length} Cards</span>
                                                <span>Start Review</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
                {/* Sidebar area: creator panels */}
                <div className={styles.sidebar}>
                    {/* Create deck form */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>Create Deck</h2>
                        <form onSubmit={handleCreateDeck} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Deck Subject / Title</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Physics Formuals"
                                value={deckSubject}
                                onChange={(e) => setDeckSubject(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Deck Description</label>
                                <textarea
                                className={styles.textarea}
                                placeholder="What topic does this deck cover..."
                                value={deckDescription}
                                onChange={(e) => setDeckDescription(e.target.value)}
                                />
                            </div>
                            <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submittingDeck}
                            >
                                {submittingDeck ? "Creating..." : "Create Deck"}
                            </button>
                        </form>
                    </div>
                    {/* Create card form */}
                    <div className={styles.sidebarCard}>
                        <h2 className={styles.cardTitle}>Add Card to Deck</h2>
                        <form onSubmit={handleCreateCard} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Select Study Deck</label>
                                <select
                                className={styles.select}
                                value={selectedDeckId}
                                onChange={(e) => setSelectedDeckId(e.target.value)}
                                required
                                >
                                    <option value="">Choose a deck...</option>
                                    {decks.map((d) => (
                                        <option key={d.id} value={d.id}>{d.subject}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Question (Front)</label>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. What is Schrödinger's Equation?"
                                value={cardQuestion}
                                onChange={(e) => setCardQuestion(e.target.value)}
                                required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Answer (Back)</label>
                                <textarea
                                className={styles.textarea}
                                placeholder="Write the correct study answer details here..."
                                value={cardAnswer}
                                onChange={(e) => setCardAnswer(e.target.value)}
                                required
                                />
                            </div>
                            <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submittingCard}
                            >
                                {submittingCard ? "Adding..." : "Add Flashcard"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}