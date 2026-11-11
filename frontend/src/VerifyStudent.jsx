
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { API_URL } from "./api";
import "./VerifyStudent.css";

export default function VerifyStudent() {
    const navigate = useNavigate();

    const [studentId, setStudentId] = useState("");
    const [idCard, setIdCard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        async function fetchVerificationStatus() {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) throw error;

                if (!session) {
                    navigate("/login", {
                        state: { action: "verify" },
                        replace: true,
                    });
                    return;
                }

                const response = await fetch(
                    `${API_URL}/student-verification/status`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Could not fetch verification status.");
                }

                setVerificationStatus(data);

            } catch (error) {
                setMessage(error.message);
            } finally {
                setCheckingStatus(false);
            }
        }

        fetchVerificationStatus();
    }, [navigate]);

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage("");

        if (!studentId.trim() || !idCard) {
            setMessage("Please enter your student ID and upload your college ID card.");
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf",
        ];

        if (!allowedTypes.includes(idCard.type)) {
            setMessage("Only JPG, PNG and PDF files are allowed.");
            return;
        }

        if (idCard.size > 5 * 1024 * 1024) {
            setMessage("File size must not exceed 5 MB.");
            return;
        }

        setLoading(true);

        try {
            const { data: { session }, error } =
                await supabase.auth.getSession();

            if (error) throw error;

            if (!session) {
                navigate("/login");
                return;
            }

            const formData = new FormData();
            formData.append("student_id_number", studentId.trim());
            formData.append("id_card", idCard);

            const response = await fetch(
                `${API_URL}/student-verification`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Verification submission failed.");
            }

            setSubmitted(true);
            setMessage("Your verification application has been submitted successfully.");

        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    if (checkingStatus) {
        return (
            <div className="verification-page">
                <div className="verification-card">
                    <p>Checking your verification status...</p>
                </div>
            </div>
        );
    }

    if (
        verificationStatus?.status === "pending" ||
        verificationStatus?.status === "verified"
    ) {
        const isVerified = verificationStatus.status === "verified";

        return (
            <div className="verification-page">
                <div className="verification-card">
                    <h2>
                        {isVerified ? "Student Verified!" : "Verification Pending"}
                    </h2>

                    <p>
                        {isVerified
                            ? "Your student account has been successfully verified."
                            : "Your application is awaiting admin review. You will be notified once it is reviewed."}
                    </p>

                    <button
                        className="button primary"
                        onClick={() => navigate("/")}
                    >
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    if (verificationStatus?.status === "rejected") {
        const retryTime = verificationStatus.next_retry_at
            ? new Date(verificationStatus.next_retry_at)
            : null;

        const canRetry = !retryTime || Date.now() >= retryTime.getTime();

        if (!canRetry) {
            return (
                <div className="verification-page">
                    <div className="verification-card">
                        <h2>Verification Rejected</h2>

                        <p>
                            Reason: {verificationStatus.rejection_reason || "No reason provided."}
                        </p>

                        <p>
                            You can submit another application after:
                            {" "}
                            {retryTime.toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true
                            })}
                        </p>

                        <button
                            className="button primary"
                            onClick={() => navigate("/")}
                        >
                            Back to Marketplace
                        </button>
                    </div>
                </div>
            );
        }
    }

    if (submitted) {
        return (
            <div className="verification-page">
                <div className="verification-card">
                    <h2>Application Submitted!</h2>
                    <p>{message}</p>
                    <p>Your student verification status is now pending review.</p>

                    <button
                        className="button primary"
                        onClick={() => navigate("/")}
                    >
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="verification-page">
            <div className="verification-card">
                <h2>Verify Your Student Account</h2>

                <p>
                    Upload your college ID card to verify your student identity
                    and unlock UniLoop's marketplace features.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="verification-field">
                        <label htmlFor="student-id">
                            College ID Number
                        </label>

                        <input
                            id="student-id"
                            type="text"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="Enter your college ID number"
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="verification-field">
                        <label htmlFor="id-card">
                            Upload College ID Card
                        </label>

                        <input
                            id="id-card"
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) =>
                                setIdCard(e.target.files?.[0] || null)
                            }
                            required
                        />

                        <small>JPG, PNG or PDF · Maximum 5 MB</small>
                    </div>

                    {message && (
                        <p className="verification-message" role="status">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="button primary"
                        disabled={loading}
                    >
                        {loading ? "Submitting..." : "Submit for Verification"}
                    </button>
                </form>

                <button
                    className="verification-back"
                    type="button"
                    onClick={() => navigate("/")}
                >
                    Back to Marketplace
                </button>
            </div>
        </div>
    );
}
