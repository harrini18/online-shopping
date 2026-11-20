
"use strict";

// ==========================================
// THE DRESSUP SOCIETY - AUTH PAGE THEME
// ==========================================

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

const THEME_STORAGE_KEY = "dressupTheme";

// ==========================================
// APPLY SELECTED THEME
// ==========================================

function applyTheme(theme) {

    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute(
        "data-theme",
        selectedTheme
    );

    if (themeIcon) {
        themeIcon.textContent =
            selectedTheme === "dark" ? "☀" : "☾";
    }

    if (themeToggle) {

        const nextTheme =
            selectedTheme === "dark" ? "light" : "dark";

        const label =
            nextTheme === "dark"
                ? "Switch to dark mode"
                : "Switch to light mode";

        themeToggle.setAttribute("aria-label", label);
        themeToggle.setAttribute("title", label);
    }
}

// ==========================================
// LOAD SAVED THEME
// ==========================================

let savedTheme = null;

try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
} catch (error) {
    savedTheme = null;
}

const systemPrefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

const initialTheme =
    savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : systemPrefersDark
            ? "dark"
            : "light";

applyTheme(initialTheme);

// ==========================================
// SWITCH THEME
// ==========================================

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        const nextTheme =
            currentTheme === "dark" ? "light" : "dark";

        applyTheme(nextTheme);

        try {
            localStorage.setItem(
                THEME_STORAGE_KEY,
                nextTheme
            );
        } catch (error) {
            console.warn("Theme preference could not be saved.");
        }
    });
}
