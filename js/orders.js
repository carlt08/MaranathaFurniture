import { CONFIG } from "./config.js";
import { formatPrice, readStorage, writeStorage } from "./utils.js";
import { conditionLabel } from "./product-service.js";

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No look-alike characters (0/O, 1/I/L).
const SUBMIT_TIMEOUT_MS = 15000;

export function generateOrderReference(date = new Date()) {
    const stamp = [date.getFullYear() % 100, date.getMonth() + 1, date.getDate()]
        .map((part) => String(part).padStart(2, "0"))
        .join("");
    const random = crypto.getRandomValues(new Uint32Array(6));
    const suffix = Array.from(random, (value) => REFERENCE_ALPHABET[value % REFERENCE_ALPHABET.length]).join("");
    return `MF-${stamp}-${suffix}`;
}

// items: resolved cart items ({ product, quantity, lineTotal })
export function buildOrder(customer, items) {
    return {
        reference: generateOrderReference(),
        createdAt: new Date().toISOString(),
        customer,
        items: items.map(({ product, quantity, lineTotal }) => ({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            condition: conditionLabel(product),
            unitPrice: product.price,
            quantity,
            lineTotal,
            isDemo: Boolean(product.isDemo)
        })),
        subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
        deliveryCost: "To be confirmed by staff",
        finalAmount: "To be confirmed by staff",
        isDemo: items.some(({ product }) => product.isDemo),
        submitted: false
    };
}

export function orderToText(order) {
    const { customer } = order;
    const lines = [
        `Order request ${order.reference}`,
        "",
        `Name: ${customer.fullName}`,
        `Contact number: ${customer.phone}`,
        `Email: ${customer.email}`,
        `Method: ${customer.fulfilment === "delivery" ? "Delivery" : "Collection"}`
    ];
    if (customer.fulfilment === "delivery") lines.push(`Delivery address: ${customer.address}`);
    if (customer.town) lines.push(`Town / suburb: ${customer.town}`);
    if (customer.instructions) lines.push(`Instructions: ${customer.instructions}`);
    lines.push("", "Items:");
    order.items.forEach((item) => {
        lines.push(`- ${item.name} (SKU: ${item.sku}) x ${item.quantity} @ ${formatPrice(item.unitPrice)} = ${formatPrice(item.lineTotal)}`);
    });
    lines.push("", `Subtotal: ${formatPrice(order.subtotal)}`, `Delivery cost: ${order.deliveryCost}`, `Final amount: ${order.finalAmount}`);
    if (order.isDemo) lines.push("", "NOTE: contains demonstration listings.");
    return lines.join("\n");
}

// Posts JSON to the configured endpoint (FormSubmit / Formspree). Never reports success unless the endpoint accepted it.
export async function submitOrder(order) {
    if (!CONFIG.orderEndpoint) {
        return { status: "not-configured" };
    }

    const { customer } = order;
    const payload = {
        _subject: `${CONFIG.businessName} order request ${order.reference}`,
        _gotcha: "",
        orderReference: order.reference,
        name: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        fulfilment: customer.fulfilment,
        address: customer.address || "",
        town: customer.town || "",
        instructions: customer.instructions || "",
        subtotal: formatPrice(order.subtotal),
        message: orderToText(order)
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
        const response = await fetch(CONFIG.orderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        if (!response.ok) {
            return { status: "failed", message: `The order service responded with an error (HTTP ${response.status}).` };
        }
        return { status: "submitted" };
    } catch (error) {
        const timedOut = error.name === "AbortError";
        return { status: "failed", message: timedOut ? "The order service took too long to respond." : "The order could not be sent. Please check your connection." };
    } finally {
        clearTimeout(timer);
    }
}

export function saveSubmittedOrder(order) {
    return writeStorage(CONFIG.storageKeys.lastOrder, { ...order, submitted: true });
}

export function loadSubmittedOrder(reference) {
    const order = readStorage(CONFIG.storageKeys.lastOrder, null);
    if (!order || order.submitted !== true || order.reference !== reference) return null;
    return order;
}
