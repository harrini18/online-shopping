
const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase");
require("dotenv").config();

const testRoutes = require("./routes/testRoutes");
const productRoutes = require("./routes/productRoutes");
// ==========================================
// INITIALIZE FIREBASE ADMIN
// ==========================================



// ==========================================
// INITIALIZE EXPRESS
// ==========================================

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:5500"
}));

app.use(express.json());

app.use("/api/test", testRoutes);
app.use("/api/products", productRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: "THE DRESSUP SOCIETY API is running!"
    });

});

// ==========================================
// FIRESTORE CONNECTION CHECK
// ==========================================

app.get("/api/health/firestore", async (req, res) => {

    try {

        await db.collection("_health").limit(1).get();

        res.status(200).json({
            success: true,
            message: "Firestore connection successful!"
        });

    } catch (error) {

        console.error("Firestore connection error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to connect to Firestore."
        });

    }

});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log("----------------------------------");
    console.log("THE DRESSUP SOCIETY BACKEND");
    console.log(`Server running on port ${PORT}`);
    console.log("----------------------------------");

});
