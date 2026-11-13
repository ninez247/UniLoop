import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import supabase, { adminSupabase } from "./supabase.js";
import multer from "multer";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { fileTypeFromBuffer } from "file-type";

dotenv.config();

const app = express();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf",
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and PDF files are allowed."));
        }
    },
});

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
}));

app.use(express.json());

async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Authentication required",
            });
        }

        const token = authHeader.split(" ")[1];

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                error: "Invalid or expired token",
            });
        }

        req.user = data.user;

        req.accessToken = token;

        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        res.status(500).json({
            error: "Authentication verification failed",
        });
    }
}

async function requireAdmin(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT role
             FROM admin_users
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: "Admin access denied."
            });
        }

        req.adminRole = result.rows[0].role;

        next();

    } catch (error) {
        console.error("Admin authorization error:", error.message);

        res.status(500).json({
            error: "Failed to verify admin permissions."
        });
    }
}

function requireAdminRole(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.adminRole)) {
            return res.status(403).json({
                error: "You do not have permission to perform this action."
            });
        }

        next();
    };
}

app.get(
    "/api/admin/me",
    authenticateUser,
    requireAdmin,
    (req, res) => {
        res.json({
            message: "Admin access granted.",
            user_id: req.user.id,
            role: req.adminRole
        });
    }
);

// Fetch overview statistics for the admin dashboard
app.get(
    "/api/admin/overview",
    authenticateUser,
    requireAdmin,
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM profiles)::int
                        AS total_students,

                    (COUNT(*) FILTER (
                        WHERE status = 'verified'
                    ))::int AS verified_students,

                    (COUNT(*) FILTER (
                        WHERE status = 'pending'
                    ))::int AS pending_applications,

                    (COUNT(*) FILTER (
                        WHERE status = 'rejected'
                    ))::int AS rejected_applications

                FROM student_verifications
            `);

            res.json(result.rows[0]);

        } catch (error) {
            console.error("Admin overview error:", error.message);

            res.status(500).json({
                error: "Failed to fetch dashboard statistics."
            });
        }
    }
);

// Fetch recent admin activity logs
app.get(
    "/api/admin/activity",
    authenticateUser,
    requireAdmin,
    requireAdminRole("super_admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
    logs.id,
    logs.admin_user_id,
    logs.action,
    logs.target_type,
    logs.target_id,
    logs.details,
    logs.created_at,
    COALESCE(admins.role, 'administrator') AS admin_role
FROM admin_activity_logs AS logs
LEFT JOIN admin_users AS admins
    ON logs.admin_user_id = admins.user_id
ORDER BY logs.created_at DESC
LIMIT 10`
            );

            res.json({
                activities: result.rows
            });

        } catch (error) {
            console.error("Admin activity fetch error:", error.message);

            res.status(500).json({
                error: "Failed to fetch admin activity."
            });
        }
    }
);

function getUserSupabaseClient(accessToken) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PUBLISHABLE_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

app.post("/api/conversations", authenticateUser, async (req, res) => {
    try {
        const { listing_id } = req.body;

        if (!Number.isInteger(Number(listing_id)) || Number(listing_id) <= 0) {
            return res.status(400).json({
                error: "A valid listing ID is required."
            });
        }

        const buyerId = req.user.id;

        const listingResult = await pool.query(
            `SELECT id, seller_supabase_user_id, status
             FROM listings
             WHERE id = $1`,
            [listing_id]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: "Listing not found."
            });
        }

        const listing = listingResult.rows[0];

        if (listing.seller_supabase_user_id === buyerId) {
            return res.status(403).json({
                error: "You cannot start a conversation with yourself."
            });
        }

        if (listing.status !== "available") {
            return res.status(400).json({
                error: "This listing is no longer available."
            });
        }

        const result = await pool.query(
            `INSERT INTO conversations
             (listing_id, buyer_supabase_user_id, seller_supabase_user_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (listing_id, buyer_supabase_user_id)
             DO NOTHING
             RETURNING *`,
            [listing.id, buyerId, listing.seller_supabase_user_id]
        );

        let conversation = result.rows[0];

        if (!conversation) {
            const existingResult = await pool.query(
                `SELECT *
                 FROM conversations
                 WHERE listing_id = $1
                 AND buyer_supabase_user_id = $2`,
                [listing.id, buyerId]
            );

            conversation = existingResult.rows[0];
        }

        res.status(200).json({
            message: "Conversation opened successfully.",
            conversation
        });

    } catch (error) {
        console.error("Error creating conversation:", error.message);

        res.status(500).json({
            error: "Failed to open conversation."
        });
    }
});


