
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { API_URL } from "./api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);
    const [activeSection, setActiveSection] = useState("overview");
    const [error, setError] = useState("");
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [reviewingId, setReviewingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewError, setReviewError] = useState("");
    const [stats, setStats] = useState({
        total_students: 0,
        verified_students: 0,
        pending_applications: 0,
        rejected_applications: 0
    });
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);

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

        async function fetchOverview() {
            try {
                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();

                if (error) throw error;
                if (!session) throw new Error("Please log in again.");

                const response = await fetch(
                    `${API_URL}/admin/overview`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch overview.");
                }

                setStats(data);

            } catch (error) {
                console.error("Overview fetch error:", error);
            }
        }

        fetchOverview();
    }, [admin]);

    useEffect(() => {
        if (admin?.role !== "super_admin") return;

        async function fetchActivities() {
            setActivityLoading(true);

            try {
                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();

                if (error) throw error;
                if (!session) throw new Error("Please log in again.");

                const response = await fetch(
                    `${API_URL}/admin/activity`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to fetch admin activity."
                    );
                }

                setActivities(data.activities);

            } catch (error) {
                console.error("Activity fetch error:", error);
            } finally {
                setActivityLoading(false);
            }
        }

        fetchActivities();
    }, [admin]);

    useEffect(() => {
        if (!["super_admin", "verification_admin"].includes(admin?.role)) return;

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
                    <button
                        type="button"
                        className={activeSection === "overview" ? "active" : ""}
                        onClick={() => setActiveSection("overview")}
                    >
                        Overview
                    </button>

                    {["super_admin", "verification_admin"].includes(admin?.role) && (
                        <button
                            type="button"
                            className={activeSection === "verification" ? "active" : ""}
                            onClick={() => setActiveSection("verification")}
                        >
                            Student Verification
                        </button>
                    )}

                    {admin?.role === "super_admin" && (
                        <button
                            type="button"
                            className={activeSection === "activity" ? "active" : ""}
                            onClick={() => setActiveSection("activity")}
                        >
                            Recent Activity
                        </button>
                    )}
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>
                            {activeSection === "overview"
                                ? "Dashboard"
                                : activeSection === "verification"
                                    ? "Student Verification"
                                    : "Recent Admin Activity"}
                        </h1>
                        <p>
                            {activeSection === "overview"
                                ? "Monitor platform activity and key statistics."
                                : activeSection === "verification"
                                    ? "Review and manage student verification requests."
                                    : "Track administrative actions and review history."}
                        </p>
                    </div>

                    <span>{admin.role.replace("_", " ")}</span>
                </header>

                {activeSection === "overview" && (
                    <>
                        <section className="admin-welcome">
                            <h2>
                                Welcome, {admin.role
                                    .replaceAll("_", " ")
                                    .replace(/\b\w/g, (char) => char.toUpperCase())}!
                            </h2>
                            <p>
                                Your administrative access is active.
                            </p>
                        </section>

                        <section className="admin-stats">
                            <div className="admin-stat-card">
                                <div className="admin-stat-top">
                                    <h3>Total Students</h3>
                                    <span className="admin-stat-icon total-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="21"
                                            height="21"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="10" cy="7" r="4" />
                                            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </span>
                                </div>
                                <p>{stats.total_students}</p>
                                <small>Registered on UniLoop</small>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-top">
                                    <h3>Verified Students</h3>
                                    <span className="admin-stat-icon verified-icon">✓</span>
                                </div>
                                <p>{stats.verified_students}</p>
                                <small>Successfully verified</small>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-top">
                                    <h3>Pending Applications</h3>
                                    <span className="admin-stat-icon pending-icon">◷</span>
                                </div>
                                <p>{stats.pending_applications}</p>
                                <small>Awaiting review</small>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-top">
                                    <h3>Rejected Applications</h3>
                                    <span className="admin-stat-icon rejected-icon">×</span>
                                </div>
                                <p>{stats.rejected_applications}</p>
                                <small>Not approved</small>
                            </div>
                        </section>
                    </>
                )}

                {activeSection === "activity" && (
                    <section className="admin-activity">
                        <div className="admin-section-heading">
                            <span>{activities.length} Activities</span>
                        </div>
                        {activityLoading ? (
                            <p>Loading activity...</p>
                        ) : activities.length === 0 ? (
                            <p>No admin activity recorded yet.</p>
                        ) : (
                            <div className="admin-activity-table-wrapper">
                                <table className="admin-activity-table">
                                    <thead>
                                        <tr>
                                            <th>Action</th>
                                            <th>Application</th>
                                            <th>Details</th>
                                            <th>Administrator</th>
                                            <th>Date & Time</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {activities.map((activity) => (
                                            <tr key={activity.id}>
                                                <td>
                                                    <span className={
                                                        activity.action === "verification_approved"
                                                            ? "admin-activity-approved"
                                                            : "admin-activity-rejected"
                                                    }>
                                                        {activity.action === "verification_approved"
                                                            ? "Approved"
                                                            : activity.action === "verification_rejected"
                                                                ? "Rejected"
                                                                : activity.action}
                                                    </span>
                                                </td>

                                                <td>#{activity.target_id}</td>

                                                <td>
                                                    {activity.details?.rejection_reason ||
                                                        "Verification approved"}
                                                </td>

                                                <td>
                                                    <span className="admin-role-label">
                                                        {activity.admin_role
                                                            .replaceAll("_", " ")
                                                            .replace(/\b\w/g, (char) => char.toUpperCase())}
                                                    </span>
                                                </td>

                                                <td>
                                                    {new Date(activity.created_at).toLocaleString("en-IN")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {activeSection === "verification" && (
                    <section className="admin-applications">
                        <div className="admin-section-heading">
                            <span>{applications.length} Pending</span>
                        </div>

                        {applicationsLoading ? (
                            <p>Loading applications...</p>
                        ) : applications.length === 0 ? (
                            <p>No pending verification applications.</p>
                        ) : (
                            <div className="admin-applications-list">
                                {applications.map((application) => (
                                    <div className="admin-application-card" key={application.id}>
                                        <div className="admin-application-details">
                                            <div>
                                                <h3>{application.full_name}</h3>
                                                <p>{application.college_name}</p>
                                                <small>
                                                    Submitted:{" "}
                                                    {new Date(application.submitted_at).toLocaleString("en-IN")}
                                                </small>
                                            </div>

                                            <div className="admin-application-actions">
                                                <span className="admin-pending-badge">Pending</span>

                                                <button
                                                    type="button"
                                                    className="admin-view-document"
                                                    onClick={() => handleViewDocument(application.id)}
                                                >
                                                    View ID Card
                                                </button>
                                            </div>
                                        </div>

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
                )}

            </main>
        </div>
    );
}
