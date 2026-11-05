# Maranatha Furnishers website (MVP)

A static, mobile-first furniture shopping website for Maranatha Furnishers, Jakkalskloof Road, Porterville, Western Cape.

Built with HTML5, CSS3, vanilla JavaScript (ES modules), JSON product data and LocalStorage for the cart. No build step, no framework, no backend.

> **Demonstration mode is on.** All 16 products, prices, dimensions and photos are placeholders (`demoMode: true` in `js/config.js`). Stock photos are not photos of real stock.

## Run locally

The site uses ES modules and `fetch()`, so it must be served over HTTP. Opening `index.html` directly from disk (`file://`) will not work.

Pick one:

```powershell
# Python
python -m http.server 8080

# Node
npx serve .
```

Or use the VS Code **Live Server** extension. Then open <http://localhost:8080/>.

## Project structure

```
index.html              Homepage
pages/                  shop, new-furniture, second-hand, product, cart, checkout,
                        order-confirmation, about, delivery, contact
css/
  main.css              Variables, base, header, hero, footer
  components.css        Buttons, cards, forms, gallery, cart, filters
  responsive.css        Mobile-first breakpoints (480 / 640 / 768 / 1024 / 1280 px)
js/
  config.js             Business details, endpoints, demo mode (edit this first)
  common.js             Shared header, footer, WhatsApp button, nav, config bindings
  utils.js, icons.js    Formatting helpers and inline SVG icons
  product-service.js    The only place that reads product data (swap for an API later)
  cart-store.js         LocalStorage cart logic and stock rules
  product-card.js       Reusable product card
  whatsapp.js           WhatsApp link and message builders
  forms.js, orders.js   Validation, order reference, order submission
  home.js, shop.js, product.js, cart.js, checkout.js,
  order-confirmation.js, contact.js    One script per page
data/
  products.json         Product catalogue
  categories.json       Categories
assets/                 images (hero, categories, products, branding) and icons
docs/image-attributions.md
```

Header and footer are rendered once by `js/common.js` into `#site-header` and `#site-footer`, so they are not repeated in every HTML file. URLs are built from the location of the JS modules, so they work from both `index.html` and `pages/`.

## Configuration (`js/config.js`)

| Setting | Purpose |
| --- | --- |
| `businessName`, `phone`, `whatsapp`, `facebook`, `address`, `coordinates`, `mapsUrl` | Shown across the site, footer, contact page and WhatsApp links |
| `email` | Empty. Add a confirmed email address to show it on the contact page and footer |
| `openingHours` | Empty. Shows "Opening hours to be confirmed" until filled in |
| `orderEndpoint` | Checkout submission endpoint (empty = not configured) |
| `contactEndpoint` | Contact form endpoint (empty = not configured) |
| `demoMode` | `true` shows demo banners and notices. Set to `false` once real products are loaded |

### Connecting order and contact forms

Both forms POST JSON (`Accept: application/json`). They work with FormSubmit (AJAX endpoint) or Formspree. Put the endpoint URL in `orderEndpoint` and `contactEndpoint`.

While an endpoint is empty, the site does **not** claim an order was sent: it explains that submission is not configured and offers a WhatsApp message containing the order details instead. The confirmation page only shows for orders that the endpoint accepted.

Payment is not handled online. Staff confirm stock and delivery cost, then provide EFT banking details.

## Replace demo products

1. Edit `data/products.json`. Each product needs: `id`, `sku`, `name`, `category` (must match a name in `data/categories.json`), `condition` (`New` or `Second-hand`), `price`, `description`, `fullDescription`, `images`, `availability`, `stockQuantity`, `featured`, `isDemo`, `dateAdded`.
2. Optional fields: `conditionGrade` (`Excellent`, `Good`, `Fair`, `Refurbished`; used for second-hand), `dimensions`, `imageAlt`, `maxQuantityPerOrder`.
3. Set `isDemo` to `false` for real products (demo badges disappear for them).
4. `availability` is `Available`, `Sold` or `Reserved`. Anything other than `Available` (or a stock of 0) cannot be added to the cart.
5. Second-hand items are limited to quantity 1 unless `maxQuantityPerOrder` is set.

Image paths in the JSON are relative to the project root. To replace an image, save the new file (WebP or JPG, about 800 x 600, 4:3) in `assets/images/products/` and update the `images` list. Replace category images in `assets/images/categories/` (names are listed in `data/categories.json`) and the homepage hero in `assets/images/hero/`. Replace the temporary logo by overwriting `assets/images/branding/logo.svg` and `assets/icons/favicon.svg`. Update `docs/image-attributions.md` when images change.

## Moving to an API later

`js/product-service.js` is the only module that loads product data. Replace the `fetchJson()` calls in `loadProducts()` and `loadCategories()` with API calls that return the same fields, and keep the exported functions unchanged.

## Still needed from the business

- Real products, prices, dimensions and photographs, then switch off `demoMode`.
- The shop logo, and real photos for the About page and homepage.
- Opening hours and a confirmed email address (optional).
- A FormSubmit or Formspree endpoint for orders and contact messages.
- The shop's own story for the About page, plus delivery charges, areas and times if they should be published.
- EFT banking details are intentionally **not** on the website; staff supply them after confirming an order.

## Notes

- The slogan "Quality Furniture. Great Value. Friendly Service." and the headline are proposed marketing text, not confirmed official slogans.
- Phone numbers on the site are formatted from `config.js` (`084 593 2084`). The WhatsApp link uses `https://wa.me/27845932084`.
