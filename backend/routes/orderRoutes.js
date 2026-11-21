
const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

const productsCollection = db.collection("products");
const ordersCollection = db.collection("orders");

// ==========================================
// VALIDATE CUSTOMER DETAILS
// ==========================================

function validateCustomer(customer) {
    if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
        return "Customer details are required.";
    }

    const {
        fullName,
        email,
        phone,
        address,
        city,
        pincode
    } = customer;

    if (
        typeof fullName !== "string" ||
        fullName.trim().length < 2 ||
        fullName.trim().length > 100
    ) {
        return "Please enter a valid full name.";
    }

    if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return "Please enter a valid email address.";
    }

    if (
        typeof phone !== "string" ||
        !/^[0-9]{10}$/.test(phone)
    ) {
        return "Please enter a valid 10-digit phone number.";
    }

    if (
        typeof address !== "string" ||
        address.trim().length < 5 ||
        address.trim().length > 250
    ) {
        return "Please enter a valid delivery address.";
    }

    if (
        typeof city !== "string" ||
        city.trim().length < 2 ||
        city.trim().length > 100
    ) {
        return "Please enter a valid city.";
    }

    if (
        typeof pincode !== "string" ||
        !/^[0-9]{6}$/.test(pincode)
    ) {
        return "Please enter a valid 6-digit PIN code.";
    }

    return null;
}

// ==========================================
// VALIDATE ORDER ITEMS
// ==========================================

function validateItems(items) {
    if (
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > 30
    ) {
        return "Your shopping bag is empty or contains too many items.";
    }

    const seenIds = new Set();

    for (const item of items) {
        if (
            !item ||
            !Number.isSafeInteger(Number(item.id)) ||
            Number(item.id) <= 0 ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 99
        ) {
            return "One or more shopping bag items are invalid.";
        }

        const id = Number(item.id);

        if (seenIds.has(id)) {
            return "Duplicate products were found in your shopping bag.";
        }

        seenIds.add(id);
    }

    return null;
}

// ==========================================
// ADMIN: GET ALL ORDERS
// GET /api/orders
// ==========================================

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const snapshot = await ordersCollection
            .orderBy("createdAt", "desc")
            .get();

        const orders = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Fetch orders error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load orders."
        });
    }
});

// ==========================================
// PLACE ORDER
// POST /api/orders
// ==========================================

