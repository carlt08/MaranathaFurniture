import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import { getCartCount, onCartChange } from "./cart-store.js";
import { whatsappLink, generalEnquiryMessage } from "./whatsapp.js";
import {
    siteUrl, escapeHtml, formatPhoneDisplay, telHref, formatAddress, directionsUrl, mapEmbedUrl
} from "./utils.js";

const NAV_ITEMS = [
    { id: "home", label: "Home", path: "index.html" },
    { id: "shop", label: "Shop", path: "pages/shop.html" },
    { id: "new", label: "New Furniture", path: "pages/new-furniture.html" },
    { id: "second-hand", label: "Second-Hand", path: "pages/second-hand.html" },
    { id: "delivery", label: "Delivery", path: "pages/delivery.html" },
    { id: "about", label: "About", path: "pages/about.html" },
    { id: "contact", label: "Contact", path: "pages/contact.html" }
];

const DESKTOP_QUERY = window.matchMedia("(min-width: 64em)");

function renderDemoBanner() {
    if (!CONFIG.demoMode) return "";
    return `<div class="demo-banner" role="note">
        <p class="container"><strong>Demonstration website.</strong> Products, prices and photos shown are placeholders, not real stock.</p>
    </div>`;
}

function renderHeader(activePage) {
    const links = NAV_ITEMS.map(({ id, label, path }) => {
        const current = id === activePage ? ' aria-current="page"' : "";
        return `<li><a class="primary-nav__link" href="${siteUrl(path)}"${current}>${label}</a></li>`;
    }).join("");

    return `${renderDemoBanner()}
    <header class="site-header">
        <div class="container header-bar">
            <a class="logo" href="${siteUrl("index.html")}" aria-label="${escapeHtml(CONFIG.businessName)} home">
                <img src="${siteUrl("assets/images/branding/logo.svg")}" alt="${escapeHtml(CONFIG.businessName)}" width="188" height="40">
            </a>
            <nav id="primary-nav" class="primary-nav" aria-label="Main">
                <ul class="primary-nav__list">
                    ${links}
                    <li class="primary-nav__extra"><a class="primary-nav__link" href="${telHref()}">${icon("phone", 20)} Call ${formatPhoneDisplay()}</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <a class="icon-btn icon-btn--whatsapp" href="${whatsappLink(generalEnquiryMessage())}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${icon("whatsapp", 22)}</a>
                <a class="icon-btn" href="${siteUrl("pages/cart.html")}" aria-label="Shopping cart" data-cart-link>
                    ${icon("cart", 22)}
                    <span class="cart-badge" data-cart-count hidden>0</span>
                </a>
                <button type="button" class="icon-btn nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
                    <span data-nav-icon-open>${icon("menu", 24)}</span>
                    <span data-nav-icon-close hidden>${icon("close", 24)}</span>
                </button>
            </div>
        </div>
    </header>`;
}

function renderFooter() {
    const emailLine = CONFIG.email
        ? `<li><a href="mailto:${escapeHtml(CONFIG.email)}">${escapeHtml(CONFIG.email)}</a></li>`
        : "";
    const demoNote = CONFIG.demoMode
        ? `<p class="site-footer__note">Demonstration mode: listed products, prices and photographs are placeholders using stock imagery.</p>`
        : "";

    return `<footer class="site-footer">
        <div class="container footer-grid">
            <section class="footer-col footer-col--brand">
                <h2 class="footer-title">${escapeHtml(CONFIG.businessName)}</h2>
                <p>New and second-hand furniture from your local Porterville furniture shop.</p>
                <p class="footer-slogan">${escapeHtml(CONFIG.slogan)}</p>
            </section>
            <nav class="footer-col" aria-label="Shop links">
                <h2 class="footer-heading">Shop</h2>
                <ul class="footer-list">
                    <li><a href="${siteUrl("pages/shop.html")}">All furniture</a></li>
                    <li><a href="${siteUrl("pages/new-furniture.html")}">New furniture</a></li>
                    <li><a href="${siteUrl("pages/second-hand.html")}">Second-hand furniture</a></li>
                    <li><a href="${siteUrl("pages/cart.html")}">Your cart</a></li>
                </ul>
            </nav>
            <nav class="footer-col" aria-label="Information links">
                <h2 class="footer-heading">Information</h2>
                <ul class="footer-list">
                    <li><a href="${siteUrl("pages/about.html")}">About us</a></li>
                    <li><a href="${siteUrl("pages/delivery.html")}">Delivery</a></li>
                    <li><a href="${siteUrl("pages/contact.html")}">Contact us</a></li>
                </ul>
            </nav>
            <section class="footer-col">
                <h2 class="footer-heading">Visit or contact us</h2>
                <ul class="footer-list">
                    <li>${icon("pin", 18)} <span>${escapeHtml(formatAddress())}</span></li>
                    <li>${icon("phone", 18)} <a href="${telHref()}">${formatPhoneDisplay()}</a></li>
                    <li>${icon("whatsapp", 18)} <a href="${whatsappLink(generalEnquiryMessage())}" target="_blank" rel="noopener">WhatsApp us</a></li>
                    <li>${icon("facebook", 18)} <a href="${escapeHtml(CONFIG.facebook)}" target="_blank" rel="noopener">Facebook</a></li>
                    ${emailLine}
                    <li>${icon("pin", 18)} <a href="${directionsUrl()}" target="_blank" rel="noopener">Get directions</a></li>
                </ul>
            </section>
        </div>
        <div class="footer-bottom">
            <div class="container">
                <p>&copy; ${new Date().getFullYear()} ${escapeHtml(CONFIG.businessName)}. All rights reserved.</p>
                ${demoNote}
            </div>
        </div>
    </footer>`;
}

