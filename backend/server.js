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
            "SELECT * FROM listings ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching listings:", error.message);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Uniloop backend running on port ${PORT}`);
});