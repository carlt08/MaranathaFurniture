import "./common.js";
import { CONFIG } from "./config.js";
import { icon } from "./icons.js";
import { validateForm, phoneRule, isValidEmail } from "./forms.js";
import { whatsappLink } from "./whatsapp.js";
import { escapeHtml } from "./utils.js";

const form = document.getElementById("contact-form");
const resultBox = document.querySelector("[data-contact-result]");
const submitButton = form.querySelector("[type=submit]");

const rules = {
    fullName: (value) => (value.length >= 2 ? "" : "Please enter your name."),
    phone: phoneRule,
    email: (value) => (!value || isValidEmail(value) ? "" : "Please enter a valid email address or leave it blank."),
    message: (value) => (value.length >= 5 ? "" : "Please enter your message.")
};

const messageText = (values) => {
    const lines = [`Hello ${CONFIG.businessName}, my name is ${values.fullName}.`, "", values.message, "", `Contact number: ${values.phone}`];
    if (values.email) lines.push(`Email: ${values.email}`);
    return lines.join("\n");
};

function show(html, type) {
    resultBox.className = `notice notice--${type}`;
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function send(values) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(CONFIG.contactEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                _subject: `${CONFIG.businessName} website enquiry`,
                _gotcha: "",
                name: values.fullName,
                phone: values.phone,
                email: values.email,
                message: values.message
            }),
            signal: controller.signal
        });
        return response.ok ? { ok: true } : { ok: false, message: `The message service responded with an error (HTTP ${response.status}).` };
    } catch {
        return { ok: false, message: "The message could not be sent. Please check your connection." };
    } finally {
        clearTimeout(timer);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.elements.website.value) return; // Honeypot field filled in by a bot.
    resultBox.hidden = true;

    const { valid, values } = validateForm(form, rules);
    if (!valid) return;

    const whatsappButton = `<a class="btn btn--whatsapp btn--block" href="${whatsappLink(messageText(values))}" target="_blank" rel="noopener">${icon("whatsapp", 20)} Send this message on WhatsApp</a>`;

    if (!CONFIG.contactEndpoint) {
        show(`<p><strong>Your message has not been sent.</strong></p>
            <p>The website contact form is not set up yet. Please send your message on WhatsApp or call us instead.</p>${whatsappButton}`, "warning");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    const outcome = await send(values);
    submitButton.disabled = false;
    submitButton.textContent = "Send message";

    if (outcome.ok) {
        form.reset();
        show(`<p><strong>Thank you. Your message has been sent.</strong></p><p>We will get back to you as soon as we can.</p>`, "success");
    } else {
        show(`<p><strong>Your message has not been sent.</strong></p><p>${escapeHtml(outcome.message)} You can also use WhatsApp.</p>${whatsappButton}`, "error");
    }
});