app.get("/api/conversations", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
        c.id AS conversation_id,
        c.listing_id,
        l.title AS listing_title,
        l.price AS listing_price,
        l.status AS listing_status,
        c.buyer_supabase_user_id,
        c.seller_supabase_user_id,
        CASE
          WHEN c.buyer_supabase_user_id = $1
          THEN c.seller_supabase_user_id
          ELSE c.buyer_supabase_user_id
        END AS other_user_id,
        p.full_name AS other_user_name,
        c.created_at,

(
    SELECT COUNT(*)::int
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.sender_supabase_user_id <> $1
    AND m.read_at IS NULL
) AS unread_count
      FROM conversations c
      JOIN listings l
        ON c.listing_id = l.id
      LEFT JOIN profiles p
        ON p.supabase_user_id = CASE
          WHEN c.buyer_supabase_user_id = $1
          THEN c.seller_supabase_user_id
          ELSE c.buyer_supabase_user_id
        END
      WHERE
        c.buyer_supabase_user_id = $1
        OR c.seller_supabase_user_id = $1
      ORDER BY c.created_at DESC`,
            [userId]
        );

        res.status(200).json({
            conversations: result.rows
        });

    } catch (error) {
        console.error("Error fetching conversations:", error.message);

        res.status(500).json({
            error: "Failed to fetch conversations."
        });
    }
});

// Get total unread messages for the logged-in user
app.get("/api/conversations/unread-count", authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT COUNT(*)::int AS unread_count
             FROM messages m
             JOIN conversations c
                ON m.conversation_id = c.id
             WHERE m.sender_supabase_user_id <> $1
             AND m.read_at IS NULL
             AND (
                c.buyer_supabase_user_id = $1
                OR c.seller_supabase_user_id = $1
             )`,
            [userId]
        );

        res.status(200).json({
            unreadCount: result.rows[0].unread_count
        });

    } catch (error) {
        console.error("Error fetching unread count:", error.message);

        res.status(500).json({
            error: "Failed to fetch unread message count."
        });
    }
});

// Mark incoming messages in a conversation as read
app.patch("/api/conversations/:id/read", authenticateUser, async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const userId = req.user.id;

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: "A valid conversation ID is required."
            });
        }

        // Verify that the logged-in user belongs to this conversation
        const conversationResult = await pool.query(
            `SELECT id
             FROM conversations
             WHERE id = $1
             AND (
                buyer_supabase_user_id = $2
                OR seller_supabase_user_id = $2
             )`,
            [conversationId, userId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: "Conversation not found or access denied."
            });
        }

        // Mark only messages sent by the other participant as read
        const result = await pool.query(
            `UPDATE messages
             SET read_at = NOW()
             WHERE conversation_id = $1
             AND sender_supabase_user_id <> $2
             AND read_at IS NULL
             RETURNING id`,
            [conversationId, userId]
        );

        res.status(200).json({
            message: "Messages marked as read.",
            updatedCount: result.rowCount
        });

    } catch (error) {
        console.error("Error marking messages as read:", error.message);

        res.status(500).json({
            error: "Failed to mark messages as read."
        });
    }
});


