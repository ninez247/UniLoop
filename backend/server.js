import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import supabase from "./supabase.js";

dotenv.config();

const app = express();

app.use(cors());
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

        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        res.status(500).json({
            error: "Authentication verification failed",
        });
    }
}

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