
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
const ORDERS_API_URL = "http://localhost:5000/api/orders";

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
// ORDER PAGE ELEMENTS
// ==========================================

const totalOrdersElement = document.getElementById("total-orders");
const placedOrdersElement = document.getElementById("placed-orders");
const processingOrdersElement = document.getElementById("processing-orders");
const deliveredOrdersElement = document.getElementById("delivered-orders");
const orderCountLabel = document.getElementById("order-count-label");

const orderSearchInput = document.getElementById("order-search");
const orderStatusFilter = document.getElementById("order-status-filter");
const orderPaymentFilter = document.getElementById("order-payment-filter");
const refreshOrdersButton = document.getElementById("refresh-orders-button");
const orderList = document.getElementById("admin-order-list");

const orderDetailsSection = document.getElementById("order-details-section");
const orderDetailsContent = document.getElementById("order-details-content");
const closeOrderDetailsButton = document.getElementById("close-order-details");

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
let orders = [];
let currentUser = null;
let selectedOrderId = null;

// ==========================================
// ORDER STATUS RULES
// ==========================================

const ORDER_STATUS_TRANSITIONS = {
    placed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
};

const ORDER_STATUS_LABELS = {
    placed: "Placed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
};

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
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async user => {
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
        await loadOrders();

    } catch (error) {
        console.error("Admin authentication error:", error);

        showMessage(
            "Unable to verify admin access. Please log in again.",
            "error"
        );
    }
});

// ==========================================
// GENERIC API REQUEST FUNCTION
// ==========================================

