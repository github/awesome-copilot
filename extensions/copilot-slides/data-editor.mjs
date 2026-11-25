import { t } from "./i18n.mjs";

export function renderDataEditor(root, element, change) {
    const supported = element && ["table", "chart"].includes(element.type);
    root.hidden = !supported;
    if (!supported) { root.replaceChildren(); delete root.dataset.element; return; }
    if (root.dataset.element === element.id && root.contains(document.activeElement) &&
        document.activeElement.matches("input")) return;
    root.dataset.element = element.id;
    root.replaceChildren();
    const button = (label, action, disabled = false) => {
        const node = document.createElement("button");
        node.type = "button"; node.textContent = label; node.disabled = disabled;
        node.onclick = action; return node;
    };
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    caption.textContent = element.type === "table" ? t("Edit table cells") : t("Chart items and values");
    table.append(caption);
    const rows = element.type === "table" ? element.rows : element.labels.map((label, i) => [label, element.values[i]]);
    for (const [r, row] of rows.entries()) {
        const tr = document.createElement("tr");
        const th = document.createElement("th"); th.scope = "row"; th.textContent = String(r + 1); tr.append(th);
        for (const [c, value] of row.entries()) {
            const td = document.createElement("td"), input = document.createElement("input");
            const number = element.type === "chart" && c === 1;
            input.type = number ? "number" : "text"; input.value = String(value);
            input.setAttribute("aria-label", element.type === "table" ? t("Row {row}, column {column}", { row: r + 1, column: c + 1 }) :
                number ? t("Item {n} value", { n: r + 1 }) : t("Item {n} label", { n: r + 1 }));
            if (number) { input.min = "0"; input.max = "1000000000000"; input.step = "any"; input.required = true; }
            else input.maxLength = element.type === "table" ? 1000 : 60;
            input.onchange = () => {
                if (!input.reportValidity() || (number && input.value.trim() === "")) {
                    input.setAttribute("aria-invalid", "true"); return;
                }
                input.removeAttribute("aria-invalid");
                change((target) => {
                    if (target.type === "table") target.rows[r][c] = input.value;
                    else if (number) target.values[r] = Number(input.value);
                    else target.labels[r] = input.value;
                });
            };
            td.append(input); tr.append(td);
        }
        const td = document.createElement("td");
        td.append(button(t("Delete row {n}", { n: r + 1 }), () => change((target) => {
            if (target.type === "table") target.rows.splice(r, 1);
            else { target.labels.splice(r, 1); target.values.splice(r, 1); }
        }), rows.length <= 1));
        tr.append(td); table.append(tr);
    }
    const scroller = document.createElement("div"); scroller.className = "data-scroll";
    scroller.tabIndex = 0; scroller.setAttribute("role", "region"); scroller.setAttribute("aria-label", caption.textContent);
    scroller.append(table); root.append(scroller);
    root.append(button(t("Add row"), () => change((target) => {
        if (target.type === "table") target.rows.push(target.rows[0].map(() => ""));
        else { target.labels.push(""); target.values.push(0); }
    }), rows.length >= (element.type === "table" ? 20 : 12)));
    if (element.type === "table") {
        root.append(button(t("Add column"), () => change((target) => target.rows.forEach((row) => row.push(""))), rows[0].length >= 10));
        for (let c = 0; c < rows[0].length; c++) root.append(button(t("Delete column {n}", { n: c + 1 }),
            () => change((target) => target.rows.forEach((row) => row.splice(c, 1))), rows[0].length <= 1));
    }
}
