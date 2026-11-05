import { icon } from "./icons.js";
import { escapeHtml, formatPrice, productUrl } from "./utils.js";
import { isOrderable, isSecondHand, conditionLabel, availabilityLabel } from "./product-service.js";
import { addToCart } from "./cart-store.js";
import { showToast } from "./common.js";

export function renderProductCard(product, { eager = false } = {}) {
    const orderable = isOrderable(product);
    const href = productUrl(product.id);
    const badges = [
        product.isDemo ? '<span class="badge badge--demo">Demo</span>' : "",
        !orderable ? `<span class="badge badge--sold">${escapeHtml(availabilityLabel(product))}</span>` : ""
    ].join("");

    const action = orderable
        ? `<button type="button" class="btn btn--primary btn--block" data-add-to-cart="${escapeHtml(product.id)}">${icon("cart", 18)} Add to cart</button>`
        : `<button type="button" class="btn btn--block" disabled>${escapeHtml(availabilityLabel(product))}</button>`;

    return `<article class="product-card${orderable ? "" : " is-unavailable"}">
        <a class="product-card__media" href="${href}" tabindex="-1" aria-hidden="true">
            <img src="${product.imageUrls[0]}" alt="${escapeHtml(product.imageAlt ?? product.name)}" width="800" height="600" loading="${eager ? "eager" : "lazy"}" decoding="async">
            <span class="product-card__badges">${badges}</span>
        </a>
        <div class="product-card__body">
            <p class="product-card__meta ${isSecondHand(product) ? "is-second-hand" : "is-new"}">${escapeHtml(conditionLabel(product))}</p>
            <h3 class="product-card__title"><a href="${href}">${escapeHtml(product.name)}</a></h3>
            <p class="product-card__price">${formatPrice(product.price)}</p>
            ${action}
        </div>
    </article>`;
}

// Delegated handler so cards rendered later keep working.
export function bindAddToCart(container) {
    container.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-add-to-cart]");
        if (!button || button.disabled) return;
        button.disabled = true;
        try {
            const result = await addToCart(button.dataset.addToCart, 1);
            showToast(result.message, result.ok ? "success" : "error");
        } catch {
            showToast("Could not update your cart. Please try again.", "error");
        } finally {
            button.disabled = false;
        }
    });
}
