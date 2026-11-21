
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut,
    getIdTokenResult
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ==========================================
// THE DRESSUP SOCIETY - HEADER AUTHENTICATION
// ==========================================

// Homepage account controls
const loginLink = document.getElementById("login-link");
const logoutButton = document.getElementById("logout-button");
const adminLink = document.getElementById("admin-link");

// Hide administration until Firebase verifies the role
if (adminLink) {
    adminLink.hidden = true;
}

// ==========================================
// CHECK LOGIN STATUS AND USER ROLE
// ==========================================

onAuthStateChanged(auth, async (user) => {

    // Reset administration visibility
    if (adminLink) {
        adminLink.hidden = true;
    }

    if (user) {

        // User is signed in
        if (loginLink) {
            loginLink.hidden = true;
        }

        if (logoutButton) {
            logoutButton.hidden = false;
            logoutButton.disabled = false;
            logoutButton.textContent = "Logout";
        }

        try {

            // Get Firebase authentication claims
            const tokenResult = await getIdTokenResult(user);

            // Check whether this user is an administrator
            const isAdmin = tokenResult.claims.admin === true;

            if (adminLink) {
                adminLink.hidden = !isAdmin;
            }

            console.log(
                isAdmin
                    ? "Administrator authenticated."
                    : "Customer authenticated."
            );

        } catch (error) {

            console.error("Unable to verify user role:", error);

            // Fail securely: never show admin link if verification fails
            if (adminLink) {
                adminLink.hidden = true;
            }
        }

    } else {

        // User is signed out
        if (loginLink) {
            loginLink.hidden = false;
        }

        if (logoutButton) {
            logoutButton.hidden = true;
            logoutButton.disabled = false;
            logoutButton.textContent = "Logout";
        }

        if (adminLink) {
            adminLink.hidden = true;
        }

        console.log("Visitor is signed out.");
    }
});

// ==========================================
// LOGOUT
// ==========================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {

            await signOut(auth);

        } catch (error) {

            console.error("Logout error:", error);

            alert("Unable to log out. Please try again.");

            logoutButton.textContent = "Logout";
            logoutButton.disabled = false;
        }
    });
}
