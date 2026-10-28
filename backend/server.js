import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Uniloop backend is running");
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

app.post("/api/listings", async (req, res) => {
    const {
        title,
        description,
        price,
        category,
        condition,
        image_url,
        seller_name,
        college,
    } = req.body;

    if (
        !title?.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !category?.trim() ||
        !condition?.trim() ||
        !seller_name?.trim() ||
        !college?.trim()
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
        const result = await pool.query(
            `INSERT INTO listings
        (title, description, price, category, condition,
         image_url, seller_name, college)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [
                title.trim(),
                description?.trim() || null,
                parsedPrice,
                category.trim(),
                condition.trim(),
                image_url?.trim() || null,
                seller_name.trim(),
                college.trim(),
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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Uniloop backend running on port ${PORT}`);
});