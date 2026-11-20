
const { getAuth } = require("firebase-admin/auth");

// ==========================================
// VERIFY FIREBASE AUTHENTICATION TOKEN
// ==========================================

const verifyToken = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        const decodedToken = await getAuth().verifyIdToken(token, true);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        next();

    } catch (error) {

        console.error("Authentication error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });

    }

};

module.exports = { verifyToken };
