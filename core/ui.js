function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const c of children) node.appendChild(c);
  return node;
}

function labelRow(text, valueText) {
  const lab = document.createElement("label");
  const left = document.createElement("span");
  left.textContent = text;

  const right = document.createElement("span");
  right.textContent = valueText ?? "";

  lab.appendChild(left);
  lab.appendChild(right);
  return { lab, right };
}

// ✅ This is the missing named export
export function buildEffectUI({ root, effect, state, onChange }) {
  const controls = effect.controls(state);

  for (const c of controls) {
    if (c.type === "select") {
      const { lab } = labelRow(c.label, "");
      const select = el("select");
      select.innerHTML = c.options
        .map((o) => `<option value="${o.value}">${o.label}</option>`)
        .join("");
      select.value = state[c.key];

      const row = el("div", { className: "row" }, [
        lab,
        select,
        el("div", { className: "hint", textContent: c.hint ?? "" }),
      ]);

      select.addEventListener("change", () => {
        onChange({ ...state, [c.key]: select.value });
      });

      root.appendChild(row);
      continue;
    }

    if (c.type === "range") {
      const formatted = c.format ? c.format(state[c.key], state) : String(state[c.key]);
      const { lab, right } = labelRow(c.label, formatted);

      const input = el("input", {
        type: "range",
        min: c.min,
        max: c.max,
        step: c.step ?? 1,
        value: state[c.key],
      });

      const row = el("div", { className: "row" }, [
        lab,
        input,
        el("div", { className: "hint", textContent: c.hint ?? "" }),
      ]);

      const update = () => {
        const raw = input.value;
        const val = c.valueFromInput
          ? c.valueFromInput(raw)
          : (c.step && String(c.step).includes(".") ? parseFloat(raw) : parseInt(raw, 10));

        const next = { ...state, [c.key]: val };
        right.textContent = c.format ? c.format(val, next) : String(val);
        onChange(next);
      };

      input.addEventListener("input", update);
      input.addEventListener("change", update);

      root.appendChild(row);
      continue;
    }

    if (c.type === "note") {
      const row = el("div", { className: "row" }, [
        el("div", { className: "hint", textContent: c.text }),
      ]);
      root.appendChild(row);
      continue;
    }
  }
}
