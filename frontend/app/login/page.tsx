"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import styles from "./page.module.css";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            if (isRegister) {
                const {data, error} = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                if (data?.user && data.session === null) {
                    setSuccessMsg("Account created! Please check your email to verify your account.");
                } else {
                    router.push("/onboarding");
                    router.refresh();
                }
            } else {
                const {error} = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/onboarding");
                router.refresh();
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {isRegister ? "Join Quick See" : "welcome Back"}
                    </h2>
                    <p className={styles.subtitle}>
                        {isRegister
                        ? "Get synced with your batch schedules in seconds"
                        : "Access your crowdsourced schedules and checklists"}
                    </p>
                </div>
                <div className={styles.tabs}>
                    <button
                    type="button"
                    className={`${styles.tab} ${!isRegister ? styles.tabActive : ""}`}
                    onClick={() => {
                        setIsRegister(false);
                        setErrorMsg("");
                        setSuccessMsg("");
                    }}
                    >
                        Sign In
                    </button>
                    <button
                    type="button"
                    className={`${styles.tab} ${isRegister ? styles.tabActive : ""}`}
                    onClick={() => {
                        setIsRegister(true);
                        setErrorMsg("");
                        setSuccessMsg("");
                    }}
                    >
                        Register
                    </button>
                </div>

                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                {successMsg && <div className={styles.successAlert}>{successMsg}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className={styles.formGroup}>
                            <label htmlFor="fullName" className={styles.label}>
                                Full Name
                            </label>
                            <input
                            id="fullName"
                            type="text"
                            className={styles.input}
                            placeholder="Alex Mercer"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required={isRegister}
                            />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                        id="email"
                        type="email"
                        className={styles.input}
                        placeholder="alex@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                        id="password"
                        type="password"
                        className={styles.input}
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                    </div>
                    <button type="submit" className={styles.btnSubmit} disabled={loading}>
                        {loading && <span className={styles.spinner}></span>}
                        {isRegister ? "Create Account" : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
