
import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const checkoutButton = document.getElementById("checkout-button");

let currentUser = null;
let authReady = false;

// ==========================================
// CREATE LOGIN DIALOG
// ==========================================

function createLoginDialog() {

    // Prevent duplicate dialogs
    if (document.getElementById("login-dialog")) {
        return;
    }

    const dialog = document.createElement("div");

    dialog.id = "login-dialog";
    dialog.className = "login-dialog-overlay";
    dialog.setAttribute("aria-hidden", "true");

    dialog.innerHTML = `
        <div class="login-dialog" role="dialog"
             aria-modal="true"
             aria-labelledby="login-dialog-title">

            <button type="button"
                class="dialog-close"
                aria-label="Close dialog">
                &times;
            </button>

            <div class="dialog-icon">♡</div>

            <p class="eyebrow">A LITTLE MORE PERSONAL</p>

            <h2 id="login-dialog-title">
                Your collection is waiting.
            </h2>

            <p class="dialog-description">
                Please sign in or create an account
                to continue with your purchase.
                Your shopping bag will be saved.
            </p>

            <div class="dialog-actions">

                <button type="button" class="dialog-login">
                    LOGIN TO YOUR ACCOUNT
                </button>

                <button type="button" class="dialog-register">
                    CREATE AN ACCOUNT
                </button>

            </div>

            <button type="button" class="dialog-continue">
                Continue shopping
            </button>

        </div>
    `;

    document.body.appendChild(dialog);

    // Close dialog
    const closeButton = dialog.querySelector(".dialog-close");
    const continueButton = dialog.querySelector(".dialog-continue");

    function closeDialog() {
        dialog.classList.remove("active");
        dialog.setAttribute("aria-hidden", "true");
    }

    closeButton.addEventListener("click", closeDialog);
    continueButton.addEventListener("click", closeDialog);

    // Close when clicking outside the dialog
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            closeDialog();
        }
    });

    // Close with Escape key
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            dialog.classList.contains("active")
        ) {
            closeDialog();
        }
    });

    // Preserve cart destination after authentication
    const returnUrl = encodeURIComponent("cart.html?checkout=1");

    // Login button
    dialog.querySelector(".dialog-login").addEventListener("click", () => {
        window.location.href = `login.html?returnUrl=${returnUrl}`;
    });

    // Register button
    dialog.querySelector(".dialog-register").addEventListener("click", () => {
        window.location.href = `register.html?returnUrl=${returnUrl}`;
    });

}

// ==========================================
// SHOW LOGIN DIALOG
// ==========================================

function showLoginDialog() {

    createLoginDialog();

    const dialog = document.getElementById("login-dialog");

    dialog.classList.add("active");
    dialog.setAttribute("aria-hidden", "false");

    dialog.querySelector(".dialog-close").focus();

}

// ==========================================
// CHECK CUSTOMER LOGIN STATUS
// ==========================================

checkoutButton.disabled = true;

onAuthStateChanged(auth, (user) => {

    currentUser = user;
    authReady = true;

    checkoutButton.disabled = false;

});

// ==========================================
// CHECKOUT BUTTON
// ==========================================

checkoutButton.addEventListener("click", () => {

    if (!authReady) {
        return;
    }

    // Prevent checkout with an empty shopping bag
    const cart = JSON.parse(localStorage.getItem("cherryCart")) || [];

    if (cart.length === 0) {
        alert("Your shopping bag is empty. Add a product before checkout.");
        return;
    }

    if (!currentUser) {

        showLoginDialog();
        return;

    }

    window.location.href = "checkout.html";

});
