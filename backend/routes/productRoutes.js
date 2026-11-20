
const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// ADMIN: ADD MULTIPLE PRODUCTS
router.post("/bulk", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide a non-empty products array."
            });
        }

        if (products.length > 450) {
            return res.status(400).json({
                success: false,
                message: "Maximum 450 products per request."
            });
        }

        const batch = db.batch();
        const createdIds = [];

        for (const product of products) {
            const {
                documentId,
                id,
                name,
                description,
                price,
                category,
                fandom,
                image,
                featured,
                categoryId,
                character,
                franchise
            } = product;

            if (
                typeof documentId !== "string" ||
                !/^PROD\d{3,}$/.test(documentId) ||
                !Number.isInteger(id) ||
                typeof name !== "string" ||
                !name.trim() ||
                typeof description !== "string" ||
                !Number.isFinite(price) ||
                price <= 0 ||
                typeof category !== "string" ||
                typeof fandom !== "string" ||
                typeof image !== "string" ||
                typeof featured !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product data. Check the required fields.",
                    invalidDocumentId: documentId || null
                });
            }

            const productRef = db.collection("products").doc(documentId);

            const productData = {
                id,
                name: name.trim(),
                description,
                price,
                category,
                fandom,
                image,
                featured
            };

            if (categoryId) productData.categoryId = categoryId;
            if (character) productData.character = character;
            if (franchise) productData.franchise = franchise;

            batch.create(productRef, productData);
            createdIds.push(documentId);
        }

        await batch.commit();

        return res.status(201).json({
            success: true,
            message: "Products added successfully!",
            createdCount: createdIds.length,
            documentIds: createdIds
        });

    } catch (error) {
        console.error("Product upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add products. Check whether a document ID already exists."
        });
    }
});

module.exports = router;
