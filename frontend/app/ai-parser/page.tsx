"use client";

import {useState, useRef, useEffect} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/utils/supabase/client";
import styles from "./page.module.css";

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

    useEffect(() => {
        async function loadUserBatch() {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            const {data: profile} = await supabase
                .from("profiles")
                .select("batch_id")
                .eq("id", user.id)
                .single();

            if (profile?.batch_id) {
                setBatchId(profile.batch_id);
            } else {
                router.push("/onboarding");
            }
        }
        loadUserBatch();
    }, [supabase, router]);

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
        if (bytes === 0) return "0 Bytes";
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
        setProgress(10);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${batchId}/${fileName}`;
            setProgress(30);

            const {data: storageData, error: storageError} = await supabase.storage
                .from("timetables")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                });
            if (storageError) throw storageError;
            setProgress(60);

            const {data: {publicUrl}} = supabase.storage
                .from("timetables")
                .getPublicUrl(filePath);
            setProgress(100);
            alert(`Upload Success! Public File Path: ${publicUrl}`);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to upload file.");
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

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
                    className="hidden"
                    accept=".pdf, .png, .jpg, .jpeg"
                    onChange={handleFileChange}
                    style={{display: "none"}}
                    />
                    {/* Drag & drop zone */}
                    <div
                    className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
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
                            Supports PDF, PNG, JPG, or JPEG up to 10MB
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
                                <span className={styles.spinner}></span> Uploading File...
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