"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {createClient} from "@/utils/supabase/client";
import {subscribeToNotifications, getNotificationPermissionState} from "@/utils/push";
import styles from "./Navbar.module.css";

export default function Navbar() {
    const pathname = usePathname();
    const [permission, setPermission] = useState<string>("default");
    const [submitting, setSubmitting] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [user, setUser] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const supabase = createClient();
    useEffect(() => {
        getNotificationPermissionState().then(setPermission);
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        } else {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            setTheme(systemTheme);
            document.documentElement.setAttribute("data-theme", systemTheme);
        }
        supabase.auth.getUser().then(({data: {user}}) => {
            setUser(user);
        });
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => {
            subscription.unsubscribe();
        }
    }, []);
    const toggleTheme = () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
    };
    const handleSubscribe = async () => {
        if (permission === "granted") {
            alert("Notifications are already enabled on this browser.");
            return;
        }
        setSubmitting(true);
        try {
            const success = await subscribeToNotifications();
            if (success) {
                setPermission("granted");
                alert("Push notifications enabled.");
            }
        } catch (err: any) {
            alert(`Failed to enable notifications: ${err.message || err}`);
        } finally {
            setSubmitting(false);
        }
    };
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setDrawerOpen(false);
        window.location.href = "/login";
    };
    const primaryLinks = [
        {name: "Dashboard", href: '/dashboard'},
        {name: "AI Parser", href: "/ai-parser"},
        {name: "Checklist", href: "/checklist"},
    ];
    const secondaryTools = [
        {name: "AI Academic Copilot", href: "/dashboard/copilot", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            )},
        {name: "Study Resources & Notes", href: "/dashboard/resources", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            )},
        {name: "Announcements & Polls", href: "/dashboard/announcements", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            )},
        {name: "GPA Calculator & Goals", href: "/dashboard/gpa", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            )},
        {name: "Focus Room & Pomodoro", href: "/dashboard/focus", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
            )},
        {name: "Flashcards Decks", href: "/dashboard/flashcards", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            )},
        {name: "LMS Coursework Sync", href: "/dashboard/lms", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            )},
        {name: "Schedule Reschedules", href: "/dashboard/reschedule", icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            )},
    ];
    return (
        <>
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logoContainer}>
                    <div className={styles.logoMark}>Q</div>
                    <span className={styles.logoText}>Quick See</span>
                </Link>
                <ul className={styles.navLinks}>
                    {primaryLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <li key={link.href}>
                                <Link href={link.href} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}>{link.name}</Link>
                            </li>
                        );
                    })}
                </ul>
                <div className={styles.actions}>
                    <button
                    type="button"
                    className={styles.iconButton}
                    onClick={toggleTheme}
                    title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
                    >
                        {theme === "light" ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>
                    <button
                    type="button"
                    className={`${styles.iconButton} ${permission === "granted" ? styles.iconButtonActive : ""}`}
                    onClick={handleSubscribe}
                    disabled={submitting}
                    title={permission === "granted" ? "Notifications enabled" : "Enable notifications"}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>
                    <button
                    type="button"
                    className={styles.menuTrigger}
                    onClick={() => setDrawerOpen(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                    <span className={styles.drawerTitle}>Academic Suite</span>
                    <button
                    type="button"
                    className={styles.drawerClose}
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
        <div className={styles.drawerContent}>
            <div className={styles.sectionGroup}>
                <div className={styles.sectionLabel}>Tools & Hub</div>
                {secondaryTools.map((tool) => {
                    const isActive = pathname === tool.href;
                    return (
                        <Link
                        key={tool.href}
                        href={tool.href}
                        className={`${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ""}`}
                        onClick={() => setDrawerOpen(false)}
                        >
                            <span className={styles.linkIcon}>{tool.icon}</span>
                            <span>{tool.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
        <div className={styles.drawerFooter}>
            {user ? (
                <>
                    <div className={styles.userInfo}>
                        <div className={styles.userDot}/>
                        <span>{user.email || "Active Student"}</span>
                    </div>
                    <button
                    type="button"
                    className={styles.btnSignOut}
                    onClick={handleSignOut}
                    >
                        Sign Out
                    </button>
                </>
            ) : (
                <Link
                href="/login"
                className={styles.btnSignIn}
                onClick={() => setDrawerOpen(false)}
                >
                    Sign In
                </Link>
            )}
        </div>
      </div>
    </div>
    )}
 </>
    );
}