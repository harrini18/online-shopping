
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const cartItemsContainer = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const subtotalElement = document.getElementById("cart-subtotal");
    const totalElement = document.getElementById("cart-total");

    // Load saved shopping bag
    let cart = JSON.parse(localStorage.getItem("cherryCart")) || [];

    // Format prices in Indian Rupees
    function formatPrice(price) {
        return "₹" + price.toLocaleString("en-IN");
    }

    // Save shopping bag
    function saveCart() {
        localStorage.setItem("cherryCart", JSON.stringify(cart));
    }

    // Display shopping bag
    function displayCart() {

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

            cart.forEach((item) => {

                const itemElement = document.createElement("article");

                itemElement.className = "cart-item";

                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">

                    <div class="cart-item-details">
                        <p>${item.category}</p>
                        <h3>${item.name}</h3>
                        <span>${formatPrice(item.price)}</span>

                        <div class="quantity-controls">
                            <button type="button" data-action="decrease"
                                data-id="${item.id}">−</button>

                            <span>${item.quantity}</span>

                            <button type="button" data-action="increase"
                                data-id="${item.id}">+</button>
                        </div>
                    </div>

                    <div class="cart-item-actions">
                        <strong>${formatPrice(item.price * item.quantity)}</strong>

                        <button type="button" class="remove-item"
                            data-action="remove" data-id="${item.id}">
                            Remove
                        </button>
                    </div>
                `;

                cartItemsContainer.appendChild(itemElement);

            });

        }

        updateSummary();
    }

    // Update totals and item count
    function updateSummary() {

        const itemCount = cart.reduce(
            (sum, item) => sum + item.quantity, 0
        );

        const subtotal = cart.reduce(
            (sum, item) => sum + item.price * item.quantity, 0
        );

        cartCount.textContent = itemCount;
        subtotalElement.textContent = formatPrice(subtotal);
        totalElement.textContent = formatPrice(subtotal);

    }

    // Handle quantity and remove buttons
    cartItemsContainer.addEventListener("click", (event) => {

        const button = event.target.closest("[data-action]");

        if (!button) return;

        const productId = Number(button.dataset.id);
        const action = button.dataset.action;

        const item = cart.find(product => product.id === productId);

        if (!item) return;

        if (action === "increase") {
            item.quantity++;
        }

        if (action === "decrease") {
            item.quantity--;

            if (item.quantity <= 0) {
                cart = cart.filter(product => product.id !== productId);
            }
        }

        if (action === "remove") {
            cart = cart.filter(product => product.id !== productId);
        }

        saveCart();
        displayCart();

    });

    // Initial display
    displayCart();

    console.log("THE CHERRY LABEL shopping bag loaded!");

});
