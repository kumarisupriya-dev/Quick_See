"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
    const pathname = usePathname();
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
                    <Link href="/login">
                        <button className={styles.btnPrimary}>Sign In</button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}