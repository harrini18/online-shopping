
const { firebaseApp } = require("../config/firebase");
const { getAuth } = require("firebase-admin/auth");

const auth = getAuth(firebaseApp);

// Get the admin email from the terminal argument
const adminEmail = process.argv[2];

if (!adminEmail) {
    console.error("Please provide the admin email address.");
    console.error("Example: node scripts/setAdmin.js admin@example.com");
    process.exit(1);
}

async function setAdmin() {
    try {
        const user = await auth.getUserByEmail(adminEmail);

        // Preserve existing custom claims and add admin permission
        await auth.setCustomUserClaims(user.uid, {
            ...(user.customClaims || {}),
            admin: true
        });

        console.log("----------------------------------");
        console.log("ADMIN PERMISSION ASSIGNED!");
        console.log("Email:", user.email);
        console.log("UID:", user.uid);
        console.log("----------------------------------");

    } catch (error) {
        console.error("Unable to assign admin permission:", error.message);
        process.exitCode = 1;
    }
}

setAdmin();
