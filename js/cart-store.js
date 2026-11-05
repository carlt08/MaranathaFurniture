import { CONFIG } from "./config.js";
import { readStorage, writeStorage } from "./utils.js";
import { getProductById, getMaxQuantity, isOrderable } from "./product-service.js";

const CHANGE_EVENT = "maranatha:cart-change";
let memoryCart = null; // Used only if LocalStorage is unavailable.

function readCart() {
    if (memoryCart) return memoryCart;
    const stored = readStorage(CONFIG.storageKeys.cart, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter(
        (item) => item && typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0
    );
}

function saveCart(items) {
    if (!writeStorage(CONFIG.storageKeys.cart, items)) {
        memoryCart = items;
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function onCartChange(callback) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener("storage", (event) => {
        if (event.key === CONFIG.storageKeys.cart) callback();
    });
}

export const getCartCount = () => readCart().reduce((total, item) => total + item.quantity, 0);

export async function addToCart(productId, quantity = 1) {
    const product = await getProductById(productId);
    if (!product) return { ok: false, message: "This product could not be found." };
    if (!isOrderable(product)) return { ok: false, message: `${product.name} is not available to order.` };

    const max = getMaxQuantity(product);
    const items = readCart();
    const existing = items.find((item) => item.productId === productId);
    const currentQuantity = existing?.quantity ?? 0;

    if (currentQuantity >= max) {
        return {
            ok: false,
            message: max === 1
                ? "This item is a single piece and is already in your cart."
                : `You already have the maximum available quantity (${max}) in your cart.`
        };
    }

    const newQuantity = Math.min(currentQuantity + quantity, max);
    const clamped = currentQuantity + quantity > max;
    if (existing) {
        existing.quantity = newQuantity;
    } else {
        items.push({ productId, quantity: newQuantity });
    }
    saveCart(items);

    return {
        ok: true,
        product,
        quantity: newQuantity,
        message: clamped
            ? `Quantity limited to ${max} for ${product.name}.`
            : `${product.name} added to your cart.`
    };
}

export async function setCartQuantity(productId, quantity) {
    const product = await getProductById(productId);
    const items = readCart();
    const item = items.find((entry) => entry.productId === productId);
    if (!item) return;
    const max = product ? getMaxQuantity(product) : item.quantity;
    item.quantity = Math.max(1, Math.min(Math.floor(quantity) || 1, Math.max(max, 1)));
    saveCart(items);
}

export function removeFromCart(productId) {
    saveCart(readCart().filter((item) => item.productId !== productId));
}

export function clearCart() {
    saveCart([]);
}

// Joins stored { productId, quantity } with live product data and flags problems.
export async function resolveCart() {
    const items = readCart();
    const resolved = await Promise.all(
        items.map(async ({ productId, quantity }) => {
            const product = await getProductById(productId);
            if (!product) return { productId, quantity, product: null, issue: "missing", lineTotal: 0 };
            const max = getMaxQuantity(product);
            if (max === 0) return { productId, quantity, product, issue: "unavailable", lineTotal: 0 };
            const adjusted = Math.min(quantity, max);
            return {
                productId,
                quantity: adjusted,
                product,
                issue: adjusted !== quantity ? "adjusted" : null,
                lineTotal: product.price * adjusted
            };
        })
    );

    const adjustedItems = resolved.filter((item) => item.issue === "adjusted");
    if (adjustedItems.length) {
        saveCart(readCart().map((item) => {
            const fix = adjustedItems.find((entry) => entry.productId === item.productId);
            return fix ? { ...item, quantity: fix.quantity } : item;
        }));
    }
    return resolved;
}

export const isCartPayable = (resolved) =>
    resolved.length > 0 && resolved.every((item) => item.issue === null || item.issue === "adjusted");

export const calculateSubtotal = (resolved) =>
    resolved.reduce((total, item) => total + (item.product && !["missing", "unavailable"].includes(item.issue) ? item.lineTotal : 0), 0);
