"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {subscribeToNotifications, getNotificationPermissionState} from "@/utils/push";
import styles from "./Navbar.module.css";

export default function Navbar() {
    const pathname = usePathname();
    const [permission, setPermission] = useState<string>("default");
    const [submitting, setSubmitting] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

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
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
    };

    const handleSubscribe = async () =>  {
        if (permission === "granted") {
            alert("🔔 Notifications are already enabled on this browser!");
            return;
        }

        setSubmitting(true);
        try {
            const success = await subscribeToNotifications();
            if (success) {
                setPermission("granted");
                alert("🔔 Success! Notifications enabled successfully.");
            }
        } catch (err: any) {
            alert(`Failed to enable notifications: ${err.message || err}`);
        } finally {
            setSubmitting(false);
        }
    };

    const links = [
        {name: "Dashboard", href: "/dashboard"},
        {name: "AI Parser", href: "/ai-parser"},
        {name: "Checklist", href: "/checklist"},
        {name: "LMS Sync", href: "/dashboard/lms"},
        {name: "Resources", href: "/dashboard/resources"},
        {name: "Notices", href: "/dashboard/announcements"},
        {name: "GPA Calc", href: "/dashboard/gpa"},
        {name: "AI Copilot", href: "/dashboard/copilot"},
        {name: "Focus Room", href: "/dashboard/focus"},
    ];

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logoContainer}>
                    <span className={styles.logoText}>Quick See</span>
                    <span className={styles.logoBadge}>Beta</span>
                </Link>
                <ul className={styles.navLinks}>
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <li key={link.href}>
                                <Link
                                href={link.href}
                                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className={styles.actions}>
                    {/* Theme Toggle Button */}
                    <button
                    type="button"
                    className={styles.btnBell}
                    onClick={toggleTheme}
                    title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                    style={{marginRight: "0.25rem"}}
                    >
                        {theme === "light" ? "🌙" : "☀️"}
                    </button>
                    {/* Dynamic Bell Subscribe Toggle */}
                    <button
                    type="button"
                    className={`${styles.btnBell} ${permission === "granted" ? styles.btnBellSubscribed : ""}`}
                    onClick={handleSubscribe}
                    disabled={submitting}
                    title={permission === "granted" ? "Notification Enabled" : "Subscribe to Notifications"}
                    >
                        {permission === "granted" ? "🔔" : "🔕"}
                    </button>
                    <Link href="/login">
                        <button className={styles.btnPrimary}>Sign In</button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}