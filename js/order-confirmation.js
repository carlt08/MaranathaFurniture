import "./common.js";
import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import { loadSubmittedOrder } from "./orders.js";
import { whatsappLink } from "./whatsapp.js";
import { escapeHtml, formatPrice, siteUrl } from "./utils.js";

const root = document.getElementById("confirmation-root");

function renderMissing() {
    root.innerHTML = `
        <div class="state state--empty">
            <h2 class="state__title">No submitted order found</h2>
            <p>We could not find an order request that was sent from this device. If you were trying to place an order, please go back to your cart and try again, or contact us on WhatsApp.</p>
            <div class="state__actions">
                <a class="btn btn--primary" href="${siteUrl("pages/cart.html")}">Go to cart</a>
                <a class="btn btn--whatsapp" href="${whatsappLink(`Hello ${CONFIG.businessName}, I would like help with an order.`)}" target="_blank" rel="noopener">${icon("whatsapp", 20)} WhatsApp us</a>
            </div>
        </div>`;
}

function renderOrder(order) {
    const { customer } = order;
    const rows = order.items.map((item) => `
        <li class="summary-item">
            <div class="summary-item__info">
                <p class="summary-item__name">${escapeHtml(item.name)}</p>
                <p class="summary-item__meta">SKU: ${escapeHtml(item.sku)} &middot; ${escapeHtml(item.condition)}</p>
                <p class="summary-item__meta">${item.quantity} &times; ${formatPrice(item.unitPrice)}</p>
            </div>
            <p class="summary-item__total">${formatPrice(item.lineTotal)}</p>
        </li>`).join("");

    const details = [
        ["Name", customer.fullName],
        ["Contact number", customer.phone],
        ["Email", customer.email],
        ["Method", customer.fulfilment === "delivery" ? "Delivery" : "Collection"],
        customer.fulfilment === "delivery" ? ["Delivery address", customer.address] : null,
        customer.town ? ["Town / suburb", customer.town] : null,
        customer.instructions ? ["Instructions", customer.instructions] : null
    ].filter(Boolean).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");

    const followUp = whatsappLink(`Hello ${CONFIG.businessName}, I sent order request ${order.reference}. I would like to follow up.`);

    root.innerHTML = `
        <div class="confirmation">
            <div class="confirmation__banner">
                <span class="confirmation__icon">${icon("check", 28)}</span>
                <div>
                    <h2>Your order request has been sent</h2>
                    <p>Thank you, ${escapeHtml(customer.fullName.split(" ")[0])}. This is a request, not a confirmed sale or payment.</p>
                </div>
            </div>
            <p class="reference">Order reference <strong>${escapeHtml(order.reference)}</strong></p>
            ${order.isDemo ? '<p class="notice notice--demo"><strong>Demonstration mode.</strong> This order contained demonstration listings and cannot be fulfilled.</p>' : ""}

            <div class="confirmation__grid">
                <section class="card" aria-labelledby="items-title">
                    <h2 id="items-title">Order summary</h2>
                    <ul class="summary-items">${rows}</ul>
                    <dl class="summary-list">
                        <div><dt>Subtotal</dt><dd>${formatPrice(order.subtotal)}</dd></div>
                        <div><dt>Delivery cost</dt><dd>${escapeHtml(order.deliveryCost)}</dd></div>
                        <div class="summary-list__total"><dt>Final amount</dt><dd>${escapeHtml(order.finalAmount)}</dd></div>
                    </dl>
                </section>
                <section class="card" aria-labelledby="details-title">
                    <h2 id="details-title">Your details</h2>
                    <dl class="detail-list">${details}</dl>
                </section>
            </div>

            <section class="card" aria-labelledby="next-title">
                <h2 id="next-title">What happens next</h2>
                <ol class="steps">
                    <li>Our staff check that the items are still in stock and confirm the delivery cost, if any.</li>
                    <li>We contact you on the number or email you supplied to confirm the final amount.</li>
                    <li>Once confirmed, we send our banking details. Payment is by EFT and is checked manually by our staff.</li>
                    <li>We then arrange collection or delivery with you.</li>
                </ol>
                <p>Keep your order reference handy when you contact us.</p>
                <div class="state__actions">
                    <a class="btn btn--whatsapp" href="${followUp}" target="_blank" rel="noopener">${icon("whatsapp", 20)} Follow up on WhatsApp</a>
                    <a class="btn btn--outline" href="${siteUrl("pages/shop.html")}">Continue shopping</a>
                </div>
            </section>
        </div>`;
}

const reference = new URLSearchParams(location.search).get("ref") ?? "";
const order = reference ? loadSubmittedOrder(reference) : null;
if (order) renderOrder(order);
else renderMissing();
