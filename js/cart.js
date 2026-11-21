
import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // PAGE ELEMENTS
    // ==========================================

    const cartItemsContainer = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const subtotalElement = document.getElementById("cart-subtotal");
    const totalElement = document.getElementById("cart-total");
    const checkoutButton = document.getElementById("checkout-button");

    // ==========================================
    // SHOPPING BAG STATE
    // ==========================================

    let cart = [];
    let inventoryLoaded = false;

    try {
        cart = JSON.parse(localStorage.getItem("cherryCart")) || [];

        if (!Array.isArray(cart)) {
            cart = [];
        }

        cart = cart.filter(item => item && item.id !== undefined)
            .map(item => ({
                ...item,
                id: Number(item.id),
                price: Number(item.price) || 0,
                quantity: Math.max(1, Number(item.quantity) || 1),
                stock: Number.isInteger(Number(item.stock))
                    ? Number(item.stock)
                    : 0
            }));

    } catch (error) {
        cart = [];
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function formatPrice(price) {
        return "₹" + Number(price || 0).toLocaleString("en-IN");
    }

    function saveCart() {
        localStorage.setItem("cherryCart", JSON.stringify(cart));
    }

    function getStock(item) {

        const stock = Number(item.stock);

        return Number.isInteger(stock) && stock >= 0
            ? stock
            : 0;
    }

    function isItemUnavailable(item) {
        return getStock(item) <= 0;
    }

    function isQuantityInvalid(item) {
        return item.quantity > getStock(item);
    }

    function isCartValid() {

        if (!inventoryLoaded || cart.length === 0) {
            return false;
        }

        return cart.every(item =>
            getStock(item) > 0 &&
            item.quantity <= getStock(item)
        );
    }

    // ==========================================
    // DISPLAY STOCK STATUS
    // ==========================================

    function getStockMessage(item) {

        const stock = getStock(item);

        if (stock <= 0) {
            return `
                <p class="cart-stock-status out-of-stock">
                    OUT OF STOCK
                </p>
            `;
        }

        if (item.quantity > stock) {
            return `
                <p class="cart-stock-status out-of-stock">
                    Only ${stock} available. Please reduce your quantity.
                </p>
            `;
        }

        return `
            <p class="cart-stock-status in-stock">
                IN STOCK · ${stock} AVAILABLE
            </p>
        `;
    }

    // ==========================================
    // DISPLAY SHOPPING BAG
    // ==========================================

    function displayCart() {

        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = "";

        if (cart.length === 0) {

            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <h2>Your bag is waiting.</h2>
                    <p>You haven't added anything to your collection yet.</p>
                    <a href="index.html#products" class="shop-button">
                        Discover products →
                    </a>
                </div>
            `;

        } else {

            cart.forEach(item => {

                const itemElement = document.createElement("article");

                itemElement.className = "cart-item";

                const stock = getStock(item);
                const unavailable = stock <= 0;
                const quantityTooHigh = item.quantity > stock;

                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">

                    <div class="cart-item-details">

                        <p>${item.category || ""}</p>

                        <h3>${item.name || "Product"}</h3>

                        <span>${formatPrice(item.price)}</span>

                        ${getStockMessage(item)}

                        <div class="quantity-controls">

                            <button
                                type="button"
                                data-action="decrease"
                                data-id="${item.id}"
                                aria-label="Decrease quantity"
                            >
                                −
                            </button>

                            <span>${item.quantity}</span>

                            <button
                                type="button"
                                data-action="increase"
                                data-id="${item.id}"
                                aria-label="Increase quantity"
                                ${unavailable || item.quantity >= stock ? "disabled" : ""}
                            >
                                +
                            </button>

                        </div>

                    </div>

                    <div class="cart-item-actions">

                        <strong>
                            ${formatPrice(item.price * item.quantity)}
                        </strong>

                        <button
                            type="button"
                            class="remove-item"
                            data-action="remove"
                            data-id="${item.id}"
                        >
                            Remove
                        </button>

                    </div>
                `;

                if (unavailable || quantityTooHigh) {
                    itemElement.classList.add("cart-item-unavailable");
                }

                cartItemsContainer.appendChild(itemElement);

            });
        }

        updateSummary();
    }

    // ==========================================
    // UPDATE TOTALS AND ITEM COUNT
    // ==========================================

    function updateSummary() {

        const itemCount = cart.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const subtotal = cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        if (cartCount) {
            cartCount.textContent = itemCount;
        }

        if (subtotalElement) {
            subtotalElement.textContent = formatPrice(subtotal);
        }

        if (totalElement) {
            totalElement.textContent = formatPrice(subtotal);
        }

        if (checkoutButton) {

            checkoutButton.disabled = !isCartValid();

            checkoutButton.title = !inventoryLoaded
                ? "Checking product availability..."
                : !isCartValid()
                    ? "Please resolve unavailable products before checkout."
                    : "Continue to checkout";
        }
    }

    // ==========================================
    // HANDLE QUANTITY AND REMOVE BUTTONS
    // ==========================================

    if (cartItemsContainer) {

        cartItemsContainer.addEventListener("click", event => {

            const button = event.target.closest("[data-action]");

            if (!button) return;

            const productId = Number(button.dataset.id);
            const action = button.dataset.action;

            const item = cart.find(
                product => Number(product.id) === productId
            );

            if (!item) return;

            if (action === "increase") {

                const availableStock = getStock(item);

                if (!inventoryLoaded || availableStock <= 0) {
                    return;
                }

                if (item.quantity >= availableStock) {
                    alert(`Only ${availableStock} item(s) are available.`);
                    return;
                }

                item.quantity++;
            }

            if (action === "decrease") {

                item.quantity--;

                if (item.quantity <= 0) {
                    cart = cart.filter(
                        product => Number(product.id) !== productId
                    );
                }
            }

            if (action === "remove") {

                cart = cart.filter(
                    product => Number(product.id) !== productId
                );
            }

            saveCart();
            displayCart();

        });
    }

    // ==========================================
    // CHECKOUT
    // ==========================================

    if (checkoutButton) {

        checkoutButton.addEventListener("click", () => {

            if (!isCartValid()) {

                alert(
                    "Please check your shopping bag. Some products are unavailable or have insufficient stock."
                );

                return;
            }

            window.location.href = "checkout.html";
        });
    }

    // ==========================================
    // LIVE FIRESTORE INVENTORY
    // ==========================================

    const productsCollection = collection(db, "products");

    onSnapshot(
        productsCollection,

        snapshot => {

            const latestProducts = new Map();

            snapshot.docs.forEach(documentSnapshot => {

                const data = documentSnapshot.data();

                const productId = Number(
                    data.id ?? documentSnapshot.id.replace("PROD", "")
                );

                const stock = Number(data.stock);

                latestProducts.set(productId, {
                    stock:
                        Number.isInteger(stock) && stock >= 0
                            ? stock
                            : 0
                });
            });

            // Update each cart item's stock using Firestore.

            cart = cart.map(item => {

                const latestProduct = latestProducts.get(
                    Number(item.id)
                );

                return {
                    ...item,
                    stock: latestProduct
                        ? latestProduct.stock
                        : 0
                };
            });

            inventoryLoaded = true;

            saveCart();
            displayCart();

            console.log("Shopping bag inventory updated from Firestore.");

        },

        error => {

            console.error(
                "Unable to verify product stock:",
                error
            );

            inventoryLoaded = false;

            displayCart();

            if (cartItemsContainer) {

                const warning = document.createElement("p");

                warning.className = "cart-inventory-warning";

                warning.textContent =
                    "We couldn't verify product availability. Please refresh the page and try again.";

                cartItemsContainer.prepend(warning);
            }
        }
    );

    // ==========================================
    // INITIALIZE SHOPPING BAG
    // ==========================================

    saveCart();
    displayCart();

    console.log("THE CHERRY LABEL shopping bag loaded!");

});
