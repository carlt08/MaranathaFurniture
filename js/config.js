// Central site configuration. Edit values here instead of inside pages or scripts.
export const CONFIG = {
    businessName: "Maranatha Furnishers",
    phone: "0845932084",
    whatsapp: "27845932084",
    email: "", // Not confirmed yet. Leave empty to hide email everywhere.
    facebook: "https://www.facebook.com/p/Maranatha-Furnishers-In-Porterville-100057567934417/",
    orderEndpoint: "", // Future FormSubmit / Formspree endpoint. Empty = submission not configured.
    contactEndpoint: "", // Future FormSubmit / Formspree endpoint. Empty = submission not configured.
    currency: "ZAR",
    demoMode: true, // true = demonstration catalogue notices are shown across the site.

    address: {
        street: "Jakkalskloof Road",
        town: "Porterville",
        province: "Western Cape",
        postalCode: "6810",
        country: "South Africa"
    },
    coordinates: { lat: -33.0156, lng: 18.99185 },
    mapsUrl: "https://www.google.com/maps?q=-33.0156,18.99185",

    // Proposed marketing messages, not official confirmed slogans.
    slogan: "Quality Furniture. Great Value. Friendly Service.",
    openingHours: "", // Not confirmed yet. Leave empty to show a "please enquire" placeholder.

    storageKeys: {
        cart: "maranatha.cart.v1",
        lastOrder: "maranatha.lastOrder.v1"
    },
    dataPaths: {
        products: "data/products.json",
        categories: "data/categories.json"
    }
};
