
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

"use strict";

// ==========================================
// THE DRESSUP SOCIETY - ADMIN DASHBOARD
// ==========================================

const API_URL = "http://localhost:5000/api/products";

// ==========================================
// PAGE ELEMENTS
// ==========================================

const productForm = document.getElementById("admin-product-form");
const productFormSection = document.getElementById("product-form-section");
const productFormTitle = document.getElementById("product-form-title");

const addProductButton = document.getElementById("add-product-button");
const studioCreateButton = document.getElementById("studio-create-button");

const cancelFormButton = document.getElementById("cancel-product-form");
const cancelProductButton = document.getElementById("cancel-product-button");

const productList = document.getElementById("admin-product-list");
const adminMessage = document.getElementById("admin-message");

const emptyWorkspace = document.querySelector(".studio-empty-workspace");
const logoutButton = document.getElementById("admin-logout");

const totalProductsElement = document.getElementById("total-products");
const featuredProductsElement = document.getElementById("featured-products");
const totalCategoriesElement = document.getElementById("total-categories");
const productCountLabel = document.getElementById("product-count-label");

// ==========================================
// PRODUCT FORM ELEMENTS
// ==========================================

const documentIdInput = document.getElementById("product-document-id");
const nameInput = document.getElementById("product-name");
const priceInput = document.getElementById("product-price");
const stockInput = document.getElementById("product-stock");
const categoryInput = document.getElementById("product-category");
const fandomInput = document.getElementById("product-fandom");
const imageInput = document.getElementById("product-image");
const descriptionInput = document.getElementById("product-description");
const featuredInput = document.getElementById("product-featured");

const saveButton = document.getElementById("save-product-button");

// ==========================================
// APPLICATION STATE
// ==========================================

let products = [];
let currentUser = null;

// ==========================================
// NOTIFICATION MESSAGE
// ==========================================

function showMessage(message, type = "success") {
    if (!adminMessage) return;

    adminMessage.textContent = message;
    adminMessage.className = `admin-message ${type}`;
    adminMessage.style.display = "block";
}

// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const tokenResult = await user.getIdTokenResult(true);

        if (tokenResult.claims.admin !== true) {
            alert("You do not have permission to access the admin dashboard.");

            await signOut(auth);
            window.location.href = "login.html";
            return;
        }

        currentUser = user;

        console.log("Admin authentication successful.");

        await loadProducts();

    } catch (error) {
        console.error("Admin authentication error:", error);

        showMessage(
            "Unable to verify admin access. Please log in again.",
            "error"
        );
    }
});

// ==========================================
// API REQUEST FUNCTION
// ==========================================

async function apiRequest(endpoint, options = {}) {
    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
    }

    return result;
}

// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {
    try {
        const result = await apiRequest("");

        products = Array.isArray(result)
            ? result
            : result.products || [];

        // Older products without stock are treated as zero.
        products = products.map(product => ({
            ...product,
            stock: Number.isInteger(product.stock) && product.stock >= 0
                ? product.stock
                : 0
        }));

        renderProducts();
        updateStatistics();

        console.log(`Loaded ${products.length} products.`);

    } catch (error) {
        console.error("Product loading error:", error);

        showMessage(
            "Unable to load products: " + error.message,
            "error"
        );

        productList.innerHTML = `
            <tr>
                <td colspan="8" class="admin-table-empty">
                    Unable to load products.
                </td>
            </tr>
        `;
    }
}

// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// ==========================================
// DISPLAY PRODUCTS
// ==========================================

function renderProducts() {
    if (!products.length) {
        productList.innerHTML = `
            <tr>
                <td colspan="8" class="admin-table-empty">
                    No products found. Add your first product!
                </td>
            </tr>
        `;

        return;
    }

    productList.innerHTML = products.map(product => {
        const documentId = escapeHTML(
            product.documentId || product.id
        );

        const stock = product.stock;
        const inStock = stock > 0;

        return `
            <tr>

                <td>
                    <div class="admin-product-name">
                        ${escapeHTML(product.name)}
                    </div>
                </td>

                <td>${escapeHTML(product.category)}</td>

                <td>${escapeHTML(product.fandom)}</td>

                <td>
                    ₹${Number(product.price).toLocaleString("en-IN")}
                </td>

                <td>
                    <strong>${stock}</strong> units
                </td>

                <td>
                    <span class="stock-status ${inStock ? "in-stock" : "out-of-stock"}">
                        ${inStock ? "IN STOCK" : "OUT OF STOCK"}
                    </span>
                </td>

                <td>
                    <span class="product-featured-status">
                        ${product.featured ? "✧ Featured" : "Standard"}
                    </span>
                </td>

                <td>
                    <div class="product-actions">

                        <button
                            type="button"
                            class="edit-product-button"
                            data-id="${documentId}">
                            EDIT
                        </button>

                        <button
                            type="button"
                            class="delete-product-button"
                            data-id="${documentId}">
                            DELETE
                        </button>

                    </div>
                </td>

            </tr>
        `;
    }).join("");
}

// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStatistics() {
    const featuredCount = products.filter(
        product => product.featured === true
    ).length;

    const categories = new Set(
        products.map(product => product.category)
    );

    totalProductsElement.textContent = products.length;
    featuredProductsElement.textContent = featuredCount;
    totalCategoriesElement.textContent = categories.size;

    productCountLabel.textContent =
        `${products.length} ${products.length === 1 ? "product" : "products"}`;
}

// ==========================================
// OPEN PRODUCT FORM
// ==========================================

function openProductForm() {
    productForm.reset();

    documentIdInput.value = "";
    stockInput.value = "0";

    productFormTitle.textContent = "Add a New Product";

    saveButton.innerHTML = "SAVE PRODUCT <span>→</span>";

    productFormSection.hidden = false;

    if (emptyWorkspace) {
        emptyWorkspace.hidden = true;
    }

    productFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ==========================================
// CLOSE PRODUCT FORM
// ==========================================

function closeProductForm() {
    productForm.reset();

    documentIdInput.value = "";
    stockInput.value = "0";

    productFormSection.hidden = true;

    if (emptyWorkspace) {
        emptyWorkspace.hidden = false;
    }
}

// ==========================================
// ADD BUTTON EVENTS
// ==========================================

addProductButton?.addEventListener("click", openProductForm);
studioCreateButton?.addEventListener("click", openProductForm);

const sidebarAddProductLink = document.querySelector(
    '.studio-nav-link[href="#product-form-section"]'
);

sidebarAddProductLink?.addEventListener("click", event => {
    event.preventDefault();
    openProductForm();
});

cancelFormButton?.addEventListener("click", closeProductForm);
cancelProductButton?.addEventListener("click", closeProductForm);

// ==========================================
// ADD / UPDATE PRODUCT
// ==========================================

productForm.addEventListener("submit", async event => {
    event.preventDefault();

    const documentId = documentIdInput.value;

    const productData = {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        price: Number(priceInput.value),
        stock: Number(stockInput.value),
        category: categoryInput.value.trim(),
        fandom: fandomInput.value.trim(),
        image: imageInput.value.trim(),
        featured: featuredInput.checked
    };

    if (
        !productData.name ||
        !productData.description ||
        !productData.category ||
        !productData.fandom ||
        !productData.image ||
        !Number.isFinite(productData.price) ||
        productData.price <= 0 ||
        !Number.isInteger(productData.stock) ||
        productData.stock < 0
    ) {
        showMessage(
            "Please complete all fields correctly. Stock must be a whole number of zero or more.",
            "error"
        );

        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "SAVING...";

        if (documentId) {
            await apiRequest(`/${encodeURIComponent(documentId)}`, {
                method: "PUT",
                body: JSON.stringify(productData)
            });

            showMessage("Product and stock updated successfully!");

        } else {
            await apiRequest("", {
                method: "POST",
                body: JSON.stringify(productData)
            });

            showMessage("New product added successfully!");
        }

        closeProductForm();

        await loadProducts();

    } catch (error) {
        console.error("Product save error:", error);
        showMessage(error.message, "error");

    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = "SAVE PRODUCT <span>→</span>";
    }
});

// ==========================================
// EDIT / DELETE PRODUCT EVENTS
// ==========================================

productList.addEventListener("click", async event => {
    const editButton = event.target.closest(".edit-product-button");
    const deleteButton = event.target.closest(".delete-product-button");

    // EDIT PRODUCT

    if (editButton) {
        const documentId = editButton.dataset.id;

        const product = products.find(item =>
            String(item.documentId || item.id) === documentId
        );

        if (!product) return;

        openProductForm();

        documentIdInput.value = product.documentId || product.id;

        nameInput.value = product.name || "";
        priceInput.value = product.price ?? "";
        stockInput.value = product.stock ?? 0;
        categoryInput.value = product.category || "";
        fandomInput.value = product.fandom || "";
        imageInput.value = product.image || "";
        descriptionInput.value = product.description || "";
        featuredInput.checked = product.featured === true;

        productFormTitle.textContent = "Edit Product";

        saveButton.innerHTML = "UPDATE PRODUCT <span>→</span>";

        return;
    }

    // DELETE PRODUCT

    if (deleteButton) {
        const documentId = deleteButton.dataset.id;

        const confirmed = confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmed) return;

        try {
            deleteButton.disabled = true;

            await apiRequest(`/${encodeURIComponent(documentId)}`, {
                method: "DELETE"
            });

            showMessage("Product deleted successfully!");

            await loadProducts();

        } catch (error) {
            console.error("Product deletion error:", error);

            showMessage(error.message, "error");

            deleteButton.disabled = false;
        }
    }
});

// ==========================================
// ADMIN LOGOUT
// ==========================================

logoutButton?.addEventListener("click", async () => {
    const confirmed = confirm("Are you sure you want to log out?");

    if (!confirmed) return;

    try {
        await signOut(auth);
        window.location.href = "login.html";

    } catch (error) {
        console.error("Logout error:", error);

        showMessage(
            "Unable to log out. Please try again.",
            "error"
        );
    }
});

console.log("THE DRESSUP SOCIETY Admin JS initialized.");
