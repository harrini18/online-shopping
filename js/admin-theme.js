
"use strict";

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

const savedTheme = localStorage.getItem("dressupTheme");

const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

function applyTheme(theme) {
    const currentTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", currentTheme);

    themeIcon.textContent = currentTheme === "dark" ? "☀" : "☾";

    themeToggle.setAttribute(
        "aria-label",
        currentTheme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
    );

    themeToggle.title =
        currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

applyTheme(savedTheme || preferredTheme);

themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
    localStorage.setItem("dressupTheme", nextTheme);
});