app.get("/api/conversations/:id/messages", authenticateUser, async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const userId = req.user.id;

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: "A valid conversation ID is required."
            });
        }

        // Check whether the logged-in user belongs to this conversation
        const conversationResult = await pool.query(
            `SELECT id
       FROM conversations
       WHERE id = $1
       AND (
         buyer_supabase_user_id = $2
         OR seller_supabase_user_id = $2
       )`,
            [conversationId, userId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: "Conversation not found or access denied."
            });
        }

        // Retrieve messages in chronological order
        const result = await pool.query(
            `SELECT
        m.id,
        m.conversation_id,
        m.sender_supabase_user_id,
        p.full_name AS sender_name,
        m.message_text,
        m.created_at
       FROM messages m
       LEFT JOIN profiles p
         ON m.sender_supabase_user_id = p.supabase_user_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
            [conversationId]
        );

        res.status(200).json({
            messages: result.rows
        });

    } catch (error) {
        console.error("Error fetching messages:", error.message);

        res.status(500).json({
            error: "Failed to fetch messages."
        });
    }
});


app.post("/api/conversations/:id/messages", authenticateUser, async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const userId = req.user.id;
        const { message_text } = req.body;

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: "A valid conversation ID is required."
            });
        }

        if (typeof message_text !== "string" || !message_text.trim()) {
            return res.status(400).json({
                error: "Message cannot be empty."
            });
        }

        // Verify that the user belongs to this conversation
        const conversationResult = await pool.query(
            `SELECT id
       FROM conversations
       WHERE id = $1
       AND (
         buyer_supabase_user_id = $2
         OR seller_supabase_user_id = $2
       )`,
            [conversationId, userId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: "Conversation not found or access denied."
            });
        }

        // Save the message
        const result = await pool.query(
            `INSERT INTO messages
       (conversation_id, sender_supabase_user_id, message_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [conversationId, userId, message_text.trim()]
        );

        res.status(201).json({
            message: "Message sent successfully.",
            sentMessage: result.rows[0]
        });

    } catch (error) {
        console.error("Error sending message:", error.message);

        res.status(500).json({
            error: "Failed to send message."
        });
    }
});

app.get("/", (req, res) => {
    res.send("Uniloop backend is running");
});

// Fetch and search colleges
app.get("/api/colleges", async (req, res) => {
    try {
        const search = req.query.search?.trim();

        let result;

        if (search) {
            result = await pool.query(
                `SELECT id, name, city, state
                 FROM colleges
                 WHERE name ILIKE $1 OR city ILIKE $1
                 ORDER BY name ASC`,
                [`%${search}%`]
            );
        } else {
            result = await pool.query(
                `SELECT id, name, city, state
                 FROM colleges
                 ORDER BY name ASC`
            );
        }

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching colleges:", error.message);

        res.status(500).json({
            error: "Failed to fetch colleges"
        });
    }
});

app.get("/api/listings", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM listings WHERE status = 'available' ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching listings:", error.message);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

const allowedCategories = [
    "Books & Study Materials",
    "Stationery & Supplies",
    "Electronics & Gadgets",
    "Fashion & Clothing",
    "Shoes & Footwear",
    "Bags & Backpacks",
    "Hostel & Room Essentials",
    "Furniture",
    "Sports & Fitness",
    "Project & Creative Supplies",
    "Cycles & Mobility",
    "Placement & Professional Wear",
    "Gaming Accessories",
    "Musical Instruments",
    "Beauty & Personal Care",
    "Kitchen Essentials",
    "Art & Craft Supplies",
    "Calculators & Lab Equipment",
    "College Merchandise",
    "Tickets & Event Passes",
    "Free Stuff",
    "Miscellaneous",
];

const allowedConditions = ["Like New", "Good", "Fair"];

app.post("/api/listings", authenticateUser, async (req, res) => {
    const {
        title,
        description,
        price,
        category,
        condition,
    } = req.body;

    if (
        !title?.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !category?.trim() ||
        !condition?.trim()
    ) {
        return res.status(400).json({
            error: "Please provide all required listing details.",
        });
    }

    if (!allowedCategories.includes(category.trim())) {
        return res.status(400).json({
            error: "Please select a valid listing category.",
        });
    }

    if (!allowedConditions.includes(condition.trim())) {
        return res.status(400).json({
            error: "Please select a valid item condition.",
        });
    }

    const parsedPrice = Number(price);

    if (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        !/^\d+(\.\d{1,2})?$/.test(String(price).trim())
    ) {
        return res.status(400).json({
            error: "Price must be non-negative and have at most two decimal places.",
        });
    }

    try {
        const profileResult = await pool.query(
            `SELECT p.full_name, c.name AS college_name
             FROM profiles p
             JOIN colleges c ON p.college_id = c.id
             WHERE p.supabase_user_id = $1`,
            [req.user.id]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                error: "User profile not found. Please log in again.",
            });
        }

        const { full_name, college_name } = profileResult.rows[0];

        const result = await pool.query(
            `INSERT INTO listings
             (title, description, price, category, condition,
              seller_name, college, seller_supabase_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                title.trim(),
                description?.trim() || null,
                parsedPrice,
                category.trim(),
                condition.trim(),
                full_name,
                college_name,
                req.user.id,
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Error creating listing:", error.message);
        res.status(500).json({
            error: "Failed to create listing.",
        });
    }
});

app.post("/api/profiles", authenticateUser, async (req, res) => {
    try {
        const { full_name, college_id } = req.body;

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({
                error: "Full name is required",
            });
        }

        if (!Number.isInteger(Number(college_id))) {
            return res.status(400).json({
                error: "A valid college is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO profiles (supabase_user_id, full_name, college_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (supabase_user_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         college_id = EXCLUDED.college_id
       RETURNING *`,
            [req.user.id, full_name.trim(), Number(college_id)]
        );

        res.status(200).json({
            message: "Profile saved successfully",
            profile: result.rows[0],
        });
    } catch (error) {
        console.error("Error saving profile:", error.message);
        res.status(500).json({
            error: "Failed to save profile",
        });
    }
});

