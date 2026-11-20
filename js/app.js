
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // THE DRESSUP SOCIETY - COSPLAY PRODUCTS
    // ==========================================

    const products = [
        {
            id: 1,
            name: "Raiden Shogun Costume Set",
            description: "Purple character costume with matching wig and footwear.",
            price: 2499,
            category: "Costumes",
            fandom: "Games",
            image: "https://down-ph.img.susercontent.com/file/ph-11134207-7r992-lld6vmmom20z4d",
            featured: true
        },
        {
            id: 2,
            name: "Pink Twin-Tail Cosplay Wig",
            description: "Long pastel-pink wig with styled twin tails and bangs.",
            price: 1299,
            category: "Wigs",
            fandom: "Anime",
            image: "https://cossky.com/cdn/shop/products/1068c6e1d5d778b772db58f44bfbe67f_1600x.jpg?v=1685009764",
            featured: true
        },
        {
            id: 3,
            name: "Tifa Inspired Cosplay Boots",
            description: "Red lace-up boots with black detailing.",
            price: 2199,
            category: "Shoes",
            fandom: "Games",
            image: "https://skycosplay.de/cdn/shop/files/40A347.png?v=1703044362",
            featured: true
        },
        {
            id: 4,
            name: "Floral Cosplay Hair Clips",
            description: "Decorative embroidered flowers with gold-tone leaves.",
            price: 499,
            category: "Accessories",
            fandom: "Anime",
            image: "https://5ggen.jp/upload/53/0307f0c22da80fb26b493fd7324d88.jpg"
        },
        {
            id: 5,
            name: "Fantasy Staff and Sword Props",
            description: "Decorative staff and sword pieces for fantasy cosplay.",
            price: 1899,
            category: "Props",
            fandom: "Games",
            image: "https://cosplaysparks.com/cdn/shop/files/CasterMerlinStaffCosplayBuy.jpg?v=1756983495&width=1445"
        },
        {
            id: 6,
            name: "Theatrical Makeup Kit",
            description: "Face and stage makeup colours with brushes and applicators.",
            price: 899,
            category: "Makeup",
            fandom: "Movies",
            image: "https://www.treasurehouseofmakeup.co.uk/media/catalog/product/cache/c8c5004cc32a48c8cae8987b42140eb6/t/h/theatrical-cake-kit_3.jpg"
        },
        {
            id: 7,
            name: "Cosplay DIY Craft Kit",
            description: "Foam, adhesives and tools for creating costume props.",
            price: 799,
            category: "DIY Supplies",
            fandom: "Manga",
            image: "https://m.media-amazon.com/images/I/819YY1V3xlL._AC_SL1500_.jpg"
        },
        {
            id: 8,
            name: "Tanjiro Anime Collectible",
            description: "Character display figure inspired by Demon Slayer.",
            price: 1599,
            category: "Collectibles",
            fandom: "Anime",
            image: "https://collectiblepilot.com/assets/images/products/aniplex-demon-slayer-tanjiro-figure/aniplex-demon-slayer-tanjiro-figure-3.webp"
        }
    ];


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


    // Check whether the visitor has already selected a theme.

    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
        savedTheme = null;
    }


    // Use the computer's theme preference on the first visit.

    const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme =
        savedTheme === "dark" || savedTheme === "light"
            ? savedTheme
            : systemPrefersDark
                ? "dark"
                : "light";


    // Apply the initial theme.

    applyTheme(initialTheme);


    // Switch themes when the visitor clicks the button.

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


    // ==========================================
    // ADD TO SHOPPING BAG
    // ==========================================

    function addToCart(productId, button) {

        const product = getProduct(productId);

        if (!product) return;

        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                image: product.image,
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

                        <div class="product-bottom">

                            <strong>${formatPrice(product.price)}</strong>

                            <button
                                type="button"
                                class="add-to-cart"
                                data-product-id="${product.id}"
                            >
                                ADD TO BAG +
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

    const featuredProducts = products.filter(product => product.featured);


    function displayFeatured() {

        if (!featuredTrack || featuredProducts.length === 0) return;

        const product = featuredProducts[featuredIndex];

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

                    <strong>${formatPrice(product.price)}</strong>

                    <button
                        type="button"
                        class="add-to-cart featured-add"
                        data-product-id="${product.id}"
                    >
                        ADD TO BAG +
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

        featuredIndex += direction;

        if (featuredIndex >= featuredProducts.length) {
            featuredIndex = 0;
        }

        if (featuredIndex < 0) {
            featuredIndex = featuredProducts.length - 1;
        }

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

        carouselTimer = setInterval(() => {
            changeFeatured(1);
        }, 5000);
    }


    startCarousel();

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

            document.getElementById("products").scrollIntoView({
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

            document.getElementById("products").scrollIntoView({
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

            addToCart(
                addButton.dataset.productId,
                addButton
            );
        }


        const pageButton = event.target.closest("[data-page]");

        if (pageButton) {

            currentPage = Number(pageButton.dataset.page);

            displayProducts();

            document.getElementById("products").scrollIntoView({
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
    // INITIALIZE WEBSITE
    // ==========================================

    updateCartCount();

    displayProducts();

    displayFeatured();

    console.log("THE DRESSUP SOCIETY is ready!");

});
