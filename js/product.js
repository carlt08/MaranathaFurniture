import "./common.js";
import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import {
    getProductById, getRelatedProducts, getMaxQuantity, isOrderable, isSecondHand, conditionLabel, availabilityLabel
} from "./product-service.js";
import { renderProductCard, bindAddToCart } from "./product-card.js";
import { addToCart } from "./cart-store.js";
import { productEnquiryMessage, whatsappLink } from "./whatsapp.js";
import { escapeHtml, formatPrice, siteUrl, showError } from "./utils.js";

const root = document.getElementById("product-root");

function renderGallery(product) {
    const images = product.imageUrls;
    const alt = product.imageAlt ?? product.name;
    const slides = images.map((src, index) => `
        <figure class="gallery__slide">
            <img src="${src}" alt="${escapeHtml(index === 0 ? alt : `${alt} - detail view`)}" width="800" height="600" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        </figure>`).join("");

    if (images.length < 2) {
        return `<div class="gallery"><div class="gallery__viewport">${slides}</div></div>`;
    }

    const thumbs = images.map((src, index) => `
        <button type="button" class="gallery__thumb" data-thumb="${index}" aria-label="Show photo ${index + 1} of ${images.length}" ${index === 0 ? 'aria-current="true"' : ""}>
            <img src="${src}" alt="" width="96" height="72" loading="lazy">
        </button>`).join("");

    return `
        <div class="gallery" data-gallery>
            <div class="gallery__stage">
                <div class="gallery__viewport" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Product photos. Swipe or use arrow keys." data-gallery-track>${slides}</div>
                <button type="button" class="gallery__nav gallery__nav--prev" data-gallery-step="-1" aria-label="Previous photo">${icon("chevronLeft", 22)}</button>
                <button type="button" class="gallery__nav gallery__nav--next" data-gallery-step="1" aria-label="Next photo">${icon("chevronRight", 22)}</button>
                <p class="gallery__counter" data-gallery-counter>1 / ${images.length}</p>
            </div>
            <div class="gallery__thumbs">${thumbs}</div>
        </div>`;
}

function setupGallery() {
    const gallery = root.querySelector("[data-gallery]");
    if (!gallery) return;
    const track = gallery.querySelector("[data-gallery-track]");
    const thumbs = [...gallery.querySelectorAll("[data-thumb]")];
    const counter = gallery.querySelector("[data-gallery-counter]");
    const goTo = (index) => {
        const target = Math.max(0, Math.min(index, thumbs.length - 1));
        track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    };
    const currentIndex = () => Math.round(track.scrollLeft / track.clientWidth);

    let frame = 0;
    track.addEventListener("scroll", () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const index = currentIndex();
            thumbs.forEach((thumb, i) => (i === index ? thumb.setAttribute("aria-current", "true") : thumb.removeAttribute("aria-current")));
            counter.textContent = `${index + 1} / ${thumbs.length}`;
        });
    });
    gallery.addEventListener("click", (event) => {
        const thumb = event.target.closest("[data-thumb]");
        const step = event.target.closest("[data-gallery-step]");
        if (thumb) goTo(Number(thumb.dataset.thumb));
        if (step) goTo(currentIndex() + Number(step.dataset.galleryStep));
    });
    track.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(currentIndex() + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(currentIndex() - 1); }
    });
}

function renderPurchase(product) {
    const enquiry = `<a class="btn btn--whatsapp btn--block" href="${whatsappLink(productEnquiryMessage(product))}" target="_blank" rel="noopener">${icon("whatsapp", 20)} WhatsApp enquiry</a>`;

    if (!isOrderable(product)) {
        return `<div class="purchase">
            <p class="notice notice--warning"><strong>${escapeHtml(availabilityLabel(product))}.</strong> This item cannot be added to the cart. Ask us about similar items.</p>
            <button type="button" class="btn btn--block" disabled>Not available</button>
            ${enquiry}
        </div>`;
    }

    const max = getMaxQuantity(product);
    const limitNote = max === 1
        ? `<p class="purchase__note">${isSecondHand(product) ? "Second-hand items are single pieces" : "Only one is available"}, so the quantity is limited to 1.</p>`
        : Number.isFinite(max) ? `<p class="purchase__note">Up to ${max} can be ordered.</p>` : "";

    return `<div class="purchase">
        <div class="purchase__row">
            <div class="qty" data-qty>
                <button type="button" class="qty__btn" data-qty-step="-1" aria-label="Decrease quantity" ${max === 1 ? "disabled" : ""}>${icon("minus", 20)}</button>
                <label class="sr-only" for="quantity">Quantity</label>
                <input id="quantity" class="qty__input" type="number" inputmode="numeric" min="1" max="${max}" value="1" ${max === 1 ? "readonly" : ""}>
                <button type="button" class="qty__btn" data-qty-step="1" aria-label="Increase quantity" ${max === 1 ? "disabled" : ""}>${icon("plus", 20)}</button>
            </div>
            <button type="button" class="btn btn--primary btn--large purchase__add" data-add>${icon("cart", 20)} Add to cart</button>
        </div>
        ${limitNote}
        <p class="purchase__message" role="status" data-cart-message></p>
        ${enquiry}
    </div>`;
}