app.get(
    "/api/student-verification/status",
    authenticateUser,
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    status,
                    submitted_at,
                    reviewed_at,
                    rejected_at,
                    rejection_reason
                 FROM student_verifications
                 WHERE user_id = $1
                 ORDER BY submitted_at DESC
                 LIMIT 1`,
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.json({
                    status: "not_submitted",
                });
            }

            const verification = result.rows[0];

            let nextRetryAt = null;

            if (
                verification.status === "rejected" &&
                verification.rejected_at
            ) {
                nextRetryAt = new Date(
                    new Date(verification.rejected_at).getTime() +
                    24 * 60 * 60 * 1000
                ).toISOString();
            }

            res.json({
                ...verification,
                next_retry_at: nextRetryAt,
            });

        } catch (error) {
            console.error("Verification status error:", error.message);

            res.status(500).json({
                error: "Failed to fetch verification status.",
            });
        }
    }
);

// Fetch pending student verification applications for admins
app.get(
    "/api/admin/student-verifications",
    authenticateUser,
    requireAdmin,
    requireAdminRole("super_admin", "verification_admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    sv.id,
                    sv.user_id,
                    sv.status,
                    sv.submitted_at,
                    p.full_name,
                    c.name AS college_name
                 FROM student_verifications sv
                 JOIN profiles p
                    ON p.supabase_user_id = sv.user_id
                 JOIN colleges c
                    ON c.id = sv.college_id
                 WHERE sv.status = 'pending'
                 ORDER BY sv.submitted_at ASC`
            );

            res.json({
                applications: result.rows
            });

        } catch (error) {
            console.error(
                "Admin verification fetch error:",
                error.message
            );

            res.status(500).json({
                error: "Failed to fetch verification applications."
            });
        }
    }
);


app.get(
    "/api/admin/student-verifications/:id/document",
    authenticateUser,
    requireAdmin,
    requireAdminRole("super_admin", "verification_admin"),
    async (req, res) => {
        try {
            const verificationId = Number(req.params.id);

            if (!Number.isInteger(verificationId) || verificationId <= 0) {
                return res.status(400).json({
                    error: "Invalid verification ID."
                });
            }

            const result = await pool.query(
                `SELECT id_card_path
                 FROM student_verifications
                 WHERE id = $1
                 AND status = 'pending'`,
                [verificationId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Pending verification application not found."
                });
            }

            const filePath = result.rows[0].id_card_path;

            const { data, error } = await adminSupabase
                .storage
                .from("student-id-cards")
                .createSignedUrl(filePath, 60);

            if (error) throw error;

            res.json({
                signedUrl: data.signedUrl
            });

        } catch (error) {
            console.error("Admin document access error:", error.message);

            res.status(500).json({
                error: "Failed to generate secure document link."
            });
        }
    }
);

