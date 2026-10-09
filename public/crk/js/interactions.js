// --- Core UI Functions ---

      // Setup Back to Top
      function setupBackToTop() {
        const btn = document.getElementById("back-to-top");

        // Listen on all page containers via capture
        document.addEventListener(
          "scroll",
          (e) => {
            if (
              e.target &&
              e.target.classList &&
              e.target.classList.contains("page")
            ) {
              if (e.target.scrollTop > 120) {
                btn.classList.add("visible");
              } else {
                btn.classList.remove("visible");
              }
            }
          },
          true,
        );
      }

      function scrollToTop() {
        const activePage = document.querySelector(".page.active");
        if (activePage) {
          activePage.scrollTo({ top: 0, behavior: "smooth" });
        }
      }

      // Reset Modal Scroll
      function resetModalScroll(id) {
        const body = document.querySelector(`#${id} .modal-body`);
        if (body) body.scrollTop = 0;
      }

      // URL Cleaner
      function cleanUrl(url) {
        if (!url) return "";
        let clean = url.trim();
        // Wikimedia thumb: .../images/thumb/x/xx/Filename.ext/NNNpx-Filename.ext
        // → .../images/x/xx/Filename.ext  (keep hash dirs, drop /thumb/ and resize suffix)
        const wikiThumb = clean.match(
          /^(https?:\/\/.+?)\/images\/thumb\/(([^/]+\/[^/]+\/)([^/]+))\/.+$/,
        );
        if (wikiThumb) return `${wikiThumb[1]}/images/${wikiThumb[2]}`;
        if (clean.includes("/revision/")) clean = clean.split("/revision/")[0];
        else clean = clean.split("?")[0];
        return clean;
      }

      // URL Preview Tooltip
      function initUrlPreviews() {
        const tooltip = document.getElementById("url-tooltip");
        const img = document.getElementById("url-tooltip-img");

        // Broad selector for all inputs that might take an image URL
        const inputs = document.querySelectorAll(
          'input[placeholder*="URL"], input[id*="url"], input[id*="head"], input[id*="card"], input[id*="splash"], input[id*="sprite"], input[id*="bg"]',
        );

        inputs.forEach((input) => {
          input.addEventListener("mouseenter", (e) => {
            const val = cleanUrl(e.target.value);
            if (val) {
              img.src = val;
              tooltip.style.display = "block";
              // Initial positioning (will be updated by mousemove)
              tooltip.style.top = e.clientY + 15 + "px";
              tooltip.style.left = e.clientX + 15 + "px";
            }
          });
          input.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
          });
          input.addEventListener("mousemove", (e) => {
            // Follow cursor logic
            tooltip.style.top = e.clientY + 15 + "px";
            tooltip.style.left = e.clientX + 15 + "px";
          });
          input.addEventListener("input", (e) => {
            // dynamic update if hovering while typing
            const val = cleanUrl(e.target.value);
            if (val && tooltip.style.display === "block") img.src = val;
          });
        });
      }

      // Custom Confirmation Modal Logic
      let confirmCallback = null;

      function showConfirm(msg, onYes) {
        document.getElementById("confirm-message").innerText = msg;
        confirmCallback = onYes;
        document.getElementById("modal-confirm").classList.add("open");
      }

      document
        .getElementById("confirm-btn-yes")
        .addEventListener("click", () => {
          if (confirmCallback) confirmCallback();
          closeModal("modal-confirm");
          confirmCallback = null;
        });

      
      // --- Smart Text Logic ---
      function smartText(text) {
        if (!text) return "";

        // 1. Gather all replacement targets
        // Map ensures unique keys if a Cookie and Element share the exact same name (Cookie takes priority)
        const targetMap = new Map();

        // Elements (Lower priority in map, but length sort handles matching priority)
        appData.attributes.element.forEach((e) => {
          if (e.icon) {
            targetMap.set(
              e.name,
              `<span style="font-weight:800; color:var(--accent-blue); white-space:nowrap;"><img src="${e.icon}" class="rt-icon" style="width:20px;height:20px;vertical-align:middle;margin-right:2px;">${e.name}</span>`,
            );
          }
        });

        // Cookies (Higher priority in map)
        appData.cookies.forEach((c) => {
          if (c.images.head) {
            targetMap.set(
              c.name,
              `<span style="font-weight:800; color:var(--accent-pink); white-space:nowrap;"><img src="${c.images.head}" class="rt-icon" style="width:20px;height:20px;vertical-align:middle;margin-right:2px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);">${c.name}</span>`,
            );
          }
        });

        // 2. Create a list of names sorted by length (Longest first)
        // This ensures "Shadow Milk Cookie" is matched before "Milk Cookie"
        // and "Poison Mushroom Cookie" is matched before "Poison"
        const sortedNames = Array.from(targetMap.keys()).sort(
          (a, b) => b.length - a.length,
        );

        if (sortedNames.length === 0) return text.replace(/\n/g, "<br>");

        // 3. Build a single RegEx with alternation
        // Escape special characters for Regex
        const escapeRegExp = (string) =>
          string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = sortedNames.map(escapeRegExp).join("|");

        // Match whole words only (\b) to avoid matching inside other words
        const regex = new RegExp(`\\b(${pattern})\\b`, "g");

        // 4. Replace
        const processed = text.replace(regex, (match) => {
          return targetMap.get(match) || match;
        });

        return processed.replace(/\n/g, "<br>");
      }

      // --- Modal Logic ---
      let currentDetailId = null;
      let currentSkinIdx = null;
      let currentPowerupIdx = null;

      function openModal(id) {
        clearCycles(); // Clear cycles when opening a modal
        document.getElementById(id).classList.add("open");
        document.getElementById(id).setAttribute("aria-hidden","false");
        resetModalScroll(id);
        initUrlPreviews(); // Re-bind tooltips for form inputs inside modal

      }

      function closeModal(id) {
        const modal=document.getElementById(id);
        if(!modal)return;
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden","true");
      }

      // Reliable modal dismissal: Escape and backdrop click.
      document.addEventListener("keydown",(e)=>{
        if(e.key!=="Escape")return;
        const open=[...document.querySelectorAll(".modal.open")].pop();
        if(open)closeModal(open.id);
      });
      document.addEventListener("click",(e)=>{
        const modal=e.target.closest(".modal");
        if(modal && e.target===modal)closeModal(modal.id);
      });

      // --- Dropdown Logic ---
      // Stores option data keyed by dropdown id so URLs never go into onclick attrs
      const _dropdownData = {};

      
      function _openDropdown(id) {
        const container = document.getElementById(id);
        if (!container) return;
        const scope =
          container.closest(".modal-box") ||
          container.closest(".page") ||
          document;
        scope.querySelectorAll(".options-container.active").forEach((el) => {
          if (el.id !== id + "-opts") el.classList.remove("active");
        });
        const optEl = container.querySelector(".options-container");
        optEl.classList.add("active");
        _positionDropdown(container, optEl);
        const box = container.querySelector(".select-box");
        if (box) box.classList.add("active");
      }

      function _applyDropdownSelection(id, opt) {
        const container = document.getElementById(id);
        if (!container) return;
        container.dataset.value = opt.value;

        // Update leading icon
        const leadingIcon = container.querySelector(".select-leading-icon");
        if (leadingIcon) {
          if (opt.icon) {
            leadingIcon.outerHTML = `<img class="select-leading-icon" src="${opt.icon}">`;
          } else {
            if (leadingIcon.tagName === "IMG") {
              leadingIcon.outerHTML = `<span class="select-leading-icon select-leading-icon--empty"></span>`;
            }
          }
        }

        // Update input text
        const inputEl = container.querySelector(".select-input");
        if (inputEl) inputEl.value = opt.name;

        // Reset filter — show all options
        container
          .querySelectorAll(".option")
          .forEach((el) => (el.style.display = ""));
        const empty = container.querySelector(".options-empty");
        if (empty) empty.style.display = "none";

        // Close dropdown
        const optContainer = container.querySelector(".options-container");
        if (optContainer) optContainer.classList.remove("active");
        const box = container.querySelector(".select-box");
        if (box) box.classList.remove("active");
        // Update guest field visibility if rarity changed in cookie form
        if (id === "cf-rarity") updateGuestFieldVisibility();
      }

      function _positionDropdown(container, optionsEl) {
        const rect = container.getBoundingClientRect();
        optionsEl.style.width = rect.width + "px";
        optionsEl.style.left = rect.left + "px";
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropH = Math.min(250, optionsEl.scrollHeight || 200);
        if (spaceBelow >= dropH || spaceBelow >= spaceAbove) {
          optionsEl.style.top = rect.bottom + 4 + "px";
          optionsEl.style.bottom = "auto";
        } else {
          optionsEl.style.bottom = window.innerHeight - rect.top + 4 + "px";
          optionsEl.style.top = "auto";
        }
      }

      function toggleCustomDropdown(id) {
        const container = document.getElementById(id);
        if (!container) return;
        const optEl = container.querySelector(".options-container");
        const isOpen = optEl.classList.contains("active");
        if (isOpen) {
          optEl.classList.remove("active");
          const box = container.querySelector(".select-box");
          if (box) box.classList.remove("active");
          // Restore display text from current value
          const opts = _dropdownData[id] || [];
          const cur = opts.find(
            (o) => String(o.value) === String(container.dataset.value),
          );
          const inputEl = container.querySelector(".select-input");
          if (inputEl && cur) inputEl.value = cur.name;
          container
            .querySelectorAll(".option")
            .forEach((el) => (el.style.display = ""));
        } else {
          _openDropdown(id);
          const inputEl = container.querySelector(".select-input");
          if (inputEl) {
            inputEl.select();
          }
        }
      }

      function getDropdownValue(id) {
        const el = document.getElementById(id);
        return el ? el.dataset.value : "";
      }

      // Global Click Listener to close dropdowns
      document.addEventListener("click", (e) => {
        if (
          !e.target.closest(".custom-select") &&
          !e.target.closest(".multi-select")
        ) {
          document
            .querySelectorAll(".options-container.active")
            .forEach((el) => {
              el.classList.remove("active");
              // Restore input to current selected value
              const container = el.closest(".custom-select");
              if (container) {
                const id = container.id;
                const opts = _dropdownData[id] || [];
                const cur = opts.find(
                  (o) => String(o.value) === String(container.dataset.value),
                );
                const inputEl = container.querySelector(".select-input");
                if (inputEl && cur) inputEl.value = cur.name;
                container
                  .querySelectorAll(".option")
                  .forEach((opt) => (opt.style.display = ""));
                const empty = container.querySelector(".options-empty");
                if (empty) empty.style.display = "none";
              }
            });
          document
            .querySelectorAll(".select-box.active, .multi-select-box.active")
            .forEach((el) => el.classList.remove("active"));
        }
      });



