import "./common.js";
import { getCategories, getFeaturedProducts } from "./product-service.js";
import { renderProductCard, bindAddToCart } from "./product-card.js";
import { escapeHtml, siteUrl, showError } from "./utils.js";
import { icon } from "./icons.js";

const categoryHost = document.getElementById("category-grid");
const featuredHost = document.getElementById("featured-grid");

function renderCategories(categories) {
    categoryHost.innerHTML = categories.map((category) => `
        <a class="category-card" href="${siteUrl("pages/shop.html")}?category=${category.id}">
            <img src="${category.imageUrl}" alt="${escapeHtml(category.imageAlt ?? category.name)}" width="640" height="480" loading="lazy" decoding="async">
            <span class="category-card__label">${escapeHtml(category.name)} ${icon("arrowRight", 18)}</span>
        </a>`).join("");
}

async function init() {
    try {
        const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(6)]);
        renderCategories(categories);
        featuredHost.innerHTML = featured.map((product) => renderProductCard(product)).join("");
        bindAddToCart(featuredHost);
    } catch (error) {
        [categoryHost, featuredHost].forEach((host) => {
            host.classList.remove("category-grid", "product-grid");
            showError(host, error.message);
            host.querySelector("[data-retry]").addEventListener("click", () => location.reload());
        });
    }
}

init();