router.post("/", verifyToken, async (req, res) => {
    try {
        const {
            requestId,
            customer,
            items,
            paymentMethod
        } = req.body || {};

        if (
            typeof requestId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid order request ID."
            });
        }

        const customerError = validateCustomer(customer);

        if (customerError) {
            return res.status(400).json({
                success: false,
                message: customerError
            });
        }

        // The checkout email must belong to the signed-in account.

        if (
            req.user.email &&
            customer.email.trim().toLowerCase() !== req.user.email.toLowerCase()
        ) {
            return res.status(403).json({
                success: false,
                message: "The checkout email must match your signed-in account."
            });
        }

        const itemsError = validateItems(items);

        if (itemsError) {
            return res.status(400).json({
                success: false,
                message: itemsError
            });
        }

        if (paymentMethod !== "cod") {
            return res.status(400).json({
                success: false,
                message: "Only Cash on Delivery is currently available."
            });
        }

        const productIds = items.map(item => Number(item.id));

        const orderRef = ordersCollection.doc(
            req.user.uid + "_" + requestId
        );

        const result = await db.runTransaction(async transaction => {

            // Check whether this order was already placed.

            const existingOrder = await transaction.get(orderRef);

            if (existingOrder.exists) {
                const previousOrder = existingOrder.data();

                return {
                    duplicate: true,
                    orderId: orderRef.id,
                    total: previousOrder.total,
                    status: previousOrder.status,
                    paymentStatus: previousOrder.paymentStatus,
                    paymentMethod: previousOrder.paymentMethod
                };
            }

            // Retrieve authoritative product information.

            const productQuery = productsCollection.where(
                "id",
                "in",
                productIds
            );

            const productSnapshot = await transaction.get(productQuery);

            const productMap = new Map();

            productSnapshot.docs.forEach(document => {
                const product = document.data();
                const productId = Number(product.id);

                if (productMap.has(productId)) {
                    throw new Error("DUPLICATE_PRODUCT_ID");
                }

                productMap.set(productId, {
                    ref: document.ref,
                    data: product
                });
            });

            const orderItems = [];
            let subtotalInPaise = 0;

            for (const requestedItem of items) {
                const productId = Number(requestedItem.id);
                const quantity = requestedItem.quantity;

                const foundProduct = productMap.get(productId);

                if (!foundProduct) {
                    throw new Error("PRODUCT_NOT_FOUND");
                }

                const product = foundProduct.data;
                const stock = product.stock;
                const price = Number(product.price);

                if (
                    !Number.isInteger(stock) ||
                    stock < 0 ||
                    !Number.isFinite(price) ||
                    price <= 0
                ) {
                    throw new Error("INVALID_PRODUCT_DATA");
                }

                if (stock < quantity) {
                    throw new Error("INSUFFICIENT_STOCK");
                }

                const lineTotalInPaise = Math.round(
                    price * quantity * 100
                );

                subtotalInPaise += lineTotalInPaise;

                if (!Number.isSafeInteger(subtotalInPaise)) {
                    throw new Error("INVALID_ORDER_TOTAL");
                }

                orderItems.push({
                    productId,
                    documentId: foundProduct.ref.id,
                    name: String(product.name || "Product"),
                    image: String(product.image || ""),
                    category: String(product.category || ""),
                    price,
                    quantity,
                    lineTotal: lineTotalInPaise / 100
                });
            }

            const subtotal = subtotalInPaise / 100;
            const deliveryCharge = 0;
            const total = subtotal;

            const orderData = {
                userId: req.user.uid,

                customer: {
                    fullName: customer.fullName.trim(),
                    email: customer.email.trim().toLowerCase(),
                    phone: customer.phone,
                    address: customer.address.trim(),
                    city: customer.city.trim(),
                    pincode: customer.pincode
                },

                items: orderItems,

                subtotal,
                deliveryCharge,
                total,

                currency: "INR",

                paymentMethod: "cod",
                paymentStatus: "pending",

                status: "placed",

                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            };

            // Deduct stock and create the order atomically.

            for (const requestedItem of items) {
                const foundProduct = productMap.get(Number(requestedItem.id));

                transaction.update(foundProduct.ref, {
                    stock: foundProduct.data.stock - requestedItem.quantity
                });
            }

            transaction.create(orderRef, orderData);

            return {
                duplicate: false,
                orderId: orderRef.id,
                total,
                status: "placed",
                paymentStatus: "pending",
                paymentMethod: "cod"
            };
        });

        return res.status(result.duplicate ? 200 : 201).json({
            success: true,
            message: result.duplicate
                ? "This order was already placed."
                : "Your order has been placed successfully!",
            order: result
        });

    } catch (error) {
        console.error("Place order error:", error);

        const errors = {
            PRODUCT_NOT_FOUND: {
                status: 404,
                message: "One or more products are no longer available."
            },
            INSUFFICIENT_STOCK: {
                status: 409,
                message: "There is not enough stock for one or more products. Please update your shopping bag."
            },
            INVALID_PRODUCT_DATA: {
                status: 409,
                message: "Product information is invalid. Please contact support."
            },
            DUPLICATE_PRODUCT_ID: {
                status: 409,
                message: "Product records need attention. Please contact support."
            },
            INVALID_ORDER_TOTAL: {
                status: 400,
                message: "The order total is invalid."
            }
        };

        const knownError = errors[error.message];

        if (knownError) {
            return res.status(knownError.status).json({
                success: false,
                message: knownError.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to place your order. Please try again."
        });
    }
});

// ==========================================
// ADMIN: UPDATE ORDER STATUS
// PATCH /api/orders/:orderId/status
// ==========================================

