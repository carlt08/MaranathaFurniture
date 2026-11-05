import "./common.js";
import { icon } from "./icons.js";
import { getCategories, searchProducts } from "./product-service.js";
import { renderProductCard, bindAddToCart } from "./product-card.js";
import { debounce, escapeHtml, showError } from "./utils.js";

const host = document.querySelector("[data-shop]");
const root = document.getElementById("shop-root");
const lock = host.dataset.conditionLock || "";

const SORT_OPTIONS = [
    { value: "featured", label: "Featured first" },
    { value: "newest", label: "Newest first" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" }
];
const GRADES = ["Excellent", "Good", "Fair", "Refurbished"];

const DEFAULT_STATE = {
    query: "", category: "", condition: lock, grade: "", minPrice: "", maxPrice: "",
    availableOnly: false, featuredOnly: false, sort: "featured"
};

let categories = [];
let state = readStateFromUrl();
let elements = {};

function readStateFromUrl() {
    const params = new URLSearchParams(location.search);
    const sort = params.get("sort");
    return {
        query: params.get("q") ?? "",
        category: params.get("category") ?? "",
        condition: lock || (["new", "second-hand"].includes(params.get("condition")) ? params.get("condition") : ""),
        grade: GRADES.includes(params.get("grade")) ? params.get("grade") : "",
        minPrice: params.get("min") ?? "",
        maxPrice: params.get("max") ?? "",
        availableOnly: params.get("available") === "1",
        featuredOnly: params.get("featured") === "1",
        sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : "featured"
    };
}

function writeStateToUrl() {
    const params = new URLSearchParams();
    const set = (key, value, fallback = "") => { if (value && value !== fallback) params.set(key, value); };
    set("q", state.query);
    set("category", state.category);
    if (!lock) set("condition", state.condition);
    set("grade", state.grade);
    set("min", state.minPrice);
    set("max", state.maxPrice);
    if (state.availableOnly) params.set("available", "1");
    if (state.featuredOnly) params.set("featured", "1");
    set("sort", state.sort, DEFAULT_STATE.sort);
    const query = params.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function parsePrice(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function activeFilterCount() {
    return [
        state.category, !lock && state.condition, state.grade, state.minPrice, state.maxPrice,
        state.availableOnly, state.featuredOnly
    ].filter(Boolean).length;
}

function renderShell() {
    const categoryOptions = categories
        .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
        .join("");
    const sortOptions = SORT_OPTIONS
        .map((option) => `<option value="${option.value}">${option.label}</option>`)
        .join("");
    const gradeOptions = GRADES.map((grade) => `<option value="${grade}">${grade}</option>`).join("");

    const conditionGroup = lock ? "" : `
        <fieldset class="filter-group">
            <legend>Condition</legend>
            <div class="segmented">
                <label><input type="radio" name="condition" value=""><span>All</span></label>
                <label><input type="radio" name="condition" value="new"><span>New</span></label>
                <label><input type="radio" name="condition" value="second-hand"><span>Second-hand</span></label>
            </div>
        </fieldset>`;

    root.innerHTML = `
        <div class="shop-toolbar">
            <form class="search-form" role="search" data-search-form>
                <label class="sr-only" for="shop-search">Search furniture</label>
                <span class="search-form__icon">${icon("search", 20)}</span>
                <input id="shop-search" type="search" name="q" placeholder="Search by name, SKU or category" autocomplete="off" enterkeyhint="search">
            </form>
            <div class="shop-toolbar__row">
                <button type="button" class="btn btn--outline filter-toggle" aria-controls="filter-panel" aria-expanded="false" data-filter-toggle>
                    ${icon("filter", 20)} Filters <span class="filter-toggle__count" data-filter-count hidden>0</span>
                </button>
                <div class="select-wrap">
                    <label class="sr-only" for="shop-sort">Sort by</label>
                    <select id="shop-sort" class="select">${sortOptions}</select>
                </div>
            </div>
        </div>
        <div class="shop-layout">
            <div class="filter-backdrop" data-filter-backdrop hidden></div>
            <aside id="filter-panel" class="filter-panel" aria-label="Product filters">
                <div class="filter-panel__header">
                    <h2>Filters</h2>
                    <button type="button" class="icon-btn" data-filter-close aria-label="Close filters">${icon("close", 22)}</button>
                </div>
                <form class="filter-panel__form" data-filter-form novalidate>
                    <div class="filter-group">
                        <label for="filter-category">Category</label>
                        <select id="filter-category" name="category" class="select">
                            <option value="">All categories</option>${categoryOptions}
                        </select>
                    </div>
                    ${conditionGroup}
                    <div class="filter-group" data-grade-group hidden>
                        <label for="filter-grade">Second-hand condition</label>
                        <select id="filter-grade" name="grade" class="select">
                            <option value="">Any condition</option>${gradeOptions}
                        </select>
                    </div>
                    <fieldset class="filter-group">
                        <legend>Price (ZAR)</legend>
                        <div class="price-range">
                            <div><label class="sr-only" for="filter-min">Minimum price</label>
                                <input id="filter-min" name="minPrice" class="input" type="number" inputmode="numeric" min="0" step="100" placeholder="Min"></div>
                            <span aria-hidden="true">to</span>
                            <div><label class="sr-only" for="filter-max">Maximum price</label>
                                <input id="filter-max" name="maxPrice" class="input" type="number" inputmode="numeric" min="0" step="100" placeholder="Max"></div>
                        </div>
                    </fieldset>
                    <fieldset class="filter-group">
                        <legend>Show</legend>
                        <label class="check"><input type="checkbox" name="availableOnly"><span>Available items only</span></label>
                        <label class="check"><input type="checkbox" name="featuredOnly"><span>Featured items only</span></label>
                    </fieldset>
                    <div class="filter-panel__footer">
                        <button type="button" class="btn btn--outline" data-clear-filters>Clear all</button>
                        <button type="button" class="btn btn--primary" data-filter-close data-show-results>Show results</button>
                    </div>
                </form>
            </aside>
            <section class="shop-results" aria-label="Products">
                <p class="result-count" role="status" data-result-count>Loading products...</p>
                <div class="product-grid" data-product-grid></div>
            </section>
        </div>`;

    elements = {
        searchForm: root.querySelector("[data-search-form]"),
        search: root.querySelector("#shop-search"),
        sort: root.querySelector("#shop-sort"),
        filterForm: root.querySelector("[data-filter-form]"),
        panel: root.querySelector("#filter-panel"),
        backdrop: root.querySelector("[data-filter-backdrop]"),
        toggle: root.querySelector("[data-filter-toggle]"),
        count: root.querySelector("[data-filter-count]"),
        gradeGroup: root.querySelector("[data-grade-group]"),
        resultCount: root.querySelector("[data-result-count]"),
        grid: root.querySelector("[data-product-grid]"),
        showResults: root.querySelector("[data-show-results]")
    };
    bindAddToCart(elements.grid);
}

function applyStateToControls() {
    const { filterForm, search, sort } = elements;
    search.value = state.query;
    sort.value = state.sort;
    filterForm.elements.category.value = state.category;
    filterForm.elements.grade.value = state.grade;
    filterForm.elements.minPrice.value = state.minPrice;
    filterForm.elements.maxPrice.value = state.maxPrice;
    filterForm.elements.availableOnly.checked = state.availableOnly;
    filterForm.elements.featuredOnly.checked = state.featuredOnly;
    if (!lock) {
        filterForm.querySelectorAll("input[name=condition]").forEach((radio) => { radio.checked = radio.value === state.condition; });
    }
    syncGradeVisibility();
}

function syncGradeVisibility() {
    elements.gradeGroup.hidden = state.condition !== "second-hand";
}

function readControls() {
    const form = elements.filterForm;
    state.query = elements.search.value.trim();
    state.sort = elements.sort.value;
    state.category = form.elements.category.value;
    if (!lock) state.condition = form.elements.condition.value;
    state.grade = state.condition === "second-hand" ? form.elements.grade.value : "";
    state.minPrice = form.elements.minPrice.value;
    state.maxPrice = form.elements.maxPrice.value;
    state.availableOnly = form.elements.availableOnly.checked;
    state.featuredOnly = form.elements.featuredOnly.checked;
    syncGradeVisibility();
}

function setDrawer(open) {
    elements.panel.classList.toggle("is-open", open);
    elements.backdrop.hidden = !open;
    elements.toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("filters-open", open);
    if (open) elements.panel.querySelector("[data-filter-close]").focus();
    else if (document.activeElement && elements.panel.contains(document.activeElement)) elements.toggle.focus();
}

async function update() {
    writeStateToUrl();
    const count = activeFilterCount();
    elements.count.textContent = String(count);
    elements.count.hidden = count === 0;

    try {
        const products = await searchProducts({
            query: state.query,
            category: state.category,
            condition: state.condition,
            grade: state.grade,
            minPrice: parsePrice(state.minPrice),
            maxPrice: parsePrice(state.maxPrice),
            availableOnly: state.availableOnly,
            featuredOnly: state.featuredOnly,
            sort: state.sort
        });
        renderResults(products);
    } catch (error) {
        elements.resultCount.textContent = "";
        showError(elements.grid, error.message);
        elements.grid.classList.remove("product-grid");
        elements.grid.querySelector("[data-retry]").addEventListener("click", () => {
            elements.grid.classList.add("product-grid");
            update();
        });
    }
}

function renderResults(products) {
    elements.grid.classList.add("product-grid");
    const label = products.length === 1 ? "product" : "products";
    elements.resultCount.textContent = `${products.length} ${label} found`;
    elements.showResults.textContent = products.length ? `Show ${products.length} ${label}` : "No results";

    if (!products.length) {
        elements.grid.innerHTML = `
            <div class="state state--empty">
                <p class="state__title">No furniture matches your search</p>
                <p>Try a different word, widen the price range or clear the filters.</p>
                <button type="button" class="btn btn--outline" data-clear-filters>Clear search and filters</button>
            </div>`;
        return;
    }
    elements.grid.innerHTML = products.map((product, index) => renderProductCard(product, { eager: index < 4 })).join("");
}

function clearAll() {
    state = { ...DEFAULT_STATE, sort: state.sort };
    applyStateToControls();
    update();
}

function bindEvents() {
    const refresh = debounce(() => { readControls(); update(); }, 200);

    elements.searchForm.addEventListener("submit", (event) => { event.preventDefault(); readControls(); update(); });
    elements.search.addEventListener("input", refresh);
    elements.sort.addEventListener("change", () => { readControls(); update(); });
    elements.filterForm.addEventListener("input", refresh);
    elements.filterForm.addEventListener("submit", (event) => event.preventDefault());

    root.addEventListener("click", (event) => {
        if (event.target.closest("[data-clear-filters]")) clearAll();
        if (event.target.closest("[data-filter-close]")) setDrawer(false);
    });
    elements.toggle.addEventListener("click", () => setDrawer(true));
    elements.backdrop.addEventListener("click", () => setDrawer(false));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && elements.panel.classList.contains("is-open")) setDrawer(false);
    });
}

async function init() {
    try {
        categories = await getCategories();
    } catch (error) {
        showError(root, error.message);
        root.querySelector("[data-retry]").addEventListener("click", init);
        return;
    }
    renderShell();
    applyStateToControls();
    bindEvents();
    update();
}

init();
