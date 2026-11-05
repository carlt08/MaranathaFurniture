const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SA_PHONE_PATTERN = /^(?:\+27|27|0)[1-9]\d{8}$/;

export const isValidEmail = (value) => EMAIL_PATTERN.test(value.trim());

export const isValidPhone = (value) => SA_PHONE_PATTERN.test(value.replace(/[\s\-()]/g, ""));

export function setFieldError(form, name, message) {
    const field = form.elements[name];
    const error = form.querySelector(`#${name}-error`);
    const control = field instanceof RadioNodeList ? field[0] : field;
    if (control) {
        control.setAttribute("aria-invalid", message ? "true" : "false");
        control.closest(".field")?.classList.toggle("has-error", Boolean(message));
    }
    if (error) {
        error.textContent = message;
        error.hidden = !message;
    }
}

// rules: { fieldName: (value, allValues) => errorMessage | "" }. Returns { valid, values }.
export function validateForm(form, rules) {
    const values = Object.fromEntries(new FormData(form).entries());
    Object.keys(values).forEach((key) => {
        if (typeof values[key] === "string") values[key] = values[key].trim();
    });

    let firstInvalid = null;
    Object.entries(rules).forEach(([name, rule]) => {
        const message = rule(values[name] ?? "", values);
        setFieldError(form, name, message);
        if (message && !firstInvalid) firstInvalid = form.elements[name];
    });

    if (firstInvalid) {
        const target = firstInvalid instanceof RadioNodeList ? firstInvalid[0] : firstInvalid;
        target.focus();
    }
    return { valid: !firstInvalid, values };
}

export const required = (label) => (value) => (value ? "" : `Please enter ${label}.`);

export const phoneRule = (value) => {
    if (!value) return "Please enter your contact number.";
    return isValidPhone(value) ? "" : "Please enter a valid South African number, for example 084 593 2084.";
};

export const emailRule = (value) => {
    if (!value) return "Please enter your email address.";
    return isValidEmail(value) ? "" : "Please enter a valid email address, for example name@example.com.";
};
