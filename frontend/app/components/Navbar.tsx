"use client";

import {useEffect, useState} from  "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { subscribeToNotifications, getNotificationPermissionState} from "@/utils/push";
import styles from "./Navbar.module.css"

export default function Navbar() {
    const pathname = usePathname();
    const [ permission, setPermission] = useState<string>("default");
    const [ submitting, setSubmitting] = useState(false);

    // Check current browser permission state on load
    useEffect(() => {
        getNotificationPermissionState().then(setPermission);
    }, []);

    const handleSubscribe = async () => {
        if (permission === "granted") {
            alert("Notifications are already enabled on this browser!");
            return;
        }
        setSubmitting(true);
        try {
            const success = await subscribeToNotifications();
            if (success) {
                setPermission("granted");
                alert("🔔 Success! Notifications enabled succssfully.");
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
                    {/* Dynamic bell subscribe toggle */}
                    <button
                    type="button"
                    className={`${styles.btnBell} ${permission === "granted" ? styles.btnBellSubscribed : ""}`}
                    onClick={handleSubscribe}
                    disabled={submitting}
                    title={permission === "granted" ? "Notifications Enabled" : "Subscribe to Notifications"}
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