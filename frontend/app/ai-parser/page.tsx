"use client";

import {useState, useRef, useEffect} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import styles from "./page.module.css";

interface ParsedSchedule {
    subject_name: string;
    room_number: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
    instructor: string;
}

const WEEKDAYS = [
    {label: "Sunday", value: 0},
    {label: "Monday", value: 1},
    {label: "Tuesday", value: 2},
    {label: "Wednesday", value: 3},
    {label: "Thursday", value: 4},
    {label: "Friday", value: 5},
    {label: "Saturday", value: 6}
];

export default function AiParserPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [batchId, setBatchId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState("student");
    const [parsedClasses, setParsedClasses] = useState<ParsedSchedule[] | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        async function loadUserBatch() {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUserId(user.id);
            const {data: profile} = await supabase
                .from("profiles")
                .select("batch_id, role")
                .eq("id", user.id)
                .single();

            if (profile) {
                setUserRole(profile.role);
                if (profile.batch_id) {
                    setBatchId(profile.batch_id);
                } else {
                    router.push("/onboarding");
                }
            }
        }
        loadUserBatch();
    }, [supabase, router]);

    const handlePromoteToRep = async () => {
        if (!userId) return;
        try {
            const {error} = await supabase
                .from("profiles")
                .update({role: "class_rep"})
                .eq("id", userId);
            if (error) throw error;
            setUserRole("class_rep");
            setErrorMsg("");
            alert("👑 You are promoted to Class Representative! You can save schedules.");
        } catch (err: any) {
            setErrorMsg(`Failed to promote: ${err.message}`);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        setErrorMsg("");
        const validTypes = ["application/pdf", "image/jpeg", "image/png"];

        if (!validTypes.includes(selectedFile.type)) {
            setErrorMsg("Invalid file type: Please upload a PDF or an Image (JPEG/PNG).");
            setFile(null);
            return;
        }
        setFile(selectedFile);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleUploadAndParse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !batchId) return;

        setLoading(true);
        setErrorMsg("");
        setProgress(15);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${batchId}/${fileName}`;
            setProgress(30);

            const {error: storageError} = await supabase.storage
                .from("timetables")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                });
            if (storageError) throw storageError;
            setProgress(50);

            const {data: {publicUrl}} = supabase.storage
                .from("timetables")
                .getPublicUrl(filePath);
            setProgress(70);

            const parseResponse = await fetch("/api/parse-timetable", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({fileUrl: publicUrl}),
            });

            const parseData = await parseResponse.json();
            if (!parseResponse.ok) {
                throw new Error(parseData.error || "Gemini failed to extract timetable data.");
            }
            setProgress(100);
            setParsedClasses(parseData.schedules || []);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to upload or parse timetable.");
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (index: number, field: keyof ParsedSchedule, value: any) => {
        if (!parsedClasses) return;
        const updated = [...parsedClasses];
        updated[index] = {
            ...updated[index],
            [field]: field === "day_of_week" ? parseInt(value, 10) : value,
        };
        setParsedClasses(updated);
    };

    const handleAddRow = () => {
        if (!parsedClasses) return;
        const newClass: ParsedSchedule = {
            subject_name: "New Class",
            room_number: "Room 101",
            start_time: "09:00",
            end_time: "10:00",
            day_of_week: 1,
            instructor: "",
        };
        setParsedClasses([...parsedClasses, newClass]);
    };

    const handleDeleteRow = (index: number) => {
        if (!parsedClasses) return;
        const updated = parsedClasses.filter((_, idx) => idx !== index);
        setParsedClasses(updated);
    };

    const handleConfirmImport = async () => {
        if (!parsedClasses || !batchId) return;
        setIsImporting(true);
        setErrorMsg("");

        try {
            if (userRole === "student") {
                throw new Error("Permission Denied: Only Class Representatives can import schedules.");
            }
            const {error: rpcError} = await supabase.rpc("import_schedule", {
                p_batch_id: batchId,
                p_classes: parsedClasses,
            });
            if (rpcError) throw rpcError;
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to import schedule.");
        } finally {
            setIsImporting(false);
        }
    };

    if (parsedClasses !== null) {
        return (
            <div className={styles.container} style={{maxWidth: "64rem"}}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Confirm AI Extracted Timetable</h2>
                        <p className={styles.subtitle}>
                            Please review, correct, or add classes below before writing this schedule to your batch.
                        </p>
                    </div>
                    {userRole === "student" && (
                        <div className={styles.roleAlert}>
                            🔒 <strong>Class Rep Permissions Required:</strong> Your current role is<strong>Student</strong>.
                            Only Class Representatives can write standard schedules.
                            <br />
                            <button
                            onClick={handlePromoteToRep}
                            className={styles.btnPromote}
                            style={{marginTop: "0.5rem"}}
                            >
                                👑 Promote Me to Class Rep (Testing Mode)
                            </button>
                        </div>
                    )}
                    {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th className={styles.th}>Subject Name</th>
                                <th className={styles.th}>Day</th>
                                <th className={styles.th}>Start Time</th>
                                <th className={styles.th}>End Time</th>
                                <th className={styles.th}>Room</th>
                                <th className={styles.th}>Instructor</th>
                                <th className={styles.th}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {parsedClasses.map((cls, index) => (
                                <tr key={index}>
                                    <td className={styles.td}>
                                        <input
                                        type="text"
                                        className={styles.verifyInput}
                                        value={cls.subject_name}
                                        onChange={(e) => handleCellChange(index, "subject_name", e.target.value)}
                                        required
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <select
                                        className={styles.verifySelect}
                                        value={cls.day_of_week}
                                        onChange={(e) => handleCellChange(index, "day_of_week", e.target.value)}
                                        >
                                            {WEEKDAYS.map((d) => (
                                                <option key={d.value} value={d.value}>
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                        type="time"
                                        className={styles.verifyInput}
                                        value={cls.start_time.slice(0, 5)}
                                        onChange={(e) => handleCellChange(index, "start_time", e.target.value)}
                                        required
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                        type="time"
                                        className={styles.verifyInput}
                                        value={cls.end_time.slice(0, 5)}
                                        onChange={(e) => handleCellChange(index, "end_time", e.target.value)}
                                        required
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                        type="text"
                                        className={styles.verifyInput}
                                        value={cls.room_number}
                                        onChange={(e) => handleCellChange(index, "room_number", e.target.value)}
                                        required
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                        type="text"
                                        className={styles.verifyInput}
                                        value={cls.instructor || ""}
                                        onChange={(e) => handleCellChange(index, "instructor", e.target.value)}
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <button
                                        type="button"
                                        className={styles.btnDeleteRow}
                                        onClick={() => handleDeleteRow(index)}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.btnActionRow}>
                        <button type="button" className={styles.btnAddClass} onClick={handleAddRow}>
                            ➕ Add Class Row
                        </button>
                        <div style={{display: "flex", gap: "1rem"}}>
                            <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={() => setParsedClasses(null)}
                            style={{padding: "0.5rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)"}}
                            >
                                Re-upload File
                            </button>
                            <button
                            type="button"
                            className={styles.btnSubmit}
                            style={{margin: 0, padding: "0.5rem 1.5rem", borderRadius: "var(--radius-sm)"}}
                            onClick={handleConfirmImport}
                            disabled={isImporting || parsedClasses.length === 0 || (userRole === "student")}
                            >
                                {isImporting && <span className={styles.spinner}></span>}
                                Confirm & Import Schedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2 className={styles.title}>AI Timetable Parser</h2>
                    <p className={styles.subtitle}>
                        Upload a syllabus PDF or class timetable photo. Our AI will automatically construct your schedule.
                    </p>
                </div>
                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                <form onSubmit={handleUploadAndParse} className={styles.form}>
                    <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf, .png, .jpg, .jpeg"
                    onChange={handleFileChange}
                    style={{display: "none"}}
                    />
                    {/* Drag & drop zone */}
                    <div
                    className={`${styles.dropzone || styles.dropZone} ${dragActive ? styles.dropzoneActive : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    >
                        <div className={styles.uploadIcon}>📅</div>
                        <h3 className={styles.uploadTitle}>
                            {file ? "Change selected file" : "Drag and drop your file here"}
                        </h3>
                        <p className={styles.uploadDesc}>
                            Supports PDF, PNG, JPG, pr JPEG up to 10MB
                        </p>
                    </div>
                    {/* Selected file details */}
                    {file && (
                        <div className={styles.fileList}>
                            <div className={styles.fileRow}>
                                <div>
                                    <div className={styles.fileName}>{file.name}</div>
                                    <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
                                </div>
                                <button
                                type="button"
                                className={styles.btnRemove}
                                onClick={() => setFile(null)}
                                disabled={loading}
                                >
                                    Remove
                                </button>
                            </div>
                            {loading && (
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressBar} style={{width: `${progress}%`}}></div>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                    type="submit"
                    className={styles.btnSubmit}
                    disabled={!file || loading || !batchId}
                    >
                        {loading ? (
                            <span className={styles.loader}>
                                <span className={styles.spinner}></span> Uploading & Parsing...
                            </span>
                        ) : (
                            "Upload and Parse Timetable"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}