async function makeApiRequest(baseUrl, endpoint, options = {}) {
    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`${baseUrl}${endpoint}`, {
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

async function apiRequest(endpoint, options = {}) {
    return makeApiRequest(API_URL, endpoint, options);
}

async function ordersApiRequest(endpoint, options = {}) {
    return makeApiRequest(ORDERS_API_URL, endpoint, options);
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

        if (productList) {
            productList.innerHTML = `
                <tr>
                    <td colspan="9" class="admin-table-empty">
                        Unable to load products.
                    </td>
                </tr>
            `;
        }
    }
}

// ==========================================
// DISPLAY PRODUCTS
// ==========================================

function renderProducts() {
    if (!productList) return;

    if (!products.length) {
        productList.innerHTML = `
            <tr>
                <td colspan="9" class="admin-table-empty">
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
// UPDATE PRODUCT STATISTICS
// ==========================================

function updateStatistics() {
    const featuredCount = products.filter(
        product => product.featured === true
    ).length;

    const categories = new Set(
        products.map(product => product.category)
    );

    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
    }

    if (featuredProductsElement) {
        featuredProductsElement.textContent = featuredCount;
    }

    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = categories.size;
    }

    if (productCountLabel) {
        productCountLabel.textContent =
            `${products.length} ${products.length === 1 ? "product" : "products"}`;
    }
}

// ==========================================
// OPEN PRODUCT FORM
// ==========================================

function openProductForm() {
    if (!productForm) return;

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
    if (!productForm) return;

    productForm.reset();

    documentIdInput.value = "";
    stockInput.value = "0";

    productFormSection.hidden = true;

    if (emptyWorkspace) {
        emptyWorkspace.hidden = false;
    }
}

// ==========================================
// PRODUCT FORM BUTTON EVENTS
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

productForm?.addEventListener("submit", async event => {
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

productList?.addEventListener("click", async event => {
    const editButton = event.target.closest(".edit-product-button");
    const deleteButton = event.target.closest(".delete-product-button");

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
// ORDER DATE FORMATTING
// ==========================================

function getOrderDate(value) {
    if (!value) return null;

    let dateValue = value;

    if (typeof value === "object") {
        if (value._seconds) {
            dateValue = value._seconds * 1000;
        } else if (value.seconds) {
            dateValue = value.seconds * 1000;
        } else if (typeof value.toDate === "function") {
            dateValue = value.toDate();
        }
    }

    const date = new Date(dateValue);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatOrderDate(value) {
    const date = getOrderDate(value);

    if (!date) return "Date unavailable";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ==========================================
// ORDER FORMATTING
// ==========================================

function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "₹0";

    return `₹${amount.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
}

function getOrderId(order) {
    return String(order.id || order.orderId || "");
}

function getOrderStatus(order) {
    return String(order.status || "placed").toLowerCase();
}

function getPaymentStatus(order) {
    return String(order.paymentStatus || "pending").toLowerCase();
}

function getOrderItems(order) {
    return Array.isArray(order.items) ? order.items : [];
}

function getOrderItemCount(order) {
    return getOrderItems(order).reduce((total, item) => {
        return total + (Number(item.quantity) || 0);
    }, 0);
}

// ==========================================
// LOAD ORDERS
// ==========================================

async function loadOrders() {
    if (!orderList) return;

    try {
        if (refreshOrdersButton) {
            refreshOrdersButton.disabled = true;
            refreshOrdersButton.textContent = "LOADING...";
        }

        orderList.innerHTML = `
            <tr>
                <td colspan="9" class="admin-table-empty">
                    Loading orders...
                </td>
            </tr>
        `;

        const result = await ordersApiRequest("");

        orders = Array.isArray(result)
            ? result
            : result.orders || [];

        renderOrders();
        updateOrderStatistics();

        if (
            selectedOrderId &&
            orders.some(order => getOrderId(order) === selectedOrderId)
        ) {
            renderOrderDetails(selectedOrderId);
        } else if (selectedOrderId) {
            closeOrderDetails();
        }

        console.log(`Loaded ${orders.length} orders.`);

    } catch (error) {
        console.error("Order loading error:", error);

        orderList.innerHTML = `
            <tr>
                <td colspan="9" class="admin-table-empty">
                    Unable to load orders. ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        showMessage(
            "Unable to load orders: " + error.message,
            "error"
        );

    } finally {
        if (refreshOrdersButton) {
            refreshOrdersButton.disabled = false;
            refreshOrdersButton.textContent = "REFRESH";
        }
    }
}

// ==========================================
// ORDER STATISTICS
// ==========================================

function updateOrderStatistics() {
    const placedCount = orders.filter(
        order => getOrderStatus(order) === "placed"
    ).length;

    const processingCount = orders.filter(
        order => getOrderStatus(order) === "processing"
    ).length;

    const deliveredCount = orders.filter(
        order => getOrderStatus(order) === "delivered"
    ).length;

    if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length;
    }

    if (placedOrdersElement) {
        placedOrdersElement.textContent = placedCount;
    }

    if (processingOrdersElement) {
        processingOrdersElement.textContent = processingCount;
    }

    if (deliveredOrdersElement) {
        deliveredOrdersElement.textContent = deliveredCount;
    }

    if (orderCountLabel) {
        orderCountLabel.textContent =
            `${orders.length} ${orders.length === 1 ? "order" : "orders"}`;
    }
}

// ==========================================
// FILTER ORDERS
// ==========================================

function getFilteredOrders() {
    const searchTerm = orderSearchInput?.value.trim().toLowerCase() || "";
    const statusFilter = orderStatusFilter?.value || "all";
    const paymentFilter = orderPaymentFilter?.value || "all";

    return orders.filter(order => {
        const customer = order.customer || {};
        const orderId = getOrderId(order);

        const searchableText = [
            orderId,
            customer.fullName,
            customer.email,
            customer.phone,
            customer.city,
            customer.pincode
        ].join(" ").toLowerCase();

        const matchesSearch =
            !searchTerm || searchableText.includes(searchTerm);

        const matchesStatus =
            statusFilter === "all" ||
            getOrderStatus(order) === statusFilter;

        const matchesPayment =
            paymentFilter === "all" ||
            getPaymentStatus(order) === paymentFilter;

        return matchesSearch && matchesStatus && matchesPayment;
    });
}

// ==========================================
// RENDER ORDERS TABLE
// ==========================================

function renderOrders() {
    if (!orderList) return;

    const filteredOrders = getFilteredOrders();

    if (!filteredOrders.length) {
        orderList.innerHTML = `
            <tr>
                <td colspan="9" class="admin-table-empty">
                    ${orders.length
                        ? "No orders match your search or filters."
                        : "No orders have been received yet."}
                </td>
            </tr>
        `;

        return;
    }

    orderList.innerHTML = filteredOrders.map(order => {
        const orderId = getOrderId(order);
        const customer = order.customer || {};
        const status = getOrderStatus(order);
        const paymentStatus = getPaymentStatus(order);
        const itemCount = getOrderItemCount(order);

        const statusLabel =
            ORDER_STATUS_LABELS[status] || status;

        const shortOrderId = orderId.length > 18
            ? `${orderId.slice(0, 18)}...`
            : orderId;

        return `
            <tr>
                <td>
                    <div class="order-id-cell" title="${escapeHTML(orderId)}">
                        #${escapeHTML(shortOrderId)}
                    </div>
                </td>

                <td>
                    <div class="order-customer-cell">
                        <strong>
                            ${escapeHTML(customer.fullName || "Customer")}
                        </strong>
                    </div>
                </td>

                <td>
                    <div class="order-email-cell">
                        ${escapeHTML(customer.email || "Not provided")}
                    </div>
                </td>

                <td>
                    <div class="order-date-cell">
                        ${escapeHTML(formatOrderDate(order.createdAt))}
                    </div>
                </td>

                <td>
                    ${itemCount} ${itemCount === 1 ? "item" : "items"}
                </td>

                <td>
                    <strong>${formatCurrency(order.total)}</strong>
                </td>

                <td>
                    <span class="order-payment-badge ${escapeHTML(paymentStatus)}">
                        ${escapeHTML(paymentStatus.toUpperCase())}
                    </span>
                </td>

                <td>
                    <span class="order-status-badge ${escapeHTML(status)}">
                        ${escapeHTML(statusLabel)}
                    </span>
                </td>

                <td>
                    <div class="order-actions">
                        <button
                            type="button"
                            class="order-view-button"
                            data-action="view-order"
                            data-id="${escapeHTML(orderId)}">
                            VIEW
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// ORDER DETAILS
// ==========================================

function renderOrderDetails(orderId) {
    const order = orders.find(item => getOrderId(item) === orderId);

    if (!order || !orderDetailsSection || !orderDetailsContent) {
        return;
    }

    selectedOrderId = orderId;

    const customer = order.customer || {};
    const items = getOrderItems(order);
    const status = getOrderStatus(order);
    const paymentStatus = getPaymentStatus(order);
    const paymentMethod = String(order.paymentMethod || "COD").toUpperCase();

    const allowedTransitions =
        ORDER_STATUS_TRANSITIONS[status] || [];

    const itemRows = items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const lineTotal = Number.isFinite(Number(item.lineTotal))
            ? Number(item.lineTotal)
            : price * quantity;

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(item.name || "Product")}</strong>
                </td>
                <td>${quantity}</td>
                <td>${formatCurrency(price)}</td>
                <td>${formatCurrency(lineTotal)}</td>
            </tr>
        `;
    }).join("");

    const statusOptions = allowedTransitions.map(nextStatus => `
        <option value="${escapeHTML(nextStatus)}">
            ${escapeHTML(ORDER_STATUS_LABELS[nextStatus] || nextStatus)}
        </option>
    `).join("");

    const canMarkPaid =
        paymentMethod === "COD" &&
        paymentStatus === "pending" &&
        status !== "cancelled";

    orderDetailsContent.innerHTML = `
        <div class="order-detail-grid">

            <div class="order-detail-card">
                <h3>Order Information</h3>

                <div class="order-detail-row">
                    <span>Order ID</span>
                    <strong>${escapeHTML(orderId)}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Placed On</span>
                    <strong>${escapeHTML(formatOrderDate(order.createdAt))}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Order Status</span>
                    <strong>${escapeHTML(
                        ORDER_STATUS_LABELS[status] || status
                    )}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Payment Method</span>
                    <strong>${escapeHTML(paymentMethod)}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Payment Status</span>
                    <strong>${escapeHTML(paymentStatus.toUpperCase())}</strong>
                </div>
            </div>

            <div class="order-detail-card">
                <h3>Customer Details</h3>

                <div class="order-detail-row">
                    <span>Name</span>
                    <strong>${escapeHTML(customer.fullName || "Not provided")}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Email</span>
                    <strong>${escapeHTML(customer.email || "Not provided")}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Phone</span>
                    <strong>${escapeHTML(customer.phone || "Not provided")}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Delivery Address</span>
                    <strong>
                        ${escapeHTML(customer.address || "")},
                        ${escapeHTML(customer.city || "")},
                        ${escapeHTML(customer.pincode || "")}
                    </strong>
                </div>
            </div>

        </div>

        <div class="order-detail-card">
            <h3>Ordered Products</h3>

            <div class="orders-table-wrapper">
                <table class="order-items-table">
                    <thead>
                        <tr>
                            <th>PRODUCT</th>
                            <th>QTY</th>
                            <th>PRICE</th>
                            <th>SUBTOTAL</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${itemRows || `
                            <tr>
                                <td colspan="4">No item details available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <div class="order-total-summary">
                <div class="order-detail-row">
                    <span>Subtotal</span>
                    <strong>${formatCurrency(order.subtotal)}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Delivery</span>
                    <strong>${formatCurrency(order.deliveryCharge)}</strong>
                </div>

                <div class="order-detail-row">
                    <span>Total</span>
                    <strong>${formatCurrency(order.total)}</strong>
                </div>
            </div>
        </div>

        <div class="order-detail-card">
            <h3>Manage This Order</h3>

            <div class="order-management-actions">

                ${allowedTransitions.length ? `
                    <div>
                        <label for="order-status-update">
                            Update order status
                        </label>

                        <select id="order-status-update" class="orders-filter">
                            ${statusOptions}
                        </select>

                        <button
                            type="button"
                            class="order-action-button"
                            data-action="update-order-status"
                            data-id="${escapeHTML(orderId)}">
                            UPDATE STATUS
                        </button>
                    </div>
                ` : `
                    <p>This order has reached a final status.</p>
                `}

                ${canMarkPaid ? `
                    <button
                        type="button"
                        class="order-action-button"
                        data-action="mark-order-paid"
                        data-id="${escapeHTML(orderId)}">
                        MARK COD AS PAID
                    </button>
                ` : ""}

            </div>
        </div>
    `;

    orderDetailsSection.hidden = false;

    orderDetailsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ==========================================
// CLOSE ORDER DETAILS
// ==========================================

function closeOrderDetails() {
    selectedOrderId = null;

    if (orderDetailsSection) {
        orderDetailsSection.hidden = true;
    }

    if (orderDetailsContent) {
        orderDetailsContent.innerHTML = "";
    }
}

closeOrderDetailsButton?.addEventListener("click", closeOrderDetails);

// ==========================================
// ORDER STATUS UPDATE
// ==========================================

async function updateOrderStatus(orderId, nextStatus) {
    const order = orders.find(item => getOrderId(item) === orderId);

    if (!order) {
        showMessage("Order could not be found.", "error");
        return;
    }

    const currentStatus = getOrderStatus(order);
    const allowedTransitions =
        ORDER_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(nextStatus)) {
        showMessage("That order status change is not allowed.", "error");
        return;
    }

    if (nextStatus === "cancelled") {
        const confirmed = confirm(
            "Cancel this order? Its purchased stock will be returned to inventory."
        );

        if (!confirmed) return;
    }

    try {
        await ordersApiRequest(`/${encodeURIComponent(orderId)}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: nextStatus
            })
        });

        showMessage(
            nextStatus === "cancelled"
                ? "Order cancelled. Product stock has been restored."
                : `Order status updated to ${ORDER_STATUS_LABELS[nextStatus]}.`
        );

        await loadOrders();

        if (nextStatus === "cancelled") {
            await loadProducts();
        }

    } catch (error) {
        console.error("Order status update error:", error);
        showMessage(error.message, "error");
    }
}

// ==========================================
// COD PAYMENT UPDATE
// ==========================================

async function markOrderPaid(orderId) {
    const order = orders.find(item => getOrderId(item) === orderId);

    if (!order) {
        showMessage("Order could not be found.", "error");
        return;
    }

    if (
        String(order.paymentMethod || "").toLowerCase() !== "cod" ||
        getPaymentStatus(order) !== "pending" ||
        getOrderStatus(order) === "cancelled"
    ) {
        showMessage("This order cannot be marked as paid.", "error");
        return;
    }

    const confirmed = confirm(
        "Confirm that you have received the Cash on Delivery payment?"
    );

    if (!confirmed) return;

    try {
        await ordersApiRequest(`/${encodeURIComponent(orderId)}/payment`, {
            method: "PATCH",
            body: JSON.stringify({
                paymentStatus: "paid"
            })
        });

        showMessage("COD payment marked as paid successfully.");

        await loadOrders();

    } catch (error) {
        console.error("Payment update error:", error);
        showMessage(error.message, "error");
    }
}

// ==========================================
// ORDER TABLE AND DETAILS EVENTS
// ==========================================

orderList?.addEventListener("click", event => {
    const viewButton = event.target.closest('[data-action="view-order"]');

    if (!viewButton) return;

    renderOrderDetails(viewButton.dataset.id);
});

orderDetailsContent?.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) return;

    const orderId = actionButton.dataset.id;
    const action = actionButton.dataset.action;

    if (action === "update-order-status") {
        const statusSelect = document.getElementById("order-status-update");
        const nextStatus = statusSelect?.value;

        if (!nextStatus) {
            showMessage("Please select an order status.", "error");
            return;
        }

        actionButton.disabled = true;

        try {
            await updateOrderStatus(orderId, nextStatus);
        } finally {
            actionButton.disabled = false;
        }
    }

    if (action === "mark-order-paid") {
        actionButton.disabled = true;

        try {
            await markOrderPaid(orderId);
        } finally {
            actionButton.disabled = false;
        }
    }
});

// ==========================================
// ORDER SEARCH AND FILTER EVENTS
// ==========================================

orderSearchInput?.addEventListener("input", renderOrders);
orderStatusFilter?.addEventListener("change", renderOrders);
orderPaymentFilter?.addEventListener("change", renderOrders);

refreshOrdersButton?.addEventListener("click", loadOrders);

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

// ==========================================
// SIDEBAR NAVIGATION — ACTIVE INDICATOR
// ==========================================

const studioNavLinks = document.querySelectorAll(".studio-nav-link");

function updateActiveNavigation(activeLink) {
    studioNavLinks.forEach(link => {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
    });

    activeLink.classList.add("active");
    activeLink.setAttribute("aria-current", "page");
}

studioNavLinks.forEach(link => {
    link.addEventListener("click", () => {
        updateActiveNavigation(link);
    });
});

// Set the correct active link when the page loads
const currentHash = window.location.hash;

if (currentHash) {
    const matchingLink = document.querySelector(
        `.studio-nav-link[href="${currentHash}"]`
    );

    if (matchingLink) {
        updateActiveNavigation(matchingLink);
    }
}