app.patch(
    "/api/admin/student-verifications/:id/review",
    authenticateUser,
    requireAdmin,
    requireAdminRole("super_admin", "verification_admin"),
    async (req, res) => {
        const verificationId = Number(req.params.id);
        const { decision, rejection_reason } = req.body;

        if (!Number.isInteger(verificationId) || verificationId <= 0) {
            return res.status(400).json({
                error: "Invalid verification ID."
            });
        }

        if (!["verified", "rejected"].includes(decision)) {
            return res.status(400).json({
                error: "Decision must be verified or rejected."
            });
        }

        if (
            decision === "rejected" &&
            (
                typeof rejection_reason !== "string" ||
                !rejection_reason.trim() ||
                rejection_reason.trim().length > 500
            )
        ) {
            return res.status(400).json({
                error: "A rejection reason of up to 500 characters is required."
            });
        }

        let client;

        try {
            client = await pool.connect();

            await client.query("BEGIN");

            const existing = await client.query(
                `SELECT id, status
                 FROM student_verifications
                 WHERE id = $1
                 FOR UPDATE`,
                [verificationId]
            );

            if (existing.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Verification application not found."
                });
            }

            if (existing.rows[0].status !== "pending") {
                await client.query("ROLLBACK");

                return res.status(409).json({
                    error: "This application has already been reviewed."
                });
            }

            const result = await client.query(
                `UPDATE student_verifications
     SET
        status = $1,
        reviewed_at = NOW(),
        reviewed_by = $2,
        rejected_at = CASE
            WHEN $5 = 'rejected' THEN NOW()
            ELSE NULL
        END,
        rejection_reason = CASE
            WHEN $5 = 'rejected' THEN $3
            ELSE NULL
        END
     WHERE id = $4
     RETURNING id, status, reviewed_at, rejection_reason`,
                [
                    decision,
                    req.user.id,
                    decision === "rejected" ? rejection_reason.trim() : null,
                    verificationId,
                    decision
                ]
            );

            await client.query(
                `INSERT INTO admin_activity_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        details
    )
    VALUES ($1, $2, $3, $4, $5)`,
                [
                    req.user.id,
                    decision === "verified"
                        ? "verification_approved"
                        : "verification_rejected",
                    "student_verification",
                    verificationId,
                    JSON.stringify(
                        decision === "rejected"
                            ? { rejection_reason: rejection_reason.trim() }
                            : {}
                    )
                ]
            );

            await client.query("COMMIT");

            res.json({
                message: `Application ${decision} successfully.`,
                application: result.rows[0]
            });

        } catch (error) {
            if (client) {
                await client.query("ROLLBACK").catch(() => { });
            }

            console.error("Verification review error:", error.message);

            res.status(500).json({
                error: "Failed to review verification application."
            });

        } finally {
            client?.release();
        }
    }
);

