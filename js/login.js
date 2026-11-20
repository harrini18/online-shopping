
import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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

// Decide where to send the customer after login
function getRedirectUrl() {

    return getSafeReturnUrl() || "index.html";

}

// ==========================================
// PRESERVE RETURN URL WHEN SWITCHING TO REGISTER
// ==========================================

const registerLink = document.querySelector(
    'a[href="register.html"]'
);

const safeReturnUrl = getSafeReturnUrl();

if (registerLink && safeReturnUrl) {

    const registerDestination = new URL(
        "register.html",
        window.location.href
    );

    registerDestination.searchParams.set(
        "returnUrl",
        safeReturnUrl
    );

    registerLink.href = registerDestination.href;
}

// ==========================================
// PAGE ELEMENTS
// ==========================================

const loginForm = document.getElementById("login-form");
const googleButton = document.getElementById("google-login");
const message = document.getElementById("auth-message");

// ==========================================
// EMAIL AND PASSWORD LOGIN
// ==========================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "Signing in...";

    try {

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        message.textContent =
            `Welcome back, ${result.user.email}!`;

        setTimeout(() => {

            window.location.href = getRedirectUrl();

        }, 1200);

    } catch (error) {

        console.error("Login error:", error);

        message.textContent = error.message;
    }
});

// ==========================================
// GOOGLE LOGIN
// ==========================================

googleButton.addEventListener("click", async () => {

    const provider = new GoogleAuthProvider();

    message.textContent = "Connecting to Google...";

    try {

        const result = await signInWithPopup(auth, provider);

        message.textContent =
            `Welcome, ${result.user.displayName || result.user.email}!`;

        setTimeout(() => {

            window.location.href = getRedirectUrl();

        }, 1200);

    } catch (error) {

        console.error("Google login error:", error);

        message.textContent = error.message;
    }
});