function renderFloatingWhatsApp() {
    return `<a class="whatsapp-fab" href="${whatsappLink(generalEnquiryMessage())}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
        ${icon("whatsapp", 28)}<span class="whatsapp-fab__label">WhatsApp</span>
    </a>`;
}

function setupNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        toggle.querySelector("[data-nav-icon-open]").hidden = open;
        toggle.querySelector("[data-nav-icon-close]").hidden = !open;
    };

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
            setOpen(false);
            toggle.focus();
        }
    });
    document.addEventListener("click", (event) => {
        if (nav.classList.contains("is-open") && !event.target.closest(".site-header")) setOpen(false);
    });
    DESKTOP_QUERY.addEventListener("change", (event) => {
        if (event.matches) setOpen(false);
    });
}

function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.hidden = count === 0;
    });
    document.querySelector("[data-cart-link]")?.setAttribute(
        "aria-label",
        count === 1 ? "Shopping cart, 1 item" : `Shopping cart, ${count} items`
    );
}

// Fills elements marked with data-config / data-link / data-map from CONFIG, so business details live in one place.
export function bindConfig(root = document) {
    root.querySelectorAll("[data-requires]").forEach((node) => {
        if (!CONFIG[node.dataset.requires]) node.hidden = true;
    });
    root.querySelectorAll("[data-icon]").forEach((node) => {
        node.insertAdjacentHTML("afterbegin", icon(node.dataset.icon, Number(node.dataset.iconSize) || 20));
    });

    const text = {
        businessName: CONFIG.businessName,
        slogan: CONFIG.slogan,
        phone: formatPhoneDisplay(),
        address: formatAddress(),
        email: CONFIG.email,
        openingHours: CONFIG.openingHours || "Opening hours to be confirmed. Please call or WhatsApp us before visiting."
    };
    root.querySelectorAll("[data-config]").forEach((node) => {
        const value = text[node.dataset.config];
        if (value) node.textContent = value;
        else node.hidden = true;
    });

    const links = {
        tel: telHref(),
        whatsapp: whatsappLink(generalEnquiryMessage()),
        facebook: CONFIG.facebook,
        maps: CONFIG.mapsUrl,
        directions: directionsUrl(),
        email: CONFIG.email ? `mailto:${CONFIG.email}` : ""
    };
    root.querySelectorAll("[data-link]").forEach((node) => {
        const href = links[node.dataset.link];
        if (!href) {
            node.hidden = true;
            return;
        }
        node.href = href;
        if (/^https?:/.test(href)) {
            node.target = "_blank";
            node.rel = "noopener";
        }
    });

    root.querySelectorAll("[data-map]").forEach((node) => {
        node.innerHTML = `<iframe title="Map showing ${escapeHtml(CONFIG.businessName)}, ${escapeHtml(CONFIG.address.street)}, ${escapeHtml(CONFIG.address.town)}"
            src="${mapEmbedUrl()}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    });
}

export function showToast(message, type = "success") {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const toast = document.createElement("p");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function setupFloatingButton() {
    const fab = document.querySelector(".whatsapp-fab");
    if (!fab) return;
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) < 10) return;
        fab.classList.toggle("is-tucked", y > lastY && y > 200); // Stay out of the way while reading downwards.
        lastY = y;
    }, { passive: true });
}

function initLayout() {
    const page = document.body.dataset.page ?? "";
    document.body.insertAdjacentHTML("afterbegin", `<a class="skip-link" href="#main">Skip to main content</a>`);

    const headerHost = document.getElementById("site-header");
    const footerHost = document.getElementById("site-footer");
    if (headerHost) headerHost.innerHTML = renderHeader(page);
    if (footerHost) footerHost.innerHTML = renderFooter();
    document.body.insertAdjacentHTML("beforeend", `${renderFloatingWhatsApp()}<div id="toast-region" class="toast-region" aria-live="polite"></div>`);

    setupNavigation();
    setupFloatingButton();
    bindConfig();
    updateCartBadge();
    onCartChange(updateCartBadge);
}

initLayout();
