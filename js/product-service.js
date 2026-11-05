import { CONFIG } from "./config.js";
import { SITE_ROOT } from "./utils.js";

// All product access goes through this module. To move to a .NET API later,
// replace fetchJson() calls in loadProducts()/loadCategories() and keep the exports.

const SECOND_HAND = "Second-hand";
let productsPromise = null;
let categoriesPromise = null;

async function fetchJson(path) {
    const response = await fetch(new URL(path, SITE_ROOT));
    if (!response.ok) {
        throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
    }
    return response.json();
}

function normaliseProduct(product, categories) {
    const category = categories.find((item) => item.name === product.category);
    return {
        ...product,
        categoryId: category?.id ?? "",
        imageUrls: (product.images ?? []).map((path) => new URL(path, SITE_ROOT).href)
    };
}

async function loadCategories() {
    categoriesPromise ??= fetchJson(CONFIG.dataPaths.categories).then((categories) =>
        categories.map((category) => ({ ...category, imageUrl: new URL(category.image, SITE_ROOT).href }))
    );
    try {
        return await categoriesPromise;
    } catch (error) {
        categoriesPromise = null;
        throw error;
    }
}

async function loadProducts() {
    productsPromise ??= Promise.all([fetchJson(CONFIG.dataPaths.products), loadCategories()]).then(
        ([products, categories]) => products.map((product) => normaliseProduct(product, categories))
    );
    try {
        return await productsPromise;
    } catch (error) {
        productsPromise = null;
        throw error;
    }
}

export const getCategories = () => loadCategories();
export const getProducts = () => loadProducts();

export async function getProductById(id) {
    const products = await loadProducts();
    return products.find((product) => product.id === id) ?? null;
}

export async function getFeaturedProducts(limit = 6) {
    const products = await loadProducts();
    return sortProducts(products.filter((product) => product.featured), "featured").slice(0, limit);
}

export async function getRelatedProducts(product, limit = 4) {
    const products = await loadProducts();
    const others = products.filter((item) => item.id !== product.id && isOrderable(item));
    const sameCategory = others.filter((item) => item.category === product.category);
    const rest = others.filter((item) => item.category !== product.category);
    return [...sameCategory, ...rest].slice(0, limit);
}

export const isSecondHand = (product) => product.condition === SECOND_HAND;

export const isOrderable = (product) => product.availability === "Available" && product.stockQuantity > 0;

// Second-hand items are single pieces unless maxQuantityPerOrder is set explicitly.
export function getMaxQuantity(product) {
    if (!isOrderable(product)) return 0;
    const cap = product.maxQuantityPerOrder ?? (isSecondHand(product) ? 1 : Infinity);
    return Math.max(0, Math.min(product.stockQuantity, cap));
}

export const conditionLabel = (product) =>
    isSecondHand(product) && product.conditionGrade
        ? `${product.condition} - ${product.conditionGrade}`
        : product.condition;

export function availabilityLabel(product) {
    if (!isOrderable(product)) return product.availability === "Available" ? "Out of stock" : product.availability;
    return product.stockQuantity === 1 ? "Available (1 piece)" : "Available";
}

function sortProducts(products, sort) {
    const list = [...products];
    const byNewest = (a, b) => b.dateAdded.localeCompare(a.dateAdded);
    const soldLast = (a, b) => Number(isOrderable(b)) - Number(isOrderable(a));
    switch (sort) {
        case "newest":
            return list.sort(byNewest);
        case "price-asc":
            return list.sort((a, b) => a.price - b.price);
        case "price-desc":
            return list.sort((a, b) => b.price - a.price);
        default:
            return list.sort((a, b) => soldLast(a, b) || Number(b.featured) - Number(a.featured) || byNewest(a, b));
    }
}

export async function searchProducts(filters = {}) {
    const {
        query = "",
        category = "",
        condition = "",
        grade = "",
        minPrice = null,
        maxPrice = null,
        availableOnly = false,
        featuredOnly = false,
        sort = "featured"
    } = filters;

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const products = await loadProducts();

    const matches = products.filter((product) => {
        if (category && product.categoryId !== category) return false;
        if (condition === "new" && isSecondHand(product)) return false;
        if (condition === "second-hand" && !isSecondHand(product)) return false;
        if (grade && product.conditionGrade !== grade) return false;
        if (minPrice !== null && product.price < minPrice) return false;
        if (maxPrice !== null && product.price > maxPrice) return false;
        if (availableOnly && !isOrderable(product)) return false;
        if (featuredOnly && !product.featured) return false;
        if (tokens.length) {
            const haystack = [product.name, product.sku, product.category, product.description, product.condition, product.conditionGrade]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!tokens.every((token) => haystack.includes(token))) return false;
        }
        return true;
    });

    return sortProducts(matches, sort);
}
