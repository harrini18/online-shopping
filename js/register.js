
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ==========================================
// PAGE ELEMENTS
// ==========================================

const registerForm = document.getElementById("register-form");
const message = document.getElementById("auth-message");
const submitButton = registerForm.querySelector('button[type="submit"]');

// ==========================================
// SAFE REDIRECT DESTINATION
// ==========================================

function getSafeReturnUrl() {

    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("returnUrl");

    if (!returnUrl) {
        return null;
    }

    try {

        const destination = new URL(
            returnUrl,
            window.location.origin
        );

        // Only allow redirects within this website
        if (destination.origin !== window.location.origin) {
            return null;
        }

        return (
            destination.pathname +
            destination.search +
            destination.hash
        );

    } catch (error) {

        console.warn("Invalid return URL.");
        return null;
    }
}

// Decide where to send the customer after registration
function getRedirectUrl() {

    return getSafeReturnUrl() || "index.html";

}

// ==========================================
// PRESERVE RETURN URL WHEN SWITCHING TO LOGIN
// ==========================================

const loginLink = document.querySelector(
    'a[href="login.html"]'
);

const safeReturnUrl = getSafeReturnUrl();

if (loginLink && safeReturnUrl) {

    const loginDestination = new URL(
        "login.html",
        window.location.href
    );

    loginDestination.searchParams.set(
        "returnUrl",
        safeReturnUrl
    );

    loginLink.href = loginDestination.href;
}

// ==========================================
// CUSTOMER REGISTRATION
// ==========================================

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    if (!name || !email || !phone || !password) {

        message.textContent = "Please complete all fields.";
        return;
    }

    message.textContent = "Creating your account...";

    submitButton.disabled = true;
    submitButton.textContent = "CREATING ACCOUNT...";

    try {

        // Create the Firebase Authentication account
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        // Set the customer's display name
        await updateProfile(user, {
            displayName: name
        });

        // Save customer details in Firestore
        await setDoc(doc(db, "customers", user.uid), {

            customerId: user.uid,
            name: name,
            email: email,
            phone: phone,
            role: "user",
            createdAt: serverTimestamp()

        });

        message.textContent =
            "Account created successfully! Redirecting...";

        // Redirect to the original destination
        setTimeout(() => {

            window.location.href = getRedirectUrl();

        }, 1200);

    } catch (error) {

        console.error("Registration error:", error);

        message.textContent = error.message;

        submitButton.disabled = false;
        submitButton.textContent = "CREATE ACCOUNT →";
    }
});
