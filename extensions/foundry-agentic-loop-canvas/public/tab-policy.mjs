// Inputs that act on a click rather than hold typing, so focus left on them does not block a switch.
const ACTION_INPUTS = new Set(["button", "submit", "reset", "image", "hidden", "checkbox", "radio"]);

// Whether focus is on a control the user may be typing in or choosing from, which an automatic tab switch would hide.
export function isEditable(element) {
    if (!element || element.disabled) return false;
    if (element.isContentEditable) return true;
    const tag = String(element.tagName ?? "").toLowerCase();
    if (tag === "select") return true;
    if (tag === "textarea") return !element.readOnly;
    if (tag === "input") return !element.readOnly && !ACTION_INPUTS.has(String(element.type || "text").toLowerCase());
    return false;
}

// An automatic switch moves to the tab, unless the user is editing or a dialog is open: then a notice offers it instead.
export function autoSwitch({ current, target, active = null, dialogOpen = false }) {
    if (current === target) return "none";
    return dialogOpen || isEditable(active) ? "notice" : "switch";
}
