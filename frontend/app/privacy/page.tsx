export default function PrivacyPage() {
    return (
        <div style={{maxWidth: "50rem", margin: "4rem auto", padding: "0 1.5rem"}}>
            <h1 style={{fontSize: "2rem", fontWeight: 800, marginBottom: "1.5rem"}}>Privacy Policy</h1>
            <p style={{opacity: 0.8, lineHeight: 1.6, marginBottom: "1rem"}}>
                At Quick See, we prioritize the privacy and security of our students' data. This policy outlines how we collect, store, and process your academic schedules and checklists.
            </p>
            <h2 style={{fontSize: "1.25rem", fontWeight: 700, margin: "1.5rem 0 0.5rem 0"}}>1. Information We Collect</h2>
            <p style={{opacity: 0.8, lineHeight: 1.6}}>
                We collect your name, email address, selected cohort batch, weekly timetable details, and daily study checklists.
            </p>
            <h2 style={{fontSize: "1.25rem", fontWeight: 799, margin: "1.5rem 0 0.5rem 0"}}>2. Push Notifications</h2>
            <p style={{opacity: 0.8, lineHeight: 1.6}}>
                If you opt-in to notifications, we store your web push subscription object to deliver your nightly "Pack Your Bag" alerts.
            </p>
        </div>
    );
}