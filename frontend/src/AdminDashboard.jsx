
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { API_URL } from "./api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);
    const [error, setError] = useState("");
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [reviewingId, setReviewingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewError, setReviewError] = useState("");

    async function handleReview(applicationId, decision) {
        setReviewError("");

        let reason = null;

        if (decision === "rejected") {
            reason = rejectionReason.trim();

            if (!reason) {
                setReviewError("Please provide a rejection reason.");
                return;
            }
        }

        setReviewingId(applicationId);

        try {
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (error) throw error;
            if (!session) throw new Error("Please log in again.");

            const response = await fetch(
                `${API_URL}/admin/student-verifications/${applicationId}/review`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        decision,
                        rejection_reason: reason,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Review failed.");
            }

            setApplications((previous) =>
                previous.filter((item) => item.id !== applicationId)
            );

            setRejectionReason("");

        } catch (error) {
            setReviewError(error.message);
        } finally {
            setReviewingId(null);
        }
    }

    useEffect(() => {
        async function checkAdminAccess() {
            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (!session) {
                    setError("Please log in to continue.");
                    return;
                }

                const response = await fetch(
                    `${API_URL}/admin/me`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${session.access_token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Admin access denied."
                    );
                }

                setAdmin(data);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        checkAdminAccess();
    }, []);

    useEffect(() => {
        if (!admin) return;

        async function fetchApplications() {
            setApplicationsLoading(true);

            try {
                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();

                if (error) throw error;
                if (!session) throw new Error("Please log in again.");

                const response = await fetch(
                    `${API_URL}/admin/student-verifications`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to fetch applications."
                    );
                }

                setApplications(data.applications);

            } catch (error) {
                console.error("Application fetch error:", error);
            } finally {
                setApplicationsLoading(false);
            }
        }

        fetchApplications();
    }, [admin]);

    if (loading) {
        return <div className="admin-loading">
            Checking admin permissions...
        </div>;
    }

    if (error) {
        return <div className="admin-error">
            <h2>Access Denied</h2>
            <p>{error}</p>
        </div>;
    }

    async function handleViewDocument(applicationId) {
        setReviewError("");

        try {
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (error) throw error;
            if (!session) throw new Error("Please log in again.");

            const response = await fetch(
                `${API_URL}/admin/student-verifications/${applicationId}/document`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to open ID card.");
            }

            window.open(data.signedUrl, "_blank", "noopener,noreferrer");

        } catch (error) {
            setReviewError(error.message);
        }
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <h2>UniLoop Admin</h2>

                <nav>
                    <button>Overview</button>
                    <button>Student Verification</button>
                    <button>Listing Management</button>
                    <button>User Management</button>
                    <button>Reports</button>
                    <button>Payments</button>
                    <button>Settings</button>
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Welcome to UniLoop administration.</p>
                    </div>

                    <span>{admin.role.replace("_", " ")}</span>
                </header>

                <section className="admin-welcome">
                    <h2>Welcome, Super Admin!</h2>
                    <p>
                        Your administrative access is active.
                    </p>
                </section>

                <section className="admin-applications">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Student Verification</h2>
                            <p>Review pending student applications.</p>
                        </div>

                        <span>{applications.length} Pending</span>
                    </div>

                    {applicationsLoading ? (
                        <p>Loading applications...</p>
                    ) : applications.length === 0 ? (
                        <p>No pending verification applications.</p>
                    ) : (
                        <div className="admin-applications-list">
                            {applications.map((application) => (
                                <div
                                    className="admin-application-card"
                                    key={application.id}
                                >
                                    <div>
                                        <h3>{application.full_name}</h3>
                                        <p>{application.college_name}</p>
                                        <small>
                                            Submitted:{" "}
                                            {new Date(
                                                application.submitted_at
                                            ).toLocaleString()}
                                        </small>
                                    </div>

                                    <span className="admin-pending-badge">
                                        Pending
                                    </span>

                                    <button
                                        type="button"
                                        className="admin-view-document"
                                        onClick={() => handleViewDocument(application.id)}
                                    >
                                        View ID Card
                                    </button>

                                    <div className="admin-review-controls">
                                        <textarea
                                            placeholder="Reason for rejection (required only when rejecting)"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            maxLength={500}
                                            rows={2}
                                            disabled={reviewingId === application.id}
                                        />

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => handleReview(application.id, "verified")}
                                                disabled={reviewingId !== null}
                                            >
                                                {reviewingId === application.id
                                                    ? "Processing..."
                                                    : "Approve"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleReview(application.id, "rejected")}
                                                disabled={reviewingId !== null}
                                            >
                                                Reject
                                            </button>
                                        </div>

                                        {reviewError && (
                                            <p className="admin-review-error">{reviewError}</p>
                                        )}
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
