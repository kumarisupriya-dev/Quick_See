import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <p className={styles.copyright}>
                    © {new Date().getFullYear()} <span className={styles.brand}>Quick See</span>. Built for students, by peers.
                </p>
                <ul className={styles.links}>
                    <li>
                        <Link href="/privacy" className={styles.link}>
                            Privacy
                        </Link>
                    </li>
                    <li>
                        <Link href="/terms" className={styles.link}>
                            Terms
                        </Link>
                    </li>
                    <li>
                        <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                        >
                            GitHub
                        </a>
                    </li>
                </ul>
            </div>
        </footer>
    );
}