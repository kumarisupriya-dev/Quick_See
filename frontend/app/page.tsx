import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
      <div className="flex-1 flex flex-col justify-between">
        <section className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgePulse}></span>
            Introducing the Academic Co-Pilot
          </div>
          <h1 className={styles.title}>
            Academic schedules, <br />
            <span className={styles.titleAccent}>Completely Automated</span>
          </h1>
          <p className={styles.title}>
            Say goodbye to manual schedule entries. Upload a syllabus and get instant schedules.
            Coordinate class cancellations and checklist items live with your batch.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/onboarding" className={styles.btnPrimary}>
              Get Stated
            </Link>
            <Link href="/dashboard" className={styles.btnSecondary}>
              View Demo Dashboard
            </Link>
          </div>
        </section>
        <section className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <h3 className={styles.featureTitle}>AI Syllabus</h3>
            <p className={styles.featureDesc}>
              Upload PDF course timetables or syllabi. Our AI extracts rooms, times, exam schedules, and details in seconds.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎒</div>
            <h3 className={styles.featureTitle}>Pack Your Bag Alert</h3>
            <p className={styles.featureDesc}>
              Get a tailored nightly checklist telling you exactly what lab coats, manuals, or homework copies to pack for tomorrow.
            </p>
          </div>
        </section>
      </div>
  );
}