/* ---------- Toast + custom dropdowns ---------- */
(function(){
  const {esc,NO_IMG,attrOf,attrIco,pic,ownerOf,headOf,headImg,glyph,isGlyph,clean}=window.crk;
  window.showToast = function (msg, type = "success") {
    const host = document.getElementById("toast-container"); if (!host) return;
    const ic = { success: "check_circle", error: "cancel", info: "info" }[type] || "info";
    const t = document.createElement("div");
    t.className = `toast toast-simple ${type}`;
    t.innerHTML = `${glyph(ic, "toast-icon")}<span>${esc(msg)}</span>`;
    host.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 220); }, 2300);
  };


  const optIcon = o => {
    if (!o.icon) return "";
    if (isGlyph(o.icon)) return glyph(o.icon, "opt-glyph");
    const cyc = o.cycle && o.cycle.length > 1 ? ` data-cycle='${esc(JSON.stringify(o.cycle))}' data-ci="0"` : "";
    return `<img class="select-leading-icon" src="${esc(o.icon)}" alt=""${cyc}>`;
  };
  setInterval(() => {
    document.querySelectorAll("img[data-cycle]").forEach(im => {
      try { const l = JSON.parse(im.dataset.cycle); im.dataset.ci = (+im.dataset.ci + 1) % l.length; im.src = l[im.dataset.ci]; } catch (_) {}
    });
  }, 1400);
  /* Multi-select dropdown (e.g. cookie elements): chips with attribute icons, options toggle without closing. */
  window.setupMultiSelect = function (id, options, selected) {
    const c = document.getElementById(id); if (!c) return;
    const list = (options || []).map(o => ({ name: o.name, icon: o.icon || "" }));
    const chosen = new Set((selected || []).filter(n => list.some(o => o.name === n)));
    c.classList.add("custom-select", "crk-multi");
    c.innerHTML = `<button type="button" class="select-box crk-select-button crk-multi-button" aria-haspopup="listbox" aria-expanded="false"><span class="crk-multi-value"></span>${glyph("expand_more", "select-arrow")}</button><div class="options-container crk-options crk-multi-options" role="listbox" aria-multiselectable="true">${list.map((o, i) => `<button type="button" class="option crk-option crk-multi-option" data-idx="${i}" role="option" aria-selected="false">${optIcon(o)}<span>${esc(o.name)}</span>${glyph("check", "multi-check")}</button>`).join("") || `<div class="empty-inline">No options available.</div>`}</div>`;
    const btn = c.querySelector(".crk-multi-button"), opts = c.querySelector(".crk-options"), val = c.querySelector(".crk-multi-value");
    const render = () => {
      const picked = list.filter(o => chosen.has(o.name));
      val.innerHTML = picked.length ? picked.map(o => `<span class="multi-chip">${optIcon(o)}<span>${esc(o.name)}</span></span>`).join("") : `<span class="multi-placeholder">Select...</span>`;
      c.querySelectorAll(".crk-multi-option").forEach(el => { const on = chosen.has(list[+el.dataset.idx].name); el.classList.toggle("selected", on); el.setAttribute("aria-selected", on); });
      c.dataset.values = JSON.stringify(picked.map(o => o.name));
    };
    btn.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".crk-options.active").forEach(x => { if (x !== opts) x.classList.remove("active"); });
      opts.classList.toggle("active"); btn.classList.toggle("active", opts.classList.contains("active"));
      btn.setAttribute("aria-expanded", opts.classList.contains("active"));
    });
    c.querySelectorAll(".crk-multi-option").forEach(el => el.addEventListener("click", e => {
      e.stopPropagation();
      const n = list[+el.dataset.idx].name; chosen.has(n) ? chosen.delete(n) : chosen.add(n); render();
    }));
    render();
  };
  window.getMultiSelectValues = id => { try { return JSON.parse(document.getElementById(id)?.dataset.values || "[]"); } catch (_) { return []; } };

  window.setupDropdown = function (id, options, initialValue) {
    const c = document.getElementById(id); if (!c) return;
    const list = (options || []).map(o => ({ name: o.name, value: o.value !== undefined ? o.value : o.name, icon: o.icon || "", cycle: o.cycle }));
    const sel = list.find(o => String(o.value) === String(initialValue)) || list[0] || { name: "Select...", value: "", icon: "" };
    c.dataset.value = sel.value;
    c.innerHTML = `<button type="button" class="select-box crk-select-button" aria-haspopup="listbox" aria-expanded="false"><span class="crk-selected-value">${optIcon(sel)}<span>${esc(sel.name)}</span></span>${glyph("expand_more", "select-arrow")}</button><div class="options-container crk-options" role="listbox">${list.map((o, i) => `<button type="button" class="option crk-option" data-idx="${i}" role="option">${optIcon(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>`;
    const btn = c.querySelector(".crk-select-button"), opts = c.querySelector(".crk-options");
    btn.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".crk-options.active").forEach(x => { if (x !== opts) x.classList.remove("active"); });
      opts.classList.toggle("active"); btn.classList.toggle("active", opts.classList.contains("active"));
      btn.setAttribute("aria-expanded", opts.classList.contains("active"));
    });
    c.querySelectorAll(".crk-option").forEach(o => o.addEventListener("click", e => {
      e.stopPropagation();
      const x = list[+o.dataset.idx]; c.dataset.value = x.value;
      c.querySelector(".crk-selected-value").innerHTML = `${optIcon(x)}<span>${esc(x.name)}</span>`;
      opts.classList.remove("active"); btn.classList.remove("active"); btn.setAttribute("aria-expanded", "false");
      if (id === "cf-rarity" && typeof updateGuestFieldVisibility === "function") updateGuestFieldVisibility();
    }));
  };


})();
