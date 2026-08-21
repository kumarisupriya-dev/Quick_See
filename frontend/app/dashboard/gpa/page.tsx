"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

interface GpaRecord {
    id?: string;
    course_name: string;
    semester: number;
    credits: number;
    grade: string;
    grade_point: number;
}

const GRADE_POINTS: Record<string, number> = {
    "A+": 4.00,
    "A": 4.00,
    "A-": 3.70,
    "B+": 3.30,
    "B": 3.00,
    "B-": 2.70,
    "C+": 2.30,
    "C": 2.00,
    "D": 1.00,
    "F": 0.00
};

export default function GpaCalculator() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const[profile, setProfile] = useState<any>(null);
    const [courses, setCourses] = useState<GpaRecord[]>([
        {course_name: "Chemistry 201", semester: 1, credits: 3, grade: "A", grade_point: 4.00},
        {course_name: "Calculus III", semester: 1, credits: 4, grade: "B+", grade_point: 3.30}
    ]);

    const [targetCgpa, setTargetCgpa] = useState<string>("3.70");
    const [completedSemesters, setCompletedSemesters] = useState<number>(1);
    const [remainingSemesters, setRemainingSemesters] = useState<number>(7);
    const [previousCgpa, setPreviousCgpa] = useState<string>("3.50");

    const supabase = createClient();

    useEffect(() => {
        async function loadGpaData() {
            try {
                setLoading(true);
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) return;

                const {data: profileData} = await supabase
                    .from("profiles")
                    .select("batch_id, full_name")
                    .eq("id", user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);

                    const {data: savedGrades} = await supabase
                        .from("gpa_records")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("created_at", {ascending: true});

                    if (savedGrades && savedGrades.length > 0) {
                        setCourses(savedGrades.map(g => ({
                            id: g.id,
                            course_name: g.course_name,
                            semester: g.semester,
                            credits: g.credits,
                            grade: g.grade,
                            grade_point: Number(g.grade_point)
                        })));
                    } else {
                        const {data: schedules} = await supabase
                            .from("schedules")
                            .select("subject_name")
                            .eq("batch_id", profileData.batch_id)

                        if (schedules && schedules.length > 0) {
                            const uniqueSubjects  = Array.from(
                                new Set(schedules.map(s => s.subject_name))
                            );
                            setCourses(uniqueSubjects.map(sub => ({
                                course_name: sub,
                                semester: 1,
                                credits: 3,
                                grade: "A",
                                grade_point: 4.00
                            })));
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load GPA calculator data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadGpaData();
    }, []);

    const handleAddCourse = () => {
        setCourses(prev => [
            ...prev,
            {course_name: "", semester: 1, credits: 3, grade: "A", grade_point: 4.00}
        ]);
    };

    const handleUpdateCourse = (index: number, key: keyof GpaRecord, value: any) => {
        setCourses(prev =>
        prev.map((c, idx) => {
            if (idx !== index) return c;

            const updated = {...c, [key]: value};
            if (key === "grade") {
                updated.grade_point = GRADE_POINTS[value] || 0.00;
            }
            return updated;
        })
        );
    };

    const handleDeleteCourse = async (index: number) => {
        const target = courses[index];
        if (target.id) {
            try {
                const {error} = await supabase
                    .from("gpa_records")
                    .delete()
                    .eq("id", target.id);
                if (error) throw error;
            } catch (err: any) {
                alert(`Failed to delete record from database: ${err.message}`);
                return;
            }
        }
        setCourses(prev => prev.filter((_,idx) => idx !== index));
    };

    const handleSaveGrades = async () => {
        setSaving(true);
        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from("gpa_records").delete().eq("user_id", user.id);

            const inserts = courses
                .filter(c => c.course_name.trim() !== "")
                .map(c => ({
                    user_id: user.id,
                    course_name: c.course_name.trim(),
                    semester: c.semester,
                    grade: c.grade,
                    grade_point: c.grade_point
                }));

            const {error} = await supabase
                .from("gpa_records")
                .insert(inserts);

            if (error) throw error;
            alert("💾 GPA grades saved and synced to database successfully!");

            const {data: savedGrades} = await supabase
                .from("gpa_records")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {ascending: true});

            if (savedGrades) {
                setCourses(savedGrades.map(g => ({
                    id: g.id,
                    course_name: g.course_name,
                    semester: g.semester,
                    credits: g.credits,
                    grade: g.grade,
                    grade_point: Number(g.grade_point)
                })));
            }
        } catch (err: any) {
            alert(`Failed to save grades: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const totalCredits = courses.reduce((acc, c) => acc + Number(c.credits), 0);

    const qualityPoints = courses.reduce((acc, c) => acc + (Number(c.credits) * c.grade_point), 0);

    const calculatedGpa = totalCredits > 0 ? (qualityPoints / totalCredits) : 0;

    const targetCgpaNum = Number(targetCgpa) || 0;
    const prevCgpaNum = Number(previousCgpa) || 0;

    const totalSemesters = completedSemesters + remainingSemesters;

    const requiredGpa = remainingSemesters > 0
    ? (targetCgpaNum * totalSemesters - prevCgpaNum * completedSemesters) / remainingSemesters
        : 0;

    if (loading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
                <span>Loading GPA details...</span>
            </div>
        );
    }
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>GPA Calculator & Goal Projecter</h1>
                    <p className={styles.subtitle}>
                        Track your current semester grades and plan your target cumulative scores.
                    </p>
                </div>
                {/* GPA stats overview cards */}
                <div className={styles.gpaStatsContainer}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Caculated SGPA</span>
                        <span className={styles.statVal}>{calculatedGpa.toFixed(2)}</span>
                        <span className={styles.statSub}>Semester Quality GPA</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Semester Credits</span>
                        <span className={styles.statVal}>{totalCredits}</span>
                        <span className={styles.statSub}>Registered course weight</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Quality Points</span>
                        <span className={styles.statVal}>{qualityPoints.toFixed(1)}</span>
                        <span className={styles.statSub}>Credits × Grade Points</span>
                    </div>
                </div>
                <div className={styles.grid}>
                    {/* Main panel: calculator input rows */}
                    <div className={styles.mainPanel}>
                        <div className={styles.calcCard}>
                            <div className={styles.semesterHeader}>
                                <h3 className={styles.semTitle}>Active Coursework grades</h3>
                                <button
                                type="button"
                                className={styles.btnSec}
                                onClick={handleAddCourse}
                                >
                                    + Add Course Row
                                </button>
                            </div>
                            {courses.length === 0 ? (
                                <div style={{textAlign: "center", padding: "2rem", opacity: 0.5}}>
                                    No courses added. Click "+ Add Course Row" to start.
                                </div>
                            ) : (
                                courses.map((course, idx) => (
                                    <div key={idx} className={styles.courseRow}>
                                        <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Course name (e.g. MATH 302)"
                                        value={course.course_name}
                                        onChange={(e) => handleUpdateCourse(idx, "course_name", e.target.value)}
                                        />
                                        <select
                                        className={styles.select}
                                        value={course.credits}
                                        onChange={(e) => handleUpdateCourse(idx, "credits", Number(e.target.value))}
                                        >
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
                                            <option value={4}>4</option>
                                            <option value={5}>5</option>
                                        </select>
                                        <select
                                        className={styles.select}
                                        value={course.grade}
                                        onChange={(e) => handleUpdateCourse(idx, "grade", e.target.value)}
                                        >
                                            {Object.keys(GRADE_POINTS).map((g) => (
                                                <option key={g} value={g}>
                                                    {g} ({GRADE_POINTS[g].toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                        type="button"
                                        className={styles.btnDeleteCourse}
                                        onClick={() => handleDeleteCourse(idx)}
                                        title="Delete Course Row"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                            <div className={styles.semActions}>
                                <span style={{fontSize: "0.8rem", opacity: 0.5}}>
                                    * Auto-populated from batch scheudles if first load is empty.
                                </span>
                                <button
                                type="button"
                                className={styles.btnPrim}
                                onClick={handleSaveGrades}
                                disabled={saving}
                                >
                                    {saving ? "Saving Grades..." : "Save & Sync Grades"}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Sidebar: CGPA total target projecter */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarCard}>
                            <h2 className={styles.cardTitle}>Cumulative CGPA Projecter</h2>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Target CGPA Goal</label>
                                <input
                                type="number"
                                step="0.05"
                                min="1.0"
                                max="4.0"
                                className={styles.input}
                                value={targetCgpa}
                                onChange={(e) => setTargetCgpa(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Current CGPA</label>
                                <input
                                type="number"
                                step="0.05"
                                min="1.0"
                                max="4.0"
                                className={styles.input}
                                value={previousCgpa}
                                onChange={(e) => setPreviousCgpa(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Completed Semesters</label>
                                <select
                                className={styles.select}
                                value={completedSemesters}
                                onChange={(e) => setCompletedSemesters(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                        <option key={num} value={num}>{num} Semester(s)</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Remaining Semesters</label>
                                <select
                                className={styles.select}
                                value={remainingSemesters}
                                onChange={(e) => setRemainingSemesters(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                        <option key={num} value={num}>{num} Semester(s)</option>
                                    ))}
                                </select>
                            </div>
                            {/* Projection result */}
                            <div className={styles.goalResult}>
                                <div className={styles.goalTitle}>Required Average GPA:</div>
                                <div className={styles.goalTarget}>
                                    {requiredGpa > 4.00 ? (
                                        <span style={{color: "#ef4444", fontSize: "1.1rem"}}>
                                            Impossible Goal ({(requiredGpa).toFixed(2)})
                                        </span>
                                    ) : (
                                        requiredGpa <= 0 ? (
                                            <span>Goal already met!</span>
                                        ) : (
                                            requiredGpa.toFixed(2)
                                        )
                                    )}
                                </div>
                                <p className={styles.goalDesc}>
                                    {requiredGpa > 4.00 ? "⚠️ You need average grades exceeding 4.00 to hit this target CGPA. Adjust your target lower." :
                                    `🎓 You must maintain an average SGPA of ${requiredGpa.toFixed(2)} in your remaining semesters to achieve your goal.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }