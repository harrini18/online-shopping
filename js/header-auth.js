
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Homepage account controls
const loginLink = document.getElementById("login-link");
const logoutButton = document.getElementById("logout-button");

// Check whether the visitor is signed in
onAuthStateChanged(auth, (user) => {

    if (user) {

        // Visitor is signed in
        if (loginLink) {
            loginLink.hidden = true;
        }

        if (logoutButton) {
            logoutButton.hidden = false;
        }

    } else {

        // Visitor is signed out
        if (loginLink) {
            loginLink.hidden = false;
        }

        if (logoutButton) {
            logoutButton.hidden = true;
        }
    }
});

// Sign out when Logout is clicked
if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {

            await signOut(auth);

            // onAuthStateChanged will update the header

        } catch (error) {

            console.error("Logout error:", error);

            alert("Unable to log out. Please try again.");

            logoutButton.textContent = "Logout";
            logoutButton.disabled = false;
        }
    });
}
