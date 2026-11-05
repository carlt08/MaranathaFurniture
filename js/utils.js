import { CONFIG } from "./config.js";

// Site root derived from this module's location, so URLs work from index.html and from /pages/.
export const SITE_ROOT = new URL("../", import.meta.url);

export const siteUrl = (path = "") => new URL(path, SITE_ROOT).href;

export const productUrl = (id) => `${siteUrl("pages/product.html")}?id=${encodeURIComponent(id)}`;

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: CONFIG.currency,
    maximumFractionDigits: 0
});

export const formatPrice = (amount) => currencyFormatter.format(amount).replace(/\u00a0/g, " ");

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export const formatPhoneDisplay = (phone = CONFIG.phone) =>
    phone.length === 10 ? `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : phone;

export const telHref = () => `tel:+${CONFIG.whatsapp}`;

export const formatAddress = () => {
    const { street, town, province, postalCode, country } = CONFIG.address;
    return `${street}, ${town}, ${province}, ${postalCode}, ${country}`;
};

export const directionsUrl = () =>
    `https://www.google.com/maps/dir/?api=1&destination=${CONFIG.coordinates.lat},${CONFIG.coordinates.lng}`;

export const mapEmbedUrl = () =>
    `https://www.google.com/maps?q=${CONFIG.coordinates.lat},${CONFIG.coordinates.lng}&z=15&output=embed`;

export function showError(container, message) {
    container.innerHTML = `
        <div class="state state--error" role="alert">
            <p class="state__title">Something went wrong</p>
            <p>${escapeHtml(message)}</p>
            <button type="button" class="btn btn--outline" data-retry>Try again</button>
        </div>`;
}

export function readStorage(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}