app.post(
    "/api/student-verification",
    authenticateUser,
    (req, res, next) => {
        upload.single("id_card")(req, res, (error) => {
            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }
            next();
        });
    },
    async (req, res) => {
        let uploadedPath = null;
        let supabaseClient;

        try {
            const { student_id_number } = req.body;

            if (!req.file) {
                return res.status(400).json({
                    error: "Please upload your college ID card.",
                });
            }

            const detectedFileType = await fileTypeFromBuffer(req.file.buffer);

            const allowedMimeTypes = [
                "image/jpeg",
                "image/png",
                "application/pdf",
            ];

            if (
                !detectedFileType ||
                !allowedMimeTypes.includes(detectedFileType.mime) ||
                detectedFileType.mime !== req.file.mimetype
            ) {
                return res.status(400).json({
                    error: "Invalid file. Please upload a genuine JPG, PNG or PDF.",
                });
            }

            if (
                typeof student_id_number !== "string" ||
                !student_id_number.trim() ||
                student_id_number.trim().length > 100
            ) {
                return res.status(400).json({
                    error: "Please enter a valid college ID number.",
                });
            }

            if (!process.env.STUDENT_ID_HASH_SECRET) {
                throw new Error("Student ID hash secret is missing.");
            }

            // Get the student's registered college.
            const profileResult = await pool.query(
                `SELECT college_id
                 FROM profiles
                 WHERE supabase_user_id = $1`,
                [req.user.id]
            );

            if (profileResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Please complete your profile first.",
                });
            }

            const collegeId = profileResult.rows[0].college_id;

            // Check previous verification status.
            const previousResult = await pool.query(
                `SELECT status, rejected_at
                 FROM student_verifications
                 WHERE user_id = $1
                 ORDER BY submitted_at DESC
                 LIMIT 1`,
                [req.user.id]
            );

            const previous = previousResult.rows[0];

            if (previous?.status === "pending") {
                return res.status(409).json({
                    error: "Your verification is already pending.",
                });
            }

            if (previous?.status === "verified") {
                return res.status(409).json({
                    error: "Your student account is already verified.",
                });
            }

            // Enforce the 24-hour retry period.
            if (previous?.status === "rejected" && previous.rejected_at) {
                const retryTime =
                    new Date(previous.rejected_at).getTime() +
                    24 * 60 * 60 * 1000;

                if (Date.now() < retryTime) {
                    return res.status(429).json({
                        error: "You can retry verification after 24 hours.",
                        next_retry_at: new Date(retryTime).toISOString(),
                    });
                }
            }

            // Hash the student ID using a secret HMAC key.
            const normalizedId = student_id_number.trim().toUpperCase();

            const studentIdHash = crypto
                .createHmac(
                    "sha256",
                    process.env.STUDENT_ID_HASH_SECRET
                )
                .update(normalizedId)
                .digest("hex");

            // Create a user-scoped Supabase client.
            supabaseClient = getUserSupabaseClient(req.accessToken);

            const extensionByMimeType = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "application/pdf": "pdf",
            };

            const extension = extensionByMimeType[req.file.mimetype];

            const fileName =
                `${req.user.id}/${crypto.randomUUID()}.${extension}`;

            // Upload ID card to the private bucket.
            const { error: uploadError } = await supabaseClient
                .storage
                .from("student-id-cards")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            uploadedPath = fileName;

            // Save verification application in PostgreSQL.
            const result = await pool.query(
                `INSERT INTO student_verifications
                 (user_id, college_id, student_id_number_hash, id_card_path)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, status, submitted_at`,
                [
                    req.user.id,
                    collegeId,
                    studentIdHash,
                    uploadedPath,
                ]
            );

            res.status(201).json({
                message: "Verification application submitted successfully.",
                verification: result.rows[0],
            });

        } catch (error) {
            console.error(
                "Student verification error:",
                error.message
            );

            // Remove the uploaded file if database insertion fails.
            if (uploadedPath && supabaseClient) {
                await supabaseClient
                    .storage
                    .from("student-id-cards")
                    .remove([uploadedPath])
                    .catch(() => { });
            }

            if (error.code === "23505") {
                return res.status(409).json({
                    error: "A verification request or student ID already exists.",
                });
            }

            res.status(500).json({
                error: "Failed to submit verification application.",
            });
        }
    }
);


app.get("/api/my-listings", authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM listings
             WHERE seller_supabase_user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching user listings:", error.message);
        res.status(500).json({
            error: "Failed to fetch your listings."
        });
    }
});

app.patch("/api/my-listings/:id/sold", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE listings
       SET status = 'sold'
       WHERE id = $1
       AND seller_supabase_user_id = $2
       AND status = 'available'
       RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Listing not found or already sold."
            });
        }

        res.json({
            message: "Listing marked as sold successfully.",
            listing: result.rows[0]
        });

    } catch (error) {
        console.error("Error marking listing as sold:", error.message);

        res.status(500).json({
            error: "Failed to mark listing as sold."
        });
    }
});


app.delete("/api/my-listings/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM listings
       WHERE id = $1
       AND seller_supabase_user_id = $2
       RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Listing not found or you are not authorized to delete it."
            });
        }

        res.json({
            message: "Listing deleted successfully.",
            listing: result.rows[0]
        });

    } catch (error) {
        console.error("Error deleting listing:", error.message);

        res.status(500).json({
            error: "Failed to delete listing."
        });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Uniloop backend running on port ${PORT}`);
});