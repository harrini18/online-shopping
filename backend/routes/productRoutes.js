
const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

const productsCollection = db.collection("products");

// ==========================================
// PRODUCT VALIDATION
// ==========================================

function validateProduct(product) {
    const {
        name,
        description,
        price,
        category,
        fandom,
        image,
        featured,
        stock
    } = product;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 150 ||
        typeof description !== "string" ||
        !description.trim() ||
        !Number.isFinite(price) ||
        price <= 0 ||
        typeof category !== "string" ||
        !category.trim() ||
        typeof fandom !== "string" ||
        !fandom.trim() ||
        typeof image !== "string" ||
        !image.trim() ||
        typeof featured !== "boolean" ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {
        return "Please provide valid product details and a non-negative whole-number stock quantity.";
    }

    try {
        const imageURL = new URL(image);

        if (!["http:", "https:"].includes(imageURL.protocol)) {
            return "Product image must use a valid HTTP or HTTPS URL.";
        }
    } catch {
        return "Please enter a valid product image URL.";
    }

    return null;
}

// ==========================================
// PUBLIC: GET ALL PRODUCTS
// GET /api/products
// ==========================================

router.get("/", async (req, res) => {
    try {
        const snapshot = await productsCollection
            .orderBy("id", "asc")
            .get();

        const products = snapshot.docs.map(doc => {
            const data = doc.data();

            return {
                documentId: doc.id,
                ...data,
                stock: Number.isInteger(data.stock) && data.stock >= 0
                    ? data.stock
                    : 0
            };
        });

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error("Get products error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve products."
        });
    }
});

// ==========================================
// ADMIN: ADD SINGLE PRODUCT
// POST /api/products
// ==========================================

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const product = req.body;

        const validationError = validateProduct(product);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const counterRef = db.collection("_counters").doc("products");

        const newProduct = await db.runTransaction(async transaction => {
            const counterSnapshot = await transaction.get(counterRef);

            let lastId = 22;

            if (counterSnapshot.exists) {
                lastId = counterSnapshot.data().lastId || 22;
            } else {
                const latestProductQuery = productsCollection
                    .orderBy("id", "desc")
                    .limit(1);

                const latestSnapshot = await transaction.get(latestProductQuery);

                if (!latestSnapshot.empty) {
                    lastId = Math.max(
                        22,
                        latestSnapshot.docs[0].data().id || 22
                    );
                }
            }

            const nextId = lastId + 1;
            const documentId = `PROD${String(nextId).padStart(3, "0")}`;
            const productRef = productsCollection.doc(documentId);

            const productData = {
                id: nextId,
                name: product.name.trim(),
                description: product.description.trim(),
                price: Number(product.price),
                category: product.category.trim(),
                fandom: product.fandom.trim(),
                image: product.image.trim(),
                featured: product.featured,
                stock: product.stock
            };

            if (typeof product.categoryId === "string") {
                productData.categoryId = product.categoryId;
            }

            if (typeof product.character === "string") {
                productData.character = product.character;
            }

            if (typeof product.franchise === "string") {
                productData.franchise = product.franchise;
            }

            transaction.create(productRef, productData);

            transaction.set(counterRef, {
                lastId: nextId
            });

            return {
                documentId,
                ...productData
            };
        });

        return res.status(201).json({
            success: true,
            message: "Product added successfully!",
            product: newProduct
        });
    } catch (error) {
        console.error("Add product error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add product."
        });
    }
});

// ==========================================
// ADMIN: UPDATE PRODUCT
// PUT /api/products/:id
// ==========================================

router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const documentId = req.params.id;

        if (!/^PROD\d{3,}$/.test(documentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const validationError = validateProduct(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const productRef = productsCollection.doc(documentId);
        const productSnapshot = await productRef.get();

        if (!productSnapshot.exists) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const existingProduct = productSnapshot.data();

        const updatedProduct = {
            name: req.body.name.trim(),
            description: req.body.description.trim(),
            price: Number(req.body.price),
            category: req.body.category.trim(),
            fandom: req.body.fandom.trim(),
            image: req.body.image.trim(),
            featured: req.body.featured,
            stock: req.body.stock
        };

        if (existingProduct.categoryId !== undefined) {
            updatedProduct.categoryId = existingProduct.categoryId;
        }

        if (existingProduct.character !== undefined) {
            updatedProduct.character = existingProduct.character;
        }

        if (existingProduct.franchise !== undefined) {
            updatedProduct.franchise = existingProduct.franchise;
        }

        await productRef.update(updatedProduct);

        return res.status(200).json({
            success: true,
            message: "Product updated successfully!",
            product: {
                documentId,
                id: existingProduct.id,
                ...updatedProduct
            }
        });
    } catch (error) {
        console.error("Update product error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update product."
        });
    }
});

// ==========================================
// ADMIN: DELETE PRODUCT
// DELETE /api/products/:id
// ==========================================

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const documentId = req.params.id;

        if (!/^PROD\d{3,}$/.test(documentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const productRef = productsCollection.doc(documentId);
        const productSnapshot = await productRef.get();

        if (!productSnapshot.exists) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        await productRef.delete();

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully!",
            documentId
        });
    } catch (error) {
        console.error("Delete product error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete product."
        });
    }
});

// ==========================================
// ADMIN: BULK UPLOAD PRODUCTS
// POST /api/products/bulk
// ==========================================

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
                stock = 0,
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
                typeof featured !== "boolean" ||
                !Number.isInteger(stock) ||
                stock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product data. Check the required fields and stock quantity.",
                    invalidDocumentId: documentId || null
                });
            }

            const productRef = productsCollection.doc(documentId);

            const productData = {
                id,
                name: name.trim(),
                description,
                price,
                category,
                fandom,
                image,
                featured,
                stock
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
        console.error("Bulk upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add products. Check whether a document ID already exists."
        });
    }
});

module.exports = router;
