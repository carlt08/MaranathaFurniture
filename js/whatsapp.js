import { CONFIG } from "./config.js";
import { formatPrice, productUrl } from "./utils.js";
import { conditionLabel } from "./product-service.js";

export function whatsappLink(message = "") {
    const base = `https://wa.me/${CONFIG.whatsapp}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const generalEnquiryMessage = () =>
    `Hello ${CONFIG.businessName}, I would like to enquire about your furniture.`;

export function productEnquiryMessage(product) {
    const lines = [
        `Hello ${CONFIG.businessName}, I would like to enquire about this item:`,
        "",
        `Product: ${product.name}`,
        `SKU: ${product.sku}`,
        `Condition: ${conditionLabel(product)}`,
        `Listed price: ${formatPrice(product.price)}`,
        `Link: ${productUrl(product.id)}`
    ];
    if (product.isDemo) {
        lines.push("", "(This is a demonstration listing on the website.)");
    }
    lines.push("", "Is it still available?");
    return lines.join("\n");
}

// items: resolved cart items ({ product, quantity, lineTotal })
export function cartEnquiryMessage(items, subtotal) {
    const lines = [`Hello ${CONFIG.businessName}, I would like to enquire about the items in my cart:`, ""];
    items.forEach(({ product, quantity, lineTotal }) => {
        lines.push(`- ${product.name} (SKU: ${product.sku}) x ${quantity} = ${formatPrice(lineTotal)}`);
    });
    lines.push("", `Subtotal: ${formatPrice(subtotal)}`, "Delivery cost: to be confirmed", "", "Please confirm availability and delivery.");
    return lines.join("\n");
}
