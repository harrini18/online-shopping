
const express = require("express");

const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Authenticated customer route
router.get("/customer", verifyToken, (req, res) => {

    res.status(200).json({
        success: true,
        message: "Customer authentication successful!",
        user: req.user
    });

});

// Admin-only route
router.get("/admin", verifyToken, verifyAdmin, (req, res) => {

    res.status(200).json({
        success: true,
        message: "Admin authorization successful!"
    });

});

module.exports = router;