router.patch("/:orderId/status", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body || {};

        const allowedStatuses = [
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status."
            });
        }

        const orderRef = ordersCollection.doc(req.params.orderId);

        const result = await db.runTransaction(async transaction => {
            const orderSnapshot = await transaction.get(orderRef);

            if (!orderSnapshot.exists) {
                throw new Error("ORDER_NOT_FOUND");
            }

            const order = orderSnapshot.data();
            const currentStatus = order.status;

            if (currentStatus === status) {
                return {
                    unchanged: true,
                    status: currentStatus
                };
            }

            const validTransitions = {
                placed: ["processing", "cancelled"],
                processing: ["shipped", "cancelled"],
                shipped: ["delivered"],
                delivered: [],
                cancelled: []
            };

            if (
                !validTransitions[currentStatus] ||
                !validTransitions[currentStatus].includes(status)
            ) {
                throw new Error("INVALID_STATUS_TRANSITION");
            }

            // Cancellation restores the stock reserved by this order.
            // The transaction ensures this can happen only once.

            if (status === "cancelled") {
                if (!Array.isArray(order.items) || order.items.length === 0) {
                    throw new Error("INVALID_ORDER_ITEMS");
                }

                const productRefs = [];
                const seenDocumentIds = new Set();

                for (const item of order.items) {
                    if (
                        !item ||
                        typeof item.documentId !== "string" ||
                        !Number.isInteger(item.quantity) ||
                        item.quantity < 1
                    ) {
                        throw new Error("INVALID_ORDER_ITEMS");
                    }

                    if (seenDocumentIds.has(item.documentId)) {
                        throw new Error("INVALID_ORDER_ITEMS");
                    }

                    seenDocumentIds.add(item.documentId);

                    productRefs.push(
                        productsCollection.doc(item.documentId)
                    );
                }

                const productSnapshots = [];

                // Complete all transaction reads before writing.

                for (const productRef of productRefs) {
                    productSnapshots.push(
                        await transaction.get(productRef)
                    );
                }

                for (let index = 0; index < productSnapshots.length; index++) {
                    const productSnapshot = productSnapshots[index];
                    const item = order.items[index];

                    if (!productSnapshot.exists) {
                        throw new Error("CANCEL_PRODUCT_NOT_FOUND");
                    }

                    const product = productSnapshot.data();

                    if (
                        !Number.isInteger(product.stock) ||
                        product.stock < 0
                    ) {
                        throw new Error("INVALID_PRODUCT_STOCK");
                    }

                    transaction.update(productRefs[index], {
                        stock: product.stock + item.quantity
                    });
                }
            }

            transaction.update(orderRef, {
                status,
                updatedAt: FieldValue.serverTimestamp()
            });

            return {
                unchanged: false,
                status
            };
        });

        return res.status(200).json({
            success: true,
            message: result.unchanged
                ? "Order already has this status."
                : "Order status updated successfully.",
            order: {
                id: orderRef.id,
                status: result.status
            }
        });

    } catch (error) {
        console.error("Update order status error:", error);

        const errors = {
            ORDER_NOT_FOUND: {
                status: 404,
                message: "Order not found."
            },
            INVALID_STATUS_TRANSITION: {
                status: 409,
                message: "This order cannot be moved to that status."
            },
            INVALID_ORDER_ITEMS: {
                status: 409,
                message: "Order items are invalid. Stock was not changed."
            },
            CANCEL_PRODUCT_NOT_FOUND: {
                status: 409,
                message: "A product in this order no longer exists. Cancellation could not be completed."
            },
            INVALID_PRODUCT_STOCK: {
                status: 409,
                message: "Product stock is invalid. Cancellation could not be completed."
            }
        };

        const knownError = errors[error.message];

        if (knownError) {
            return res.status(knownError.status).json({
                success: false,
                message: knownError.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update order status."
        });
    }
});

// ==========================================
// ADMIN: UPDATE COD PAYMENT STATUS
// PATCH /api/orders/:orderId/payment
// ==========================================

router.patch("/:orderId/payment", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { paymentStatus } = req.body || {};

        if (paymentStatus !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment can only be marked as paid."
            });
        }

        const orderRef = ordersCollection.doc(req.params.orderId);

        const result = await db.runTransaction(async transaction => {
            const orderSnapshot = await transaction.get(orderRef);

            if (!orderSnapshot.exists) {
                throw new Error("ORDER_NOT_FOUND");
            }

            const order = orderSnapshot.data();

            if (order.paymentMethod !== "cod") {
                throw new Error("UNSUPPORTED_PAYMENT_METHOD");
            }

            if (order.status === "cancelled") {
                throw new Error("CANCELLED_ORDER");
            }

            if (order.paymentStatus === "paid") {
                return { unchanged: true };
            }

            if (order.paymentStatus !== "pending") {
                throw new Error("INVALID_PAYMENT_STATUS");
            }

            transaction.update(orderRef, {
                paymentStatus: "paid",
                updatedAt: FieldValue.serverTimestamp()
            });

            return { unchanged: false };
        });

        return res.status(200).json({
            success: true,
            message: result.unchanged
                ? "Payment is already marked as paid."
                : "Payment marked as paid successfully.",
            order: {
                id: orderRef.id,
                paymentStatus: "paid"
            }
        });

    } catch (error) {
        console.error("Update payment status error:", error);

        const errors = {
            ORDER_NOT_FOUND: {
                status: 404,
                message: "Order not found."
            },
            UNSUPPORTED_PAYMENT_METHOD: {
                status: 400,
                message: "This payment method is not supported by this payment tracker."
            },
            CANCELLED_ORDER: {
                status: 409,
                message: "A cancelled order cannot be marked as paid."
            },
            INVALID_PAYMENT_STATUS: {
                status: 409,
                message: "This payment status cannot be changed."
            }
        };

        const knownError = errors[error.message];

        if (knownError) {
            return res.status(knownError.status).json({
                success: false,
                message: knownError.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update payment status."
        });
    }
});

module.exports = router;
