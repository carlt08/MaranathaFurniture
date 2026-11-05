import "./common.js";
import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import { resolveCart, setCartQuantity, removeFromCart, isCartPayable, calculateSubtotal } from "./cart-store.js";
import { getMaxQuantity, conditionLabel } from "./product-service.js";
import { cartEnquiryMessage, whatsappLink } from "./whatsapp.js";
import { escapeHtml, formatPrice, productUrl, siteUrl, showError } from "./utils.js";

const root = document.getElementById("cart-root");

const ISSUE_MESSAGES = {
    missing: "This product is no longer in our catalogue. Please remove it.",
    unavailable: "This item is no longer available to order. Please remove it.",
    adjusted: "Quantity was reduced to the amount currently available."
};

function renderItem({ productId, quantity, product, issue, lineTotal }) {
    if (!product) {
        return `<li class="cart-item has-issue" data-id="${escapeHtml(productId)}">
            <div class="cart-item__details">
                <p class="cart-item__title">Unknown product</p>
                <p class="cart-item__issue" role="alert">${ISSUE_MESSAGES.missing}</p>
            </div>
            <button type="button" class="btn btn--outline btn--small" data-remove>${icon("trash", 18)} Remove</button>
        </li>`;
    }

    const blocked = issue === "unavailable";
    const max = getMaxQuantity(product);
    const href = productUrl(product.id);
    const controls = blocked ? "" : `
        <div class="qty qty--small">
            <button type="button" class="qty__btn" data-step="-1" aria-label="Decrease quantity of ${escapeHtml(product.name)}" ${quantity <= 1 ? "disabled" : ""}>${icon("minus", 18)}</button>
            <span class="qty__value" aria-live="polite" aria-label="Quantity">${quantity}</span>
            <button type="button" class="qty__btn" data-step="1" aria-label="Increase quantity of ${escapeHtml(product.name)}" ${quantity >= max ? "disabled" : ""}>${icon("plus", 18)}</button>
        </div>
        <p class="cart-item__total">${formatPrice(lineTotal)}</p>`;

    return `<li class="cart-item${issue ? " has-issue" : ""}" data-id="${escapeHtml(product.id)}">
        <a class="cart-item__image" href="${href}"><img src="${product.imageUrls[0]}" alt="${escapeHtml(product.imageAlt ?? product.name)}" width="800" height="600" loading="lazy"></a>
        <div class="cart-item__details">
            <h2 class="cart-item__title"><a href="${href}">${escapeHtml(product.name)}</a></h2>
            <p class="cart-item__meta">SKU: ${escapeHtml(product.sku)} &middot; ${escapeHtml(conditionLabel(product))}${product.isDemo ? " &middot; Demo" : ""}</p>
            <p class="cart-item__price">${formatPrice(product.price)} each</p>
            ${!blocked && max === quantity && max === 1 ? '<p class="cart-item__note">Single piece</p>' : ""}
            ${issue ? `<p class="cart-item__issue" role="alert">${ISSUE_MESSAGES[issue]}</p>` : ""}
        </div>
        <div class="cart-item__controls">${controls}
            <button type="button" class="link-btn" data-remove aria-label="Remove ${escapeHtml(product.name)} from cart">${icon("trash", 18)} Remove</button>
        </div>
    </li>`;
}

function renderCart(items) {
    if (!items.length) {
        root.innerHTML = `
            <div class="state state--empty">
                <p class="state__title">Your cart is empty</p>
                <p>Browse our new and second-hand furniture and add items you like.</p>
                <a class="btn btn--primary" href="${siteUrl("pages/shop.html")}">Start shopping</a>
            </div>`;
        return;
    }

    const payable = isCartPayable(items);
    const valid = items.filter((item) => item.product && item.issue !== "unavailable" && item.issue !== "missing");
    const subtotal = calculateSubtotal(items);
    const hasDemo = items.some((item) => item.product?.isDemo);
    const checkoutAction = payable
        ? `<a class="btn btn--primary btn--large btn--block" href="${siteUrl("pages/checkout.html")}">Proceed to checkout ${icon("arrowRight", 20)}</a>`
        : `<button type="button" class="btn btn--large btn--block" disabled>Remove unavailable items to continue</button>`;

    root.innerHTML = `
        <div class="cart-layout">
            <ul class="cart-list" aria-label="Items in your cart">${items.map(renderItem).join("")}</ul>
            <aside class="cart-summary" aria-labelledby="summary-title">
                <h2 id="summary-title">Order summary</h2>
                <dl class="summary-list">
                    <div><dt>Subtotal</dt><dd>${formatPrice(subtotal)}</dd></div>
                    <div><dt>Delivery</dt><dd>To be confirmed</dd></div>
                    <div class="summary-list__total"><dt>Final amount</dt><dd>To be confirmed</dd></div>
                </dl>
                <p class="notice">Our staff confirm stock and delivery cost before you pay. Payment is by EFT after confirmation.</p>
                ${hasDemo || CONFIG.demoMode ? '<p class="notice notice--demo">Demonstration mode: items in this cart are demonstration listings.</p>' : ""}
                ${checkoutAction}
                ${valid.length ? `<a class="btn btn--whatsapp btn--block" href="${whatsappLink(cartEnquiryMessage(valid, subtotal))}" target="_blank" rel="noopener">${icon("whatsapp", 20)} Enquire on WhatsApp</a>` : ""}
                <a class="btn btn--outline btn--block" href="${siteUrl("pages/shop.html")}">Continue shopping</a>
            </aside>
        </div>`;
}

async function refresh(focusTarget) {
    try {
        renderCart(await resolveCart());
        if (focusTarget) {
            const { id, selector } = focusTarget;
            const target = root.querySelector(`[data-id="${CSS.escape(id)}"] ${selector}:not([disabled])`) ?? root.querySelector("h2, a, button");
            target?.focus();
        }
    } catch (error) {
        showError(root, error.message);
        root.querySelector("[data-retry]").addEventListener("click", () => refresh());
    }
}

root.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-id]");
    if (!row) return;
    const id = row.dataset.id;

    if (event.target.closest("[data-remove]")) {
        removeFromCart(id);
        await refresh();
        document.getElementById("cart-heading")?.focus();
        return;
    }

    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
        const current = Number(row.querySelector(".qty__value").textContent);
        await setCartQuantity(id, current + Number(stepButton.dataset.step));
        await refresh({ id, selector: `[data-step="${stepButton.dataset.step}"]` });
    }
});

refresh();
