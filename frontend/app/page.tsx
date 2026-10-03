import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
      <div className="flex-1 flex flex-col justify-between">
        <section className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}/>
              <span>Synchronous Academic</span>
          </div>
          <h1 className={styles.title}>Academic Schedules, <br/>
          <span className={styles.titleAccent}>built without manual entry.</span></h1>
          <p className={styles.subtitle}>
            Upload your raw timetable or syllabus. Quick See automatically builds your calendar, syncs live class cancellations with classmates, and sends nightly preparation alerts.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/onboarding" className={styles.btnPrimary}>
              Get Started
            </Link>
            <Link href="/dashboard" className={styles.btnSecondary}>
              View Dashboard
            </Link>
          </div>
        </section>
        <section className={styles.bentoSection}>
          <div className={styles.bentoGrid}>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTag}>Parsing Engine</span>
                <h3 className={styles.cardTitle}>Instant Timetable extraction</h3>
                <p className={styles.cardDesc}>Drop any image or PDF syllabus. Extracts lecture times, room numbers, and course codes directly into structured tables.</p>
              </div>
            </div>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTag}>Cohort Sync</span>
                <h3 className={styles.cardTitle}>Real-Time Reschedules</h3>
                <p className={styles.cardDesc}>Class Representatives post cancellations or swaps. Every student in the batch receives real-time calendar updates instantly.</p>
              </div>
            </div>
            <div className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTag}>Alert Engine</span>
                <h3 className={styles.cardTitle}>Nightly Prep Alerts</h3>
                <p className={styles.cardDesc}>Automatic 9:00 PM notifications compiling tomorrow's timetable and tell you which lab coats, manuals, and homework copies to pack.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
  );
}