function setupPurchase(product) {
    const input = root.querySelector("#quantity");
    const addButton = root.querySelector("[data-add]");
    if (!input || !addButton) return;
    const max = getMaxQuantity(product);
    const message = root.querySelector("[data-cart-message]");

    const clamp = () => {
        const value = Math.floor(Number(input.value)) || 1;
        input.value = String(Math.max(1, Math.min(value, max)));
        return Number(input.value);
    };
    root.querySelectorAll("[data-qty-step]").forEach((button) => {
        button.addEventListener("click", () => {
            input.value = String(Number(input.value || 1) + Number(button.dataset.qtyStep));
            clamp();
        });
    });
    input.addEventListener("change", clamp);

    addButton.addEventListener("click", async () => {
        addButton.disabled = true;
        const result = await addToCart(product.id, clamp());
        message.className = `purchase__message ${result.ok ? "is-success" : "is-error"}`;
        message.innerHTML = `${escapeHtml(result.message)}${result.ok ? ` <a href="${siteUrl("pages/cart.html")}">View cart</a>` : ""}`;
        addButton.disabled = false;
    });
}

function renderProduct(product) {
    document.title = `${product.name} | ${CONFIG.businessName}`;
    const orderable = isOrderable(product);
    const demoNotice = product.isDemo
        ? `<p class="notice notice--demo"><strong>Demonstration listing.</strong> The photos are stock images and this item is not real stock. Prices and details are placeholders.</p>`
        : "";

    root.innerHTML = `
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <ol>
                <li><a href="${siteUrl("index.html")}">Home</a></li>
                <li><a href="${siteUrl("pages/shop.html")}">Shop</a></li>
                <li><a href="${siteUrl("pages/shop.html")}?category=${product.categoryId}">${escapeHtml(product.category)}</a></li>
            </ol>
        </nav>
        <div class="product-detail">
            ${renderGallery(product)}
            <div class="product-info">
                <p class="product-info__badges">
                    <span class="badge ${isSecondHand(product) ? "badge--second-hand" : "badge--new"}">${escapeHtml(conditionLabel(product))}</span>
                    <span class="badge ${orderable ? "badge--available" : "badge--sold"}">${escapeHtml(availabilityLabel(product))}</span>
                    ${product.isDemo ? '<span class="badge badge--demo">Demo listing</span>' : ""}
                </p>
                <h1 class="product-info__title">${escapeHtml(product.name)}</h1>
                <p class="product-info__sku">SKU: <span>${escapeHtml(product.sku)}</span></p>
                <p class="product-info__price">${formatPrice(product.price)}</p>
                <p class="product-info__description">${escapeHtml(product.fullDescription ?? product.description)}</p>
                <dl class="spec-list">
                    <div><dt>Category</dt><dd>${escapeHtml(product.category)}</dd></div>
                    <div><dt>Condition</dt><dd>${escapeHtml(conditionLabel(product))}</dd></div>
                    <div><dt>Dimensions</dt><dd>${escapeHtml(product.dimensions ?? "Please enquire")}</dd></div>
                    <div><dt>Availability</dt><dd>${escapeHtml(availabilityLabel(product))}</dd></div>
                </dl>
                ${renderPurchase(product)}
                ${demoNotice}
                <p class="notice">Stock and delivery cost are confirmed by our staff before any payment is made.</p>
            </div>
        </div>
        <section class="section section--tight" aria-labelledby="related-title" data-related hidden>
            <h2 id="related-title" class="section-title">You may also like</h2>
            <div class="product-grid" data-related-grid></div>
        </section>`;

    setupGallery();
    setupPurchase(product);
    loadRelated(product);
}

async function loadRelated(product) {
    try {
        const related = await getRelatedProducts(product, 4);
        if (!related.length) return;
        const grid = root.querySelector("[data-related-grid]");
        grid.innerHTML = related.map((item) => renderProductCard(item)).join("");
        bindAddToCart(grid);
        root.querySelector("[data-related]").hidden = false;
    } catch {
        // Related products are optional; the main product is already shown.
    }
}

function renderNotFound(message) {
    document.title = `Product not found | ${CONFIG.businessName}`;
    root.innerHTML = `
        <div class="state state--empty">
            <h1 class="state__title">Product not found</h1>
            <p>${escapeHtml(message)}</p>
            <a class="btn btn--primary" href="${siteUrl("pages/shop.html")}">Browse all furniture</a>
        </div>`;
}

async function init() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) {
        renderNotFound("No product was selected. Please choose an item from the shop.");
        return;
    }
    try {
        const product = await getProductById(id);
        if (!product) {
            renderNotFound("We could not find that product. It may have been removed.");
            return;
        }
        renderProduct(product);
    } catch (error) {
        showError(root, error.message);
        root.querySelector("[data-retry]").addEventListener("click", init);
    }
}

init();
