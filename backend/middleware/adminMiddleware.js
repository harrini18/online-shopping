
const { getAuth } = require("firebase-admin/auth");

// ==========================================
// VERIFY ADMIN ACCESS
// ==========================================

const verifyAdmin = async (req, res, next) => {

    try {

        if (!req.user || !req.user.uid) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRecord = await getAuth().getUser(req.user.uid);

        if (userRecord.customClaims?.admin !== true) {
            return res.status(403).json({
                success: false,
                message: "Admin access denied."
            });
        }

        next();

    } catch (error) {

        console.error("Admin authorization error:", error);

        return res.status(403).json({
            success: false,
            message: "Unable to verify admin permissions."
        });

    }

};

module.exports = { verifyAdmin };
