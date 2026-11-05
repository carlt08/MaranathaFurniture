import "./common.js";
import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import { resolveCart, isCartPayable, calculateSubtotal, clearCart } from "./cart-store.js";
import { conditionLabel } from "./product-service.js";
import { buildOrder, submitOrder, saveSubmittedOrder, orderToText } from "./orders.js";
import { validateForm, required, phoneRule, emailRule } from "./forms.js";
import { whatsappLink } from "./whatsapp.js";
import { escapeHtml, formatPrice, siteUrl } from "./utils.js";

const loading = document.querySelector("[data-checkout-loading]");
const empty = document.querySelector("[data-checkout-empty]");
const content = document.querySelector("[data-checkout-content]");
const summary = document.querySelector("[data-order-summary]");
const form = document.getElementById("checkout-form");
const deliveryFields = document.querySelector("[data-delivery-fields]");
const resultBox = document.querySelector("[data-submit-result]");
const submitButton = form.querySelector("[type=submit]");

let cartItems = [];

function renderSummary(items) {
    const rows = items.map(({ product, quantity, lineTotal }) => `
        <li class="summary-item">
            <img src="${product.imageUrls[0]}" alt="" width="64" height="48" loading="lazy">
            <div class="summary-item__info">
                <p class="summary-item__name">${escapeHtml(product.name)}</p>
                <p class="summary-item__meta">SKU: ${escapeHtml(product.sku)} &middot; ${escapeHtml(conditionLabel(product))}</p>
                <p class="summary-item__meta">${quantity} &times; ${formatPrice(product.price)}</p>
            </div>
            <p class="summary-item__total">${formatPrice(lineTotal)}</p>
        </li>`).join("");
    const hasDemo = items.some(({ product }) => product.isDemo);

    summary.innerHTML = `
        <h2 id="summary-title">Your order</h2>
        <ul class="summary-items">${rows}</ul>
        <dl class="summary-list">
            <div><dt>Subtotal</dt><dd>${formatPrice(calculateSubtotal(items))}</dd></div>
            <div><dt>Delivery cost</dt><dd>To be confirmed</dd></div>
            <div class="summary-list__total"><dt>Final amount</dt><dd>To be confirmed</dd></div>
        </dl>
        <p class="notice">Stock and delivery charges must be confirmed by our staff before you pay. Payment is by EFT after confirmation; we will send banking details.</p>
        ${hasDemo || CONFIG.demoMode ? '<p class="notice notice--demo"><strong>Demonstration mode.</strong> These are demonstration listings, so an order for them cannot be fulfilled.</p>' : ""}
        <a class="link-btn" href="${siteUrl("pages/cart.html")}">Edit cart</a>`;
}

function syncFulfilment() {
    const method = form.elements.fulfilment.value;
    deliveryFields.hidden = method !== "delivery";
    form.elements.address.required = method === "delivery";
    form.elements.town.required = method === "delivery";
}

const rules = {
    fullName: (value) => (value.length >= 2 ? "" : "Please enter your full name."),
    phone: phoneRule,
    email: emailRule,
    fulfilment: (value) => (value ? "" : "Please choose delivery or collection."),
    address: (value, all) => (all.fulfilment === "delivery" ? required("your delivery address")(value) : ""),
    town: (value, all) => (all.fulfilment === "delivery" ? required("your town or suburb")(value) : ""),
    instructions: (value) => (value.length <= 500 ? "" : "Please keep instructions under 500 characters.")
};

function showResult(html, type) {
    resultBox.className = `notice notice--${type}`;
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function whatsappFallback(order) {
    return `<a class="btn btn--whatsapp btn--block" href="${whatsappLink(orderToText(order))}" target="_blank" rel="noopener">${icon("whatsapp", 20)} Send this order on WhatsApp</a>`;
}

async function handleSubmit(event) {
    event.preventDefault();
    if (form.elements.website.value) return; // Honeypot field filled in by a bot.

    resultBox.hidden = true;
    const { valid, values } = validateForm(form, rules);
    if (!valid) return;

    const order = buildOrder(
        {
            fullName: values.fullName,
            phone: values.phone,
            email: values.email,
            fulfilment: values.fulfilment,
            address: values.fulfilment === "delivery" ? values.address : "",
            town: values.town ?? "",
            instructions: values.instructions ?? ""
        },
        cartItems
    );

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    const outcome = await submitOrder(order);
    submitButton.disabled = false;
    submitButton.innerHTML = "Send order request";

    if (outcome.status === "submitted") {
        saveSubmittedOrder(order);
        clearCart();
        location.assign(`${siteUrl("pages/order-confirmation.html")}?ref=${encodeURIComponent(order.reference)}`);
        return;
    }

    if (outcome.status === "not-configured") {
        showResult(
            `<p><strong>Your order has not been sent.</strong></p>
            <p>Online order submission is not set up on this website yet, so we have not received this request. Please send it to us on WhatsApp instead. Your details below are kept, and your cart is unchanged.</p>
            <p>Reference for this request: <strong>${escapeHtml(order.reference)}</strong></p>
            ${whatsappFallback(order)}`,
            "warning"
        );
        return;
    }

    showResult(
        `<p><strong>Your order has not been sent.</strong></p>
        <p>${escapeHtml(outcome.message)} Please try again, or send the order on WhatsApp.</p>
        ${whatsappFallback(order)}`,
        "error"
    );
}

async function init() {
    try {
        cartItems = await resolveCart();
    } catch {
        loading.textContent = "We could not load your cart. Please refresh the page.";
        return;
    }
    loading.hidden = true;

    if (!cartItems.length) {
        empty.hidden = false;
        return;
    }
    if (!isCartPayable(cartItems)) {
        document.querySelector("[data-checkout-blocked]").hidden = false;
        return;
    }

    renderSummary(cartItems);
    content.hidden = false;
    syncFulfilment();
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("change", (event) => {
        if (event.target.name === "fulfilment") syncFulfilment();
    });
}

init();
