
import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // THE DRESSUP SOCIETY - FIRESTORE PRODUCTS
    // ==========================================

    let products = [];
    let featuredProducts = [];

    // ==========================================
    // PAGE ELEMENTS
    // ==========================================

    const productList = document.getElementById("product-list");
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("product-search");
    const searchButton = document.getElementById("search-button");
    const pagination = document.getElementById("pagination");
    const cartCount = document.getElementById("cart-count");

    const featuredTrack = document.getElementById("featured-track");
    const featuredPrev = document.getElementById("featured-prev");
    const featuredNext = document.getElementById("featured-next");
    const carouselIndicators = document.getElementById("carousel-indicators");

    const categoryCards = document.querySelectorAll(".category-card");
    const fandomCards = document.querySelectorAll("[data-fandom]");

    // Theme elements
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    // ==========================================
    // SHOPPING STATE
    // ==========================================

    const PRODUCTS_PER_PAGE = 6;

    let currentPage = 1;
    let currentCategory = "All";
    let currentFandom = "All";
    let currentSearch = "";
    let featuredIndex = 0;
    let carouselTimer;

    let cart = [];

    try {
        cart = JSON.parse(localStorage.getItem("cherryCart")) || [];

        if (!Array.isArray(cart)) {
            cart = [];
        }
    } catch (error) {
        cart = [];
    }

    // ==========================================
    // THEME SWITCHER
    // ==========================================

    const THEME_STORAGE_KEY = "dressupTheme";

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

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function formatPrice(price) {
        return "₹" + Number(price).toLocaleString("en-IN");
    }

    function saveCart() {
        localStorage.setItem("cherryCart", JSON.stringify(cart));
    }

    function updateCartCount() {

        const totalItems = cart.reduce((total, item) => {
            return total + Number(item.quantity || 0);
        }, 0);

        if (cartCount) {
            cartCount.textContent = totalItems;
        }
    }

    function getProduct(id) {
        return products.find(product => product.id === Number(id));
    }

    // Normalize stock values.
    // Products without a stock field are treated as unavailable.

    function getStock(product) {

        const stock = Number(product.stock);

        if (!Number.isInteger(stock) || stock < 0) {
            return 0;
        }

        return stock;
    }

    function isOutOfStock(product) {
        return getStock(product) <= 0;
    }

    function getStockLabel(product) {

        if (isOutOfStock(product)) {
            return `
                <span class="product-stock-status out-of-stock">
                    OUT OF STOCK
                </span>
            `;
        }

        return `
            <span class="product-stock-status in-stock">
                IN STOCK
            </span>
        `;
    }

    // ==========================================
    // ADD TO SHOPPING BAG
    // ==========================================

    function addToCart(productId, button) {

        const product = getProduct(productId);

        if (!product) return;

        const availableStock = getStock(product);

        // Prevent adding products that are unavailable.

        if (availableStock <= 0) {

            alert("Sorry! This product is currently out of stock.");

            return;
        }

        const existingItem = cart.find(
            item => Number(item.id) === product.id
        );

        const currentCartQuantity = existingItem
            ? Number(existingItem.quantity) || 0
            : 0;

        // Prevent customers from exceeding available stock.

        if (currentCartQuantity >= availableStock) {

            alert(
                `Only ${availableStock} item(s) available in stock.`
            );

            return;
        }

        if (existingItem) {

            existingItem.quantity++;

            // Keep the latest product stock in the cart.

            existingItem.stock = availableStock;

        } else {

            cart.push({
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                image: product.image,
                stock: availableStock,
                quantity: 1
            });
        }

        saveCart();
        updateCartCount();

        if (button) {

            const originalText = button.textContent;

            button.textContent = "ADDED ✓";
            button.classList.add("added");

            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove("added");
            }, 1400);
        }
    }

    // ==========================================
    // FILTER PRODUCTS
    // ==========================================

    function getFilteredProducts() {

        return products.filter(product => {

            const matchesCategory =
                currentCategory === "All" ||
                product.category === currentCategory;

            const matchesFandom =
                currentFandom === "All" ||
                product.fandom === currentFandom;

            const searchText = currentSearch.toLowerCase();

            const matchesSearch =
                product.name.toLowerCase().includes(searchText) ||
                product.description.toLowerCase().includes(searchText) ||
                product.category.toLowerCase().includes(searchText) ||
                product.fandom.toLowerCase().includes(searchText);

            return matchesCategory && matchesFandom && matchesSearch;
        });
    }

    // ==========================================
    // DISPLAY PRODUCTS
    // ==========================================

    function displayProducts() {

        if (!productList) return;

        const filteredProducts = getFilteredProducts();

        const totalPages = Math.ceil(
            filteredProducts.length / PRODUCTS_PER_PAGE
        );

        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;

        const visibleProducts = filteredProducts.slice(
            startIndex,
            startIndex + PRODUCTS_PER_PAGE
        );

        if (visibleProducts.length === 0) {

            productList.innerHTML = `
                <div class="no-products">
                    <h3>Nothing found just yet.</h3>
                    <p>Try another search or explore a different category.</p>
                    <button type="button" class="shop-button" id="clear-filters">
                        Explore all products
                    </button>
                </div>
            `;

            if (pagination) {
                pagination.innerHTML = "";
            }

            return;
        }

        productList.innerHTML = visibleProducts.map(product => {

            const outOfStock = isOutOfStock(product);

            return `
                <article class="product-card">

                    <div class="product-image">
                        <img
                            src="${product.image}"
                            alt="${product.name}"
                            loading="lazy"
                        >

                        <span class="product-category">
                            ${product.category}
                        </span>
                    </div>

                    <div class="product-info">

                        <p class="product-fandom">
                            ${product.fandom}
                        </p>

                        <h3>${product.name}</h3>

                        <p class="product-description">
                            ${product.description}
                        </p>

                        ${getStockLabel(product)}

                        <div class="product-bottom">

                            <strong>${formatPrice(product.price)}</strong>

                            <button
                                type="button"
                                class="add-to-cart"
                                data-product-id="${product.id}"
                                ${outOfStock ? "disabled" : ""}
                            >
                                ${outOfStock ? "OUT OF STOCK" : "ADD TO BAG +"}
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");

        displayPagination(totalPages);
    }

    // ==========================================
    // PAGINATION
    // ==========================================

    function displayPagination(totalPages) {

        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        let buttons = "";

        for (let page = 1; page <= totalPages; page++) {

            buttons += `
                <button
                    type="button"
                    class="page-button ${page === currentPage ? "active" : ""}"
                    data-page="${page}"
                    aria-label="Go to page ${page}"
                    ${page === currentPage ? 'aria-current="page"' : ""}
                >
                    ${page}
                </button>
            `;
        }

        pagination.innerHTML = buttons;
    }

    // ==========================================
    // FEATURED PRODUCT CAROUSEL
    // ==========================================

    function displayFeatured() {

        if (!featuredTrack) return;

        if (featuredProducts.length === 0) {

            featuredTrack.innerHTML = "";

            if (carouselIndicators) {
                carouselIndicators.innerHTML = "";
            }

            return;
        }

        const product = featuredProducts[featuredIndex];

        const outOfStock = isOutOfStock(product);

        featuredTrack.innerHTML = `
            <article class="featured-slide">

                <div class="featured-slide-image">
                    <img
                        src="${product.image}"
                        alt="${product.name}"
                    >
                </div>

                <div class="featured-slide-content">

                    <p class="eyebrow">THE DRESSUP EDIT</p>

                    <p class="product-fandom">${product.fandom}</p>

                    <h3>${product.name}</h3>

                    <p>${product.description}</p>

                    ${getStockLabel(product)}

                    <strong>${formatPrice(product.price)}</strong>

                    <button
                        type="button"
                        class="add-to-cart featured-add"
                        data-product-id="${product.id}"
                        ${outOfStock ? "disabled" : ""}
                    >
                        ${outOfStock ? "OUT OF STOCK" : "ADD TO BAG +"}
                    </button>

                </div>

            </article>
        `;

        if (carouselIndicators) {

            carouselIndicators.innerHTML = featuredProducts.map(
                (item, index) => {

                    return `
                        <button
                            type="button"
                            class="carousel-dot ${index === featuredIndex ? "active" : ""}"
                            data-slide="${index}"
                            aria-label="Show featured product ${index + 1}"
                        ></button>
                    `;
                }
            ).join("");
        }
    }

    function changeFeatured(direction) {

        if (featuredProducts.length === 0) return;

        featuredIndex =
            (featuredIndex + direction + featuredProducts.length) %
            featuredProducts.length;

        displayFeatured();
    }

    if (featuredPrev) {
        featuredPrev.addEventListener("click", () => {
            changeFeatured(-1);
        });
    }

    if (featuredNext) {
        featuredNext.addEventListener("click", () => {
            changeFeatured(1);
        });
    }

    if (carouselIndicators) {

        carouselIndicators.addEventListener("click", event => {

            const dot = event.target.closest("[data-slide]");

            if (!dot) return;

            featuredIndex = Number(dot.dataset.slide);

            displayFeatured();
        });
    }

    // Automatically change featured product every 5 seconds.

    function startCarousel() {

        clearInterval(carouselTimer);

        if (featuredProducts.length <= 1) return;

        carouselTimer = setInterval(() => {
            changeFeatured(1);
        }, 5000);
    }

    const featuredSection = document.getElementById("featured");

    if (featuredSection) {

        featuredSection.addEventListener("mouseenter", () => {
            clearInterval(carouselTimer);
        });

        featuredSection.addEventListener("mouseleave", startCarousel);
    }

    // ==========================================
    // CATEGORY FILTER
    // ==========================================

    categoryCards.forEach(card => {

        card.addEventListener("click", () => {

            currentCategory = card.dataset.category || "All";
            currentFandom = "All";
            currentPage = 1;

            if (categoryFilter) {
                categoryFilter.value = currentCategory;
            }

            fandomCards.forEach(button => {
                button.classList.remove("active");
            });

            displayProducts();

            document.getElementById("products")?.scrollIntoView({
                behavior: "smooth"
            });
        });
    });

    if (categoryFilter) {

        categoryFilter.addEventListener("change", () => {

            currentCategory = categoryFilter.value;
            currentPage = 1;

            displayProducts();
        });
    }

    // ==========================================
    // FANDOM FILTER
    // ==========================================

    fandomCards.forEach(card => {

        card.addEventListener("click", () => {

            currentFandom = card.dataset.fandom || "All";
            currentCategory = "All";
            currentPage = 1;

            if (categoryFilter) {
                categoryFilter.value = "All";
            }

            fandomCards.forEach(button => {
                button.classList.remove("active");
            });

            card.classList.add("active");

            displayProducts();

            document.getElementById("products")?.scrollIntoView({
                behavior: "smooth"
            });
        });
    });

    // ==========================================
    // SEARCH
    // ==========================================

    function performSearch() {

        currentSearch = searchInput ? searchInput.value.trim() : "";

        currentPage = 1;

        displayProducts();
    }

    if (searchInput) {

        searchInput.addEventListener("input", performSearch);

        searchInput.addEventListener("keydown", event => {

            if (event.key === "Enter") {
                performSearch();
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener("click", performSearch);
    }

    // ==========================================
    // PRODUCT AND PAGINATION BUTTONS
    // ==========================================

    document.addEventListener("click", event => {

        const addButton = event.target.closest(".add-to-cart");

        if (addButton) {

            // Disabled buttons cannot add products.

            if (addButton.disabled) return;

            addToCart(
                addButton.dataset.productId,
                addButton
            );
        }

        const pageButton = event.target.closest("[data-page]");

        if (pageButton) {

            currentPage = Number(pageButton.dataset.page);

            displayProducts();

            document.getElementById("products")?.scrollIntoView({
                behavior: "smooth"
            });
        }

        if (event.target.closest("#clear-filters")) {

            currentCategory = "All";
            currentFandom = "All";
            currentSearch = "";
            currentPage = 1;

            if (categoryFilter) {
                categoryFilter.value = "All";
            }

            if (searchInput) {
                searchInput.value = "";
            }

            fandomCards.forEach(button => {
                button.classList.remove("active");
            });

            displayProducts();
        }
    });

    // ==========================================
    // LOAD PRODUCTS FROM FIRESTORE
    // ==========================================

    const productsCollection = collection(db, "products");

    onSnapshot(
        productsCollection,

        snapshot => {

            products = snapshot.docs.map(documentSnapshot => {

                const data = documentSnapshot.data();

                const stock = Number(data.stock);

                return {
                    ...data,

                    id: Number(
                        data.id ?? documentSnapshot.id.replace("PROD", "")
                    ),

                    name: data.name || "",
                    description: data.description || "",
                    price: Number(data.price) || 0,
                    category: data.category || "",
                    fandom: data.fandom || "",
                    image: data.image || "",
                    featured: data.featured === true,

                    // Missing or invalid stock is treated as zero.

                    stock:
                        Number.isInteger(stock) && stock >= 0
                            ? stock
                            : 0
                };

            }).sort((a, b) => a.id - b.id);

            // Update featured products.

            featuredProducts = products.filter(
                product => product.featured
            );

            // Keep carousel index valid after updates.

            if (featuredIndex >= featuredProducts.length) {
                featuredIndex = 0;
            }

            // Refresh cart stock information from Firestore.

            cart = cart.map(item => {

                const latestProduct = getProduct(item.id);

                if (!latestProduct) {
                    return item;
                }

                return {
                    ...item,
                    stock: latestProduct.stock
                };
            });

            saveCart();
            updateCartCount();

            // Display latest products.

            displayProducts();
            displayFeatured();

            startCarousel();

            console.log(
                `Successfully loaded ${products.length} products from Firestore.`
            );
        },

        error => {

            console.error(
                "Error loading products from Firestore:",
                error
            );

            if (productList) {

                productList.innerHTML = `
                    <div class="no-products">
                        <h3>Unable to load products.</h3>
                        <p>Please refresh the page or try again later.</p>
                    </div>
                `;
            }

            if (featuredTrack) {
                featuredTrack.innerHTML = "";
            }

            if (pagination) {
                pagination.innerHTML = "";
            }
        }
    );

    // ==========================================
    // INITIALIZE WEBSITE
    // ==========================================

    updateCartCount();

    console.log("THE DRESSUP SOCIETY is ready!");

});
