"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import styles from "./page.module.css";

interface University {id: string; name: string}
interface Campus {id: string; name: string}
interface Department {id: string; name: string}
interface Batch {id: string; graduation_year: number; section_name: string}

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [universities, setUniversities] = useState<University[]>([]);
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedUniv, setSelectedUniv] = useState("");
    const [selectedCampus, setSelectedCampus] = useState("");
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [customUniv, setCustomUniv] = useState("");
    const [customCampus, setCustomCampus] = useState("");
    const [customDept, setCustomDept] = useState("");
    const [customGradYear, setCustomGradYear] = useState("");
    const [customSection, setCustomSection] = useState("");
    const [fullName, setFullName] = useState("");

    useEffect(() => {
        async function loadUniversities() {
            setLoading(true);
            const {data, error} = await supabase
                .from("universities")
                .select("id, name")
                .order("name", {ascending: true});

            if (error) setErrorMsg(error.message);
            else if (data) setUniversities(data);
            setLoading(false);
        }
        loadUniversities();
    }, [supabase]);

    useEffect(() => {
        if (!selectedUniv || selectedUniv === "new") {
            setCampuses([]);
            setSelectedCampus("");
            return;
        }
        async function loadCampuses() {
            const {data,error} = await supabase
                .from("campuses")
                .select("id, name")
                .eq("university_id", selectedUniv)
                .order("name", {ascending: true});

            if (error) setErrorMsg(error.message);
            else if (data) setCampuses(data);
        }
        loadCampuses();
    }, [selectedUniv, supabase]);

    useEffect(() => {
        if (!selectedCampus || selectedCampus === "new") {
            setDepartments([]);
            setSelectedDept("");
            return;
        }
        async function loadDepartments() {
            const {data,error} = await supabase
                .from("departments")
                .select("id, name")
                .eq("campus_id", selectedCampus)
                .order("name", {ascending: true});

            if (error) setErrorMsg(error.message);
            else if (data) setDepartments(data);
        }
        loadDepartments();
    }, [selectedCampus, supabase]);

    useEffect(() => {
        if (!selectedDept || selectedDept === "new") {
            setBatches([]);
            setSelectedBatch("");
            return;
        }
        async function loadBatches() {
            const {data,error} = await supabase
                .from("batches")
                .select("id, graduation_year, section_name")
                .eq("department_id", selectedDept)
                .order("graduation_year", {ascending: true});

            if (error) setErrorMsg(error.message);
            else if (data) setBatches(data);
        }
        loadBatches();
    }, [selectedDept, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg("");

        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in to complete onboarding.");

            let univId = selectedUniv;
            let campusId = selectedCampus;
            let deptId = selectedDept;
            let batchId = selectedBatch;

            if (univId === "new") {
                const {data, error} = await supabase
                    .from("universities")
                    .insert({name: customUniv.trim()})
                    .select("id")
                    .single();
                if (error) throw error;
                univId = data.id;
            }

            if (campusId === "new" || selectedUniv === "new") {
                const {data, error} = await supabase
                    .from("campuses")
                    .insert({university_id: univId, name: customCampus.trim()})
                    .select("id")
                    .single();
                if (error) throw error;
                campusId = data.id;
            }

            if (deptId === "new" || selectedCampus === "new" || selectedUniv === "new") {
                const {data,error} = await supabase
                    .from("departments")
                    .insert({campus_id: campusId, name: customDept.trim()})
                    .select("id")
                    .single();
                if (error) throw error;
                deptId = data.id;
            }

            if (batchId === "new" || selectedDept === "new" || selectedCampus === "new" || selectedUniv === "new") {
                const {data, error} = await supabase
                    .from("batches")
                    .insert({
                        department_id: deptId,
                        graduation_year: parseInt(customGradYear),
                        section_name: customSection.trim(),
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                batchId = data.id;
            }

            const {error: profileError} = await supabase
                .from("profiles")
                .update({
                    batch_id: batchId,
                    full_name: fullName.trim(),
                })
                .eq("id", user.id);

            if (profileError) throw profileError;
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Academic Profile Setup</h2>
                    <p className={styles.subtitle}>
                        Join your university and sync schedules with your peers
                    </p>
                </div>

                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Your Name</label>
                        <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Alex Mercer"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>University</label>
                        <select
                        className={styles.select}
                        value={selectedUniv}
                        onChange={(e) => setSelectedUniv(e.target.value)}
                        required
                        disabled={loading}
                        >
                            <option value="">Select University</option>
                            {universities.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                            <option value="new">+ Add New University...</option>
                        </select>

                        {selectedUniv === "new" && (
                            <div className={styles.customInputGround}>
                                <input
                                type="text"
                                className={styles.input}
                                placeholder="Enter University Name"
                                value={customUniv}
                                onChange={(e) => setCustomUniv(e.target.value)}
                                required
                                />
                            </div>
                        )}
                    </div>

                    {selectedUniv && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Campus</label>
                            <select
                            className={styles.select}
                            value={selectedCampus}
                            onChange={(e) => setSelectedCampus(e.target.value)}
                            required
                            >
                                <option value="">Select Campus</option>
                                {campuses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                                <option value="new">+ Add New Campus...</option>
                            </select>

                            {(selectedCampus === "new" || selectedUniv === "new") && (
                                <div className={styles.customInputGround}>
                                    <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter Campus Name"
                                    value={customCampus}
                                    onChange={(e) => setCustomCampus(e.target.value)}
                                    required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCampus && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Department</label>
                            <select
                            className={styles.select}
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            required
                            >
                                <option value="">Select Department</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                                <option value="new">+ Add New Department...</option>
                            </select>

                            {(selectedDept === "new" || selectedCampus === "new" || selectedUniv === "new") && (
                                <div className={styles.customInputGroup}>
                                    <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter Department Name"
                                    value={customDept}
                                    onChange={(e) => setCustomDept(e.target.value)}
                                    required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedDept && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Class / Batch</label>
                            <select
                            className={styles.select}
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            required
                            >
                                <option value="">Select Batch</option>
                                {batches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.graduation_year} - {b.section_name}</option>
                                ))}
                                <option value="new">+ Add New Batch...</option>
                            </select>

                            {(selectedBatch === "new" || selectedDept === "new" || selectedCampus === "new" || selectedUniv === "new") && (
                                <div className={styles.customInputGroup}>
                                    <input
                                    type="number"
                                    className={styles.input}
                                    placeholder="Graduation Year (e.g. 2028)"
                                    value={customGradYear}
                                    onChange={(e) => setCustomGradYear(e.target.value)}
                                    required
                                    />
                                    <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Section / GroupName (e.g. Section B)"
                                    value={customSection}
                                    onChange={(e) => setCustomSection(e.target.value)}
                                    required
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                        {submitting && <span className={styles.spinner}></span>}
                        Finish Setup
                    </button>
                </form>
            </div>
        </div>
    );
}