      /* MATRIX PAGE — cross-reference heroes by role, nation, lane, specialty */
      const MATRIX_CONFIG = {
        roles: {
          title: "Roles",
          icon: "shield_person",
          match: (h, v) => (h.roles || []).includes(v),
        },
        nations: {
          title: "Nations",
          icon: "public",
          match: (h, v) => h.nation === v,
        },
        lanes: {
          title: "Lanes",
          icon: "signpost",
          match: (h, v) => (h.lanes || []).includes(v),
        },
        specialties: {
          title: "Specialties",
          icon: "military_tech",
          match: (h, v) => (h.specialties || []).includes(v),
        },
      };
      let currentMatrixTab = "roles";

      function renderMatrixPage() {
        const tabsEl = document.getElementById("matrix-tabs");
        const container = document.getElementById("matrix-container");
        const attrs = getAttributes();
        const keys = Object.keys(MATRIX_CONFIG);
        if (!keys.includes(currentMatrixTab)) currentMatrixTab = keys[0];

        tabsEl.innerHTML = keys
          .map((key) => {
            const count = (attrs[key] || []).length;
            return `<button class="attr-tab${key === currentMatrixTab ? " active" : ""}" onclick="switchMatrixTab('${key}')">
              <span class="material-symbols-outlined" style="font-size:18px;">${MATRIX_CONFIG[key].icon}</span>
              ${MATRIX_CONFIG[key].title}
              <span class="attr-tab-count">${count}</span>
            </button>`;
          })
          .join("");

        const key = currentMatrixTab;
        const cfg = MATRIX_CONFIG[key];
        const heroes = getHeroes().sort((a, b) => a.name.localeCompare(b.name));
        const values = attrs[key] || [];

        if (!values.length) {
          container.innerHTML = `<div style="color:var(--text-med);font-size:0.85rem;">No ${cfg.title.toLowerCase()} defined yet. Add some in Attributes.</div>`;
          return;
        }

        const cards = values
          .map((v) => {
            const img = getAttrImage(key, v);
            const matched = heroes.filter((h) => cfg.match(h, v));
            const thumbHtml = img
              ? `<img src="${img}" class="matrix-group-thumb" onerror="this.style.display='none'">`
              : `<div class="matrix-group-thumb" style="display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="opacity:0.5;">${cfg.icon}</span></div>`;
            const heroesHtml = matched.length
              ? matched
                  .map(
                    (h) =>
                      `<div class="matrix-hero-avatar" onclick="openModal('hero','${h.id}')" title="${h.name}">
                        <img src="${h.portrait || h.icon || h.splashArt || ""}" onerror="this.style.opacity='0.2'">
                        <span>${h.name}</span>
                      </div>`,
                  )
                  .join("")
              : `<div style="color:var(--text-dark);font-size:0.78rem;">No heroes yet.</div>`;
            return `<div class="matrix-group-card">
              <div class="matrix-group-head">
                ${thumbHtml}
                <div class="matrix-group-name">${v}</div>
                <div class="matrix-group-count">${matched.length} hero${matched.length === 1 ? "" : "es"}</div>
              </div>
              <div class="matrix-hero-row">${heroesHtml}</div>
            </div>`;
          })
          .join("");

        container.innerHTML = `<div class="matrix-section"><div class="matrix-section-title"><span class="material-symbols-outlined">${cfg.icon}</span>${cfg.title}</div>${cards}</div>`;
      }

      function switchMatrixTab(key) {
        currentMatrixTab = key;
        renderMatrixPage();
      }

      function editAttributeFull(key, oldVal) {
        const hasImg = ATTR_IMAGE_KEYS.includes(key);
        const hasColor = ATTR_COLOR_KEYS.includes(key);
        const hasBg = ATTR_BG_KEYS.includes(key);
        const existing = getAttrImage(key, oldVal);
        const existingColor = getAttrColor(key, oldVal) || "#fbbf24";
        const existingBg = getAttrBg(key, oldVal);
        const existingGroupId = hasColor ? getTagGroupId(oldVal) : "";
        const groupOptsHtml = hasColor
          ? getSkillCatGroups()
              .map(
                (g) =>
                  `<option value="${g.id}"${g.id === existingGroupId ? " selected" : ""}>${g.name}</option>`,
              )
              .join("")
          : "";
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal" style="min-width:340px;"><h3 style="margin-top:0;">Edit "${oldVal}"</h3><label class="form-label">Name</label><input type="text" id="attr-edit-name" class="form-input" value="${oldVal.replace(/"/g, "&quot;")}" style="margin-bottom:1rem;">${hasImg ? `<label class="form-label">Image URL</label><input type="url" id="attr-edit-img" class="form-input" value="${existing.replace(/"/g, "&quot;")}" placeholder="https://..." style="margin-bottom:0.75rem;"><div id="attr-edit-preview" style="width:56px;height:56px;border-radius:10px;background:var(--bg-light);margin:0 auto 1rem;overflow:hidden;display:flex;align-items:center;justify-content:center;">${existing ? `<img src="${existing}" style="width:100%;height:100%;object-fit:contain;">` : ""}</div>` : ""}${hasBg ? `<label class="form-label">Background Image URL</label><input type="url" id="attr-edit-bg" class="form-input" value="${existingBg.replace(/"/g, "&quot;")}" placeholder="https://... (hero modal background)" style="margin-bottom:0.75rem;"><div id="attr-edit-bg-preview" style="width:100%;height:80px;border-radius:10px;background:var(--bg-light);margin:0 auto 1rem;overflow:hidden;background-size:cover;background-position:center;${existingBg ? `background-image:url('${existingBg}');` : ""}"></div>` : ""}${hasColor ? `<label class="form-label">Color Group</label><select id="attr-edit-group" class="form-select" style="margin-bottom:0.75rem;" onchange="onEditGroupChange()"><option value="">Custom color</option>${groupOptsHtml}</select><label class="form-label">Tag Color</label><div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;"><input type="color" id="attr-edit-color" class="form-input" value="${existingColor}" ${existingGroupId ? "disabled" : ""} style="width:52px;padding:2px;flex-shrink:0;"></div>` : ""}<div class="confirm-actions"><button class="btn btn-secondary" id="attr-edit-cancel">Cancel</button><button class="btn btn-primary" id="attr-edit-save">Save</button></div></div>`;
        document.body.appendChild(overlay);
        if (hasColor) {
          window.onEditGroupChange = () => {
            const gid = document.getElementById("attr-edit-group").value;
            const colorInp = document.getElementById("attr-edit-color");
            if (gid) {
              const g = findSkillCatGroup(gid);
              if (g) {
                colorInp.value = g.color;
                colorInp.disabled = true;
              }
            } else {
              colorInp.disabled = false;
            }
          };
        }
        if (hasImg) {
          const imgInp = document.getElementById("attr-edit-img");
          const prev = document.getElementById("attr-edit-preview");
          imgInp.oninput = () => {
            const v = imgInp.value.trim();
            prev.innerHTML = v
              ? `<img src="${v}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none'">`
              : "";
          };
        }
        if (hasBg) {
          const bgInp = document.getElementById("attr-edit-bg");
          const bgPrev = document.getElementById("attr-edit-bg-preview");
          bgInp.oninput = () => {
            const v = bgInp.value.trim();
            bgPrev.style.backgroundImage = v ? `url('${v}')` : "";
          };
        }
        document.getElementById("attr-edit-cancel").onclick = () =>
          overlay.remove();
        document.getElementById("attr-edit-save").onclick = () => {
          const newName = document
            .getElementById("attr-edit-name")
            .value.trim();
          if (!newName) {
            overlay.remove();
            return;
          }
          const a = getAttributes();
          const idx = a[key].indexOf(oldVal);
          if (idx === -1) {
            overlay.remove();
            return;
          }
          if (newName !== oldVal && a[key].includes(newName)) {
            showToast("Name already exists", "info");
            return;
          }
          a[key][idx] = newName;
          saveAttributes(a);
          if (hasImg) {
            const newImg = cleanImageUrl(
              document.getElementById("attr-edit-img").value.trim(),
            );
            const images = getAttributeImages();
            if (!images[key]) images[key] = {};
            if (oldVal !== newName && images[key][oldVal]) {
              images[key][newName] = images[key][oldVal];
              delete images[key][oldVal];
            }
            if (newImg) images[key][newName] = newImg;
            else delete images[key][newName];
            saveAttributeImages(images);
          }
          if (hasBg) {
            const newBg = cleanImageUrl(
              document.getElementById("attr-edit-bg").value.trim(),
            );
            const bgs = getAttributeBackgrounds();
            if (!bgs[key]) bgs[key] = {};
            if (oldVal !== newName && bgs[key][oldVal]) {
              bgs[key][newName] = bgs[key][oldVal];
              delete bgs[key][oldVal];
            }
            if (newBg) bgs[key][newName] = newBg;
            else delete bgs[key][newName];
            saveAttributeBackgrounds(bgs);
          }
          if (hasColor) {
            const newColor = document.getElementById("attr-edit-color").value;
            const colors = getAttributeColors();
            if (!colors[key]) colors[key] = {};
            if (oldVal !== newName && colors[key][oldVal]) {
              colors[key][newName] = colors[key][oldVal];
              delete colors[key][oldVal];
            }
            colors[key][newName] = newColor;
            saveAttributeColors(colors);
            const newGroupId = document.getElementById("attr-edit-group")
              ? document.getElementById("attr-edit-group").value
              : "";
            if (oldVal !== newName) setTagGroupId(oldVal, "");
            setTagGroupId(newName, newGroupId);
          }
          renderAttributesPage();
          populateFilters();
          showToast("Updated", "success");
          overlay.remove();
        };
      }

      function promptAttrImage(key, val) {
        const existing = getAttrImage(key, val);
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">Image for "${val}"</h3><input type="url" id="attr-img-input" class="form-input" value="${existing.replace(/"/g, "&quot;")}" placeholder="https://... image URL" style="margin-bottom:1rem;"><div id="attr-img-preview-box" style="width:64px;height:64px;border-radius:12px;background:var(--bg-light);margin:0 auto 1rem;overflow:hidden;display:flex;align-items:center;justify-content:center;">${existing ? `<img src="${existing}" style="width:100%;height:100%;object-fit:cover;">` : ""}</div><div class="confirm-actions"><button class="btn btn-secondary" id="attr-img-cancel">Cancel</button><button class="btn btn-danger btn-sm" id="attr-img-clear">Clear</button><button class="btn btn-primary" id="attr-img-save">Save</button></div></div>`;
        document.body.appendChild(overlay);
        const inp = document.getElementById("attr-img-input");
        const prev = document.getElementById("attr-img-preview-box");
        inp.oninput = () => {
          const v = inp.value.trim();
          prev.innerHTML = v
            ? `<img src="${v}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : "";
        };
        document.getElementById("attr-img-cancel").onclick = () =>
          overlay.remove();
        document.getElementById("attr-img-clear").onclick = () => {
          setAttrImage(key, val, "");
          renderAttributesPage();
          overlay.remove();
        };
        document.getElementById("attr-img-save").onclick = () => {
          const v = cleanImageUrl(inp.value.trim());
          setAttrImage(key, val, v);
          renderAttributesPage();
          overlay.remove();
          showToast("Image saved", "success");
        };
      }
      function addAttribute(key) {
        const v = document.getElementById(`input-${key}`).value.trim();
        if (!v) return;
        const a = getAttributes();
        if (!a[key]) a[key] = [];
        if (!a[key].includes(v)) {
          a[key].push(v);
          saveAttributes(a);
          // Save image if provided
          const imgInput = document.getElementById(`input-img-${key}`);
          if (imgInput && imgInput.value.trim()) {
            setAttrImage(key, v, cleanImageUrl(imgInput.value.trim()));
            imgInput.value = "";
          }
          // Save color if provided
          const colorInput = document.getElementById(`input-color-${key}`);
          if (colorInput && ATTR_COLOR_KEYS.includes(key)) {
            setAttrColor(key, v, colorInput.value);
          }
          // Save color group assignment if provided
          const groupInput = document.getElementById(`input-group-${key}`);
          if (groupInput) {
            setTagGroupId(v, groupInput.value);
          }
          renderAttributesPage();
          populateFilters();
          showToast("Added", "success");
        }
        document.getElementById(`input-${key}`).value = "";
      }
      function editAttribute(key, oldVal) {
        promptEdit("Edit Attribute", oldVal, (newVal) => {
          if (newVal === oldVal) {
            showToast("No changes made", "info");
            return;
          }
          const a = getAttributes();
          const idx = a[key].indexOf(oldVal);
          if (idx === -1) {
            showToast("Error: Value not found", "info");
            return;
          }
          if (a[key].includes(newVal)) {
            showToast("This value already exists", "info");
            return;
          }
          a[key][idx] = newVal;
          saveAttributes(a);
          renderAttributesPage();
          populateFilters();
          showToast("Updated", "success");
        });
      }
      function deleteAttribute(key, val) {
        showConfirm(`Delete "${val}"?`, () => {
          const a = getAttributes();
          a[key] = a[key].filter((v) => v !== val);
          saveAttributes(a);
          if (ATTR_COLOR_KEYS.includes(key)) setAttrColor(key, val, "");
          if (ATTR_BG_KEYS.includes(key)) setAttrBg(key, val, "");
          if (ATTR_COLOR_KEYS.includes(key)) setTagGroupId(val, "");
          renderAttributesPage();
          populateFilters();
          showToast("Deleted", "success");
        });
      }

      function cleanImageUrl(url) {
        if (!url) return "";
        url = url.replace(/\/thumb\//g, "/");
        if (url.includes("/revision/latest")) {
          // Fandom: strip scale/resize paths but keep /revision/latest?cb=TIMESTAMP
          return url.replace(
            /(\.(?:png|jpg|jpeg|webp))(?:\/[^?]*)?\/revision\/latest(?:\/[^?]*)?(\?cb=\d+)?[^#]*/i,
            "$1/revision/latest$2",
          );
        }
        // Everything else: strip query params / path suffixes after extension
        return url.replace(/(\.(?:png|jpg|jpeg|webp))[^#]*/i, "$1");
      }
      // Builds a data-cat-tooltip attribute (JSON list of category names) used to
      // render colored category tag pills on hover, instead of plain text.
      function buildCatTooltipAttr(categories) {
        if (!categories || !categories.length) return "";
        const json = JSON.stringify(categories).replace(/"/g, "&quot;");
        return ` data-cat-tooltip="${json}"`;
      }
      window.handleImageError = function (img) {
        img.src = "https://placehold.co/400x225?text=Image+Error";
        img.onerror = null;
      };
      function scrollToTop() {
        const m = document.querySelector(".main-content");
        if (m) m.scrollTo(0, 0);
      }

      // Save scroll position per page so edits restore position
      const _savedScrollPos = {};
      function saveScrollPos(pid) {
        const m = document.querySelector(".main-content");
        if (m && pid) _savedScrollPos[pid] = m.scrollTop;
      }
      function restoreScrollPos(pid) {
        const m = document.querySelector(".main-content");
        if (m && _savedScrollPos[pid] != null) {
          // Use setTimeout to let the page re-render before restoring
          setTimeout(
            () =>
              m.scrollTo({ top: _savedScrollPos[pid], behavior: "instant" }),
            0,
          );
        }
      }
      function setupSidebar() {
        const s = document.getElementById("sidebar");
        const c = document.querySelector(".main-content");
        if (localStorage.getItem(KEYS.SIDEBAR) === "true") {
          s.classList.add("collapsed");
          c.classList.add("sidebar-collapsed");
        }
        document.getElementById("toggle-sidebar").onclick = () => {
          s.classList.toggle("collapsed");
          c.classList.toggle("sidebar-collapsed");
          localStorage.setItem(KEYS.SIDEBAR, s.classList.contains("collapsed"));
        };

        const btn = document.getElementById("back-to-top");
        if (btn) {
          c.addEventListener("scroll", () => {
            if (c.scrollTop > 300) btn.classList.add("visible");
            else btn.classList.remove("visible");
          });
        }
      }
      function setupNavigation() {
        document.querySelectorAll(".sidebar-button[data-page]").forEach(
          (b) =>
            (b.onclick = () => {
              document
                .querySelectorAll(".sidebar-button")
                .forEach((btn) => btn.classList.remove("active"));
              b.classList.add("active");
              document
                .querySelectorAll(".page")
                .forEach((p) => p.classList.remove("active"));
              document.getElementById(b.dataset.page).classList.add("active");
              showPage(b.dataset.page);
            }),
        );
      }
      function showPage(pid, restoreScroll = false) {
        document
          .querySelectorAll(".page")
          .forEach((p) => p.classList.remove("active"));
        document.getElementById(pid).classList.add("active");
        currentPageId = pid;
        if (restoreScroll) {
          restoreScrollPos(pid);
        } else {
          scrollToTop();
        }
        if (pid === "page-heroes") renderHeroesPage();
        if (pid === "page-skins") renderSkinsPage();
        if (pid === "page-skin-count") renderSkinCountPage();
        if (pid === "page-upcoming") renderUpcomingPage();
        if (pid === "page-attributes") renderAttributesPage();
        if (pid === "page-matrix") renderMatrixPage();
        if (pid === "page-tier-list") renderTierListPage();
      }
      function showToast(m, t = "info") {
        const c = document.getElementById("toast-container");
        if (!c) return;
        const e = document.createElement("div");
        e.className = `toast toast-${t} toast-show`;
        e.innerHTML = `<span class="material-symbols-outlined">${t === "success" ? "check_circle" : "info"}</span><span>${m}</span>`;
        c.appendChild(e);
        setTimeout(() => {
          e.classList.remove("toast-show");
          e.classList.add("toast-hide");
          e.addEventListener("animationend", () => e.remove(), { once: true });
        }, 3000);
      }
      function goBackFromForm(rid) {
        const p = document.getElementById(rid).value;
        const target =
          p || (rid === "hero-return-page" ? "page-heroes" : "page-skins");
        showPage(target, true);
      }

      function populateFilters() {
        const attrs = getAttributes();
        const h = getHeroes().sort((a, b) => a.name.localeCompare(b.name));
        const fill = (id, list) => {
          const s = document.getElementById(id);
          if (s) {
            s.innerHTML = '<option value="">All</option>';
            (list || []).forEach(
              (i) => (s.innerHTML += `<option value="${i}">${i}</option>`),
            );
          }
        };
        fill("filter-hero-role", attrs.roles);
        fill("filter-hero-lane", attrs.lanes);
        fill("filter-hero-specialty", attrs.specialties);
        fill("filter-skin-rarity", attrs.skinRarities);
        decorateImageSelect(
          document.getElementById("filter-hero-role"),
          "roles",
        );
        decorateImageSelect(
          document.getElementById("filter-hero-lane"),
          "lanes",
        );
        decorateImageSelect(
          document.getElementById("filter-skin-rarity"),
          "skinRarities",
        );
        const cs = document.getElementById("filter-skin-collectible");
        if (cs) {
          cs.innerHTML = '<option value="">All</option>';
          ["Painted Skin", "Sacred Statue"].forEach(
            (t) =>
              (cs.innerHTML += `<option value="${t}" style="color:var(--accent)">${t}</option>`),
          );
          cs.innerHTML += "<option disabled>──────────</option>";
          (attrs.collectibleRarities || []).forEach(
            (i) => (cs.innerHTML += `<option value="${i}">${i}</option>`),
          );
        }
        const hs = document.getElementById("filter-skin-hero");
        if (hs) {
          hs.innerHTML = '<option value="">All Heroes</option>';
          h.forEach(
            (x) =>
              (hs.innerHTML += `<option value="${x.id}">${x.name}</option>`),
          );
        }
      }
      function populateSelect(id, list) {
        const s = document.getElementById(id);
        if (s) {
          s.innerHTML = '<option value="">Select...</option>';
          (list || []).forEach(
            (i) => (s.innerHTML += `<option value="${i}">${i}</option>`),
          );
        }
      }

      // Wraps a native <select> with a custom dropdown that shows each
      // option's attribute image (or color swatch) alongside its label.
      // The underlying <select> stays in the DOM (hidden) as the source of
      // truth so all existing .value reads and onchange handlers keep working.
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".img-select-wrap")) {
          document
            .querySelectorAll(".img-select-panel.open")
            .forEach((p) => p.classList.remove("open"));
        }
      });
      function decorateImageSelect(selectEl, key, mode = "image") {
        if (!selectEl) return;
        selectEl.style.display = "none";
        let wrap = selectEl.nextElementSibling;
        if (!wrap || !wrap.classList.contains("img-select-wrap")) {
          wrap = document.createElement("div");
          wrap.className = "img-select-wrap";
          selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);
        }
        const imgs = getAttributeImages()[key] || {};
        const cols = getAttributeColors()[key] || {};
        const opts = Array.from(selectEl.options);
        const swatchOrImg = (val, cls) => {
          if (mode === "color") {
            const c = cols[val] || "";
            return c
              ? `<span class="${cls} swatch" style="background:${c};"></span>`
              : `<span class="material-symbols-outlined placeholder">palette</span>`;
          }
          const img = imgs[val] || "";
          return img
            ? `<img src="${img}" class="${cls}" onerror="this.style.display='none'">`
            : `<span class="material-symbols-outlined placeholder">image</span>`;
        };
        const renderTrigger = () => {
          const opt = selectEl.options[selectEl.selectedIndex];
          const val = opt ? opt.value : "";
          const label = opt ? opt.textContent : "Select...";
          wrap.querySelector(".img-select-trigger").innerHTML = `
            ${val ? swatchOrImg(val, "img-select-thumb") : `<span class="img-select-thumb placeholder material-symbols-outlined">expand_more</span>`}
            <span class="img-select-label">${label}</span>
            <span class="material-symbols-outlined" style="font-size:16px;margin-left:auto;flex-shrink:0;">expand_more</span>`;
        };
        wrap.innerHTML = `<button type="button" class="img-select-trigger"></button><div class="img-select-panel"></div>`;
        const panel = wrap.querySelector(".img-select-panel");
        panel.innerHTML = opts
          .map(
            (o) =>
              `<div class="img-select-option" data-val="${o.value}">${o.value ? swatchOrImg(o.value, "") : ""}<span>${o.textContent}</span></div>`,
          )
          .join("");
        renderTrigger();
        wrap.querySelector(".img-select-trigger").onclick = (e) => {
          e.stopPropagation();
          const isOpen = panel.classList.contains("open");
          document
            .querySelectorAll(".img-select-panel.open")
            .forEach((p) => p.classList.remove("open"));
          if (!isOpen) panel.classList.add("open");
        };
        panel.querySelectorAll(".img-select-option").forEach((optEl) => {
          optEl.onclick = () => {
            selectEl.value = optEl.dataset.val;
            selectEl.dispatchEvent(new Event("change", { bubbles: true }));
            renderTrigger();
            panel.classList.remove("open");
          };
        });
      }

      /* TAGS */
      function renderTags(k) {
        const c = document.getElementById(`tags-${k}`);
        c.innerHTML = "";
        formTags[k].forEach((t, i) => {
          c.innerHTML += `<div class="tag-item"><span>${t}</span><span class="tag-remove" onclick="removeTag('${k}',${i})">&times;</span></div>`;
        });
      }
      function addTag(k, sid) {
        const v = document.getElementById(sid).value;
        if (v && !formTags[k].includes(v)) {
          formTags[k].push(v);
          renderTags(k);
          showToast("Added", "success");
        }
        document.getElementById(sid).value = "";
      }
      function removeTag(k, i) {
        formTags[k].splice(i, 1);
        renderTags(k);
        showToast("Removed", "success");
      }

      /* FORM LOGIC */
      function renderHeroFormPage(id = null, isUpcoming = false) {
        const src = currentPageId;
        saveScrollPos(src);
        showPage("page-hero-form");
        document.getElementById("hero-form").reset();
        document.getElementById("hero-skills-container").innerHTML = "";
        updateSkillHeaders();
        document.getElementById("hero-form-context").value = isUpcoming
          ? "upcoming"
          : "official";
        document.getElementById("hero-return-page").value = src;
        const attrs = getAttributes();
        formTags["hero-roles"] = [];
        formTags["hero-specialties"] = [];
        formTags["hero-lanes"] = [];
        populateSelect("sel-hero-roles", attrs.roles);
        populateSelect("sel-hero-specialties", attrs.specialties);
        populateSelect("sel-hero-lanes", attrs.lanes);
        renderTags("hero-roles");
        renderTags("hero-specialties");
        renderTags("hero-lanes");
        decorateImageSelect(document.getElementById("sel-hero-roles"), "roles");
        decorateImageSelect(document.getElementById("sel-hero-lanes"), "lanes");
        const natSel = document.getElementById("hero-nation");
        natSel.innerHTML =
          '<option value="">— None —</option>' +
          (attrs.nations || [])
            .map((n) => `<option value="${n}">${n}</option>`)
            .join("");
        decorateImageSelect(natSel, "nations");
        document.getElementById("hero-form-title").textContent =
          `${id ? "Edit" : "Add"} Hero${isUpcoming ? " (Upcoming)" : ""}`;
        if (id) {
          const h = (isUpcoming ? getUpcoming() : getHeroes()).find(
            (x) => x.id === id,
          );
          if (h) {
            document.getElementById("hero-id").value = h.id;
            document.getElementById("hero-name").value = h.name;
            document.getElementById("hero-portrait").value = h.portrait || "";
            document.getElementById("hero-splash-art").value =
              h.splashArt || "";
            document.getElementById("hero-icon").value = h.icon || "";
            document.getElementById("hero-release-date").value =
              h.releaseDate || "";
            document.getElementById("hero-price-bp").value = h.priceBP || "";
            document.getElementById("hero-price-diamonds").value =
              h.priceDiamonds || "";
            formTags["hero-roles"] = h.roles || [];
            formTags["hero-specialties"] = h.specialties || [];
            formTags["hero-lanes"] = h.lanes || [];
            renderTags("hero-roles");
            renderTags("hero-specialties");
            renderTags("hero-lanes");
            document.getElementById("hero-nation").value = h.nation || "";
            decorateImageSelect(
              document.getElementById("hero-nation"),
              "nations",
            );
            if (h.skills) h.skills.forEach((s) => addSkillInput(s));
            // sub-skills are restored inside addSkillInput
          }
        } else {
          document.getElementById("hero-id").value = "";
          addSkillInput();
        }
      }
      function addSkillInput(
        d = { name: "", icon: "", subSkills: [], categories: [] },
      ) {
        const container = document.getElementById("hero-skills-container");
        const wrap = document.createElement("div");
        wrap.className = "skill-main-row";
        wrap.dataset.categories = JSON.stringify(d.categories || []);
        wrap.innerHTML = `
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input type="text" class="form-input skill-name" placeholder="Skill Name (e.g. Fission Shot)" value="${(d.name || "").replace(/"/g, "&quot;")}" style="flex:2">
            <input type="url" class="form-input skill-icon-url" placeholder="Icon URL" value="${(d.icon || "").replace(/"/g, "&quot;")}" style="flex:3">
            <button type="button" class="btn btn-secondary btn-sm" onclick="addSubSkillInput(this)" title="Add sub-skill / variation" style="flex-shrink:0;white-space:nowrap;gap:4px;">
              <span class="material-symbols-outlined" style="font-size:14px;">add</span>Sub
            </button>
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.skill-main-row').remove()" style="flex-shrink:0;width:36px;justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
            </button>
          </div>
          <div class="skill-category-row" style="display:flex;gap:0.5rem;align-items:center;margin-top:0.4rem;">
            <span class="material-symbols-outlined" style="font-size:14px;color:var(--text-dark);flex-shrink:0;" title="Skill Category">sell</span>
            <div class="skill-category-tags tag-list" style="flex:1;min-height:32px;padding:0.3rem 0.5rem;gap:0.35rem;"></div>
            <select class="form-select skill-category-select" style="flex-shrink:0;width:170px;" onchange="addSkillCategoryTag(this)">
              <option value="">+ Category</option>
            </select>
          </div>
          <div class="skill-sub-container"></div>`;
        container.appendChild(wrap);
        renderSkillCategoryTags(wrap);
        // Restore sub-skills if editing
        if (d.subSkills && d.subSkills.length) {
          d.subSkills.forEach((ss) =>
            addSubSkillInput(wrap.querySelector(".skill-main-row button"), ss),
          );
        }
      }

      function renderSkillCategoryTags(row) {
        const tagsEl = row.querySelector(".skill-category-tags");
        const categories = JSON.parse(row.dataset.categories || "[]");
        tagsEl.innerHTML = categories.length
          ? categories
              .map((c) => {
                const esc = c.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const color = getAttrColor("skillCategories", c);
                const style = color
                  ? ` style="background:${color};color:#fff;"`
                  : "";
                return `<span class="tag-item"${style}>${c}<span class="tag-remove" onclick="removeSkillCategoryTag(this,'${esc}')">&times;</span></span>`;
              })
              .join("")
          : `<span style="color:var(--text-dark);font-size:0.78rem;">No categories</span>`;
        populateSkillCategorySelect(
          row.querySelector(".skill-category-select"),
          categories,
        );
      }

      function populateSkillCategorySelect(select, categories) {
        const attrs = getAttributes();
        const options = (attrs.skillCategories || []).filter(
          (c) => !categories.includes(c),
        );
        const groups = getSkillCatGroups();
        const tagGroupMap = getTagGroupMap();
        const grouped = {};
        const ungrouped = [];
        options.forEach((c) => {
          const gid = tagGroupMap[c];
          const g = gid && groups.find((x) => x.id === gid);
          if (g) {
            if (!grouped[g.id]) grouped[g.id] = { name: g.name, tags: [] };
            grouped[g.id].tags.push(c);
          } else {
            ungrouped.push(c);
          }
        });
        let html = `<option value="">+ Category</option>`;
        groups.forEach((g) => {
          const bucket = grouped[g.id];
          if (!bucket || !bucket.tags.length) return;
          const label = g.name.replace(/"/g, "&quot;");
          html += `<optgroup label="${label}" style="background-color:#020617;color:${g.color};">`;
          html += bucket.tags
            .map((c) => `<option value="${c}">${c}</option>`)
            .join("");
          html += `</optgroup>`;
        });
        if (ungrouped.length) {
          html += `<optgroup label="Ungrouped">`;
          html += ungrouped
            .map((c) => `<option value="${c}">${c}</option>`)
            .join("");
          html += `</optgroup>`;
        }
        select.innerHTML = html;
      }

      function addSkillCategoryTag(select) {
        const val = select.value;
        if (!val) return;
        const row = select.closest(".skill-main-row");
        let categories = JSON.parse(row.dataset.categories || "[]");
        if (!categories.includes(val)) categories.push(val);
        row.dataset.categories = JSON.stringify(categories);
        renderSkillCategoryTags(row);
      }

      function removeSkillCategoryTag(el, cat) {
        const row = el.closest(".skill-main-row");
        let categories = JSON.parse(row.dataset.categories || "[]");
        categories = categories.filter((c) => c !== cat);
        row.dataset.categories = JSON.stringify(categories);
        renderSkillCategoryTags(row);
      }

      function addSubSkillInput(btn, d = { name: "", icon: "" }) {
        const mainRow = btn.closest(".skill-main-row");
        const sub = mainRow.querySelector(".skill-sub-container");
        const div = document.createElement("div");
        div.className = "skill-sub-row";
        div.style.cssText = "display:flex;gap:0.5rem;align-items:center;";
        div.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;color:var(--text-dark);flex-shrink:0;">subdirectory_arrow_right</span><input type="text" class="form-input skill-sub-name" placeholder="Variation name" value="${(d.name || "").replace(/"/g, "&quot;")}" style="flex:2"><input type="url" class="form-input skill-sub-icon" placeholder="Icon URL" value="${(d.icon || "").replace(/"/g, "&quot;")}" style="flex:3"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="flex-shrink:0;width:36px;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>`;
        sub.appendChild(div);
      }

      function updateSkillHeaders() {
        /* no-op — kept for compat */
      }
      function deleteHero(id, isUp) {
        showConfirm("Delete Hero?", () => {
          const l = isUp ? getUpcoming() : getHeroes();
          const n = l.filter((x) => x.id !== id);
          isUp ? saveUpcoming(n) : saveHeroes(n);
          isUp ? renderUpcomingPage() : renderHeroesPage();
          showToast("Deleted", "success");
        });
      }

      document.getElementById("hero-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const id =
          document.getElementById("hero-id").value || Date.now().toString();
        const ctx = document.getElementById("hero-form-context").value;
        const skills = [];
        document
          .querySelectorAll("#hero-skills-container .skill-main-row")
          .forEach((r) => {
            const subSkills = [];
            r.querySelectorAll(".skill-sub-row").forEach((sr) => {
              const sName = sr.querySelector(".skill-sub-name").value;
              const sIcon = cleanImageUrl(
                sr.querySelector(".skill-sub-icon").value,
              );
              if (sName || sIcon) subSkills.push({ name: sName, icon: sIcon });
            });
            skills.push({
              name: r.querySelector(".skill-name").value,
              icon: cleanImageUrl(r.querySelector(".skill-icon-url").value),
              categories: JSON.parse(r.dataset.categories || "[]"),
              subSkills,
            });
          });
        const h = {
          id,
          name: document.getElementById("hero-name").value,
          roles: formTags["hero-roles"],
          specialties: formTags["hero-specialties"],
          lanes: formTags["hero-lanes"],
          nation: document.getElementById("hero-nation").value,
          portrait: cleanImageUrl(
            document.getElementById("hero-portrait").value,
          ),
          splashArt: cleanImageUrl(
            document.getElementById("hero-splash-art").value,
          ),
          icon: cleanImageUrl(document.getElementById("hero-icon").value),
          skills,
          releaseDate: document.getElementById("hero-release-date").value || "",
          priceBP: document.getElementById("hero-price-bp").value || "",
          priceDiamonds:
            document.getElementById("hero-price-diamonds").value || "",
          addedAt: (() => {
            const existing = (
              ctx === "upcoming" ? getUpcoming() : getHeroes()
            ).find((x) => x.id === id);
            return existing && existing.addedAt ? existing.addedAt : Date.now();
          })(),
          firstAddedAt: (() => {
            const existing = (
              ctx === "upcoming" ? getUpcoming() : getHeroes()
            ).find((x) => x.id === id);
            return existing && existing.firstAddedAt
              ? existing.firstAddedAt
              : existing
                ? null
                : Date.now();
          })(),
        };
        const list = ctx === "upcoming" ? getUpcoming() : getHeroes();
        if (ctx === "upcoming") h.itemType = "hero";
        const idx = list.findIndex((x) => x.id === id);
        if (idx > -1) list[idx] = h;
        else list.push(h);
        ctx === "upcoming" ? saveUpcoming(list) : saveHeroes(list);
        showToast("Saved!", "success");
        if (ctx !== "upcoming") populateFilters();
        goBackFromForm("hero-return-page");
      });

      function toggleSkinType() {
        const isStatue = document.getElementById("is-sacred-statue").checked;
        document.getElementById("skin-only-fields").style.display = isStatue
          ? "none"
          : "block";
        document.getElementById("painted-skins-section").style.display =
          isStatue ? "none" : "block";
      }
      function updateSkinSkillInputs() {
        const hid = document.getElementById("skin-hero-id").value;
        const c = document.getElementById("skin-skill-variants-container");
        c.innerHTML = "";
        if (!hid) return;
        const h = getHeroById(hid);
        if (!h || !h.skills) return;
        h.skills.forEach((s, i) => {
          const d = document.createElement("div");
          d.className = "form-group skill-variant-group";
          d.dataset.skillIndex = i;
          // Sub-skill rows
          const subRows = (s.subSkills || [])
            .map(
              (ss, j) =>
                `<div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.4rem;padding-left:1.5rem;">
              <span class="material-symbols-outlined" style="font-size:13px;color:var(--text-dark);flex-shrink:0;">subdirectory_arrow_right</span>
              <img src="${ss.icon || s.icon || ""}" style="width:22px;height:22px;opacity:0.5;border-radius:5px;flex-shrink:0;" onerror="this.style.opacity='0.2'">
              <span style="font-size:0.72rem;color:var(--text-dark);flex-shrink:0;min-width:60px;">${ss.name || "Variation " + (j + 1)}</span>
              <input type="url" class="form-input skill-sub-variant-input" data-skill="${i}" data-sub="${j}" placeholder="URL..." style="flex:1;">
            </div>`,
            )
            .join("");
          d.innerHTML = `
            <label class="form-label">${s.name}</label>
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <img src="${s.icon || ""}" style="width:28px;height:28px;opacity:0.6;border-radius:7px;flex-shrink:0;" onerror="this.style.opacity='0.2'">
              <input type="url" class="form-input skill-variant-input" data-index="${i}" placeholder="Main icon URL..." style="flex:1;">
            </div>
            ${subRows}`;
          c.appendChild(d);
        });
      }
      function updateSkinDynamicFields() {
        const c = document.getElementById("skin-dynamic-fields");
        const r = document.getElementById("skin-rarity-select").value;
        const col = document.getElementById("skin-collectible-select").value;
        const str = (r + " " + col).toLowerCase();
        let h = "";
        if (str.includes("starlight") && !str.includes("annual"))
          h += `<div class="form-grid"><div class="form-group"><label class="form-label">Month</label><select class="form-select dyn-field" name="starlightMonth"><option value="">Select</option>${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => `<option value="${m}">${m}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">Year</label><input type="number" class="form-input dyn-field" name="starlightYear"></div></div>`;
        if (
          str.includes("annual") ||
          str.includes("mythic") ||
          str.includes("msc") ||
          str.includes("collector") ||
          str.includes("luckybox")
        ) {
          if (str.includes("collector") || str.includes("luckybox"))
            h += `<div class="form-grid"><div class="form-group"><label class="form-label">Month</label><select class="form-select dyn-field" name="releaseMonth"><option value="">Select</option>${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => `<option value="${m}">${m}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">Year</label><input type="number" class="form-input dyn-field" name="releaseYear"></div></div>`;
          else
            h += `<div class="form-group"><label class="form-label">Year</label><input type="number" class="form-input dyn-field" name="releaseYear"></div>`;
        }
        if (
          str.includes("seasonal") ||
          str.includes("purchase") ||
          str.includes("season")
        )
          h += `<div class="form-group"><label class="form-label">Season</label><input type="text" class="form-input dyn-field" name="seasonNumber"></div>`;
        if (str.includes("anniversary"))
          h += `<div class="form-group"><label class="form-label">Anniversary Year</label><input type="text" class="form-input dyn-field" name="anniversaryYear"></div>`;
        if (
          str.includes("m-series") ||
          str.includes("m1") ||
          str.includes("m2") ||
          str.includes("m3") ||
          str.includes("prime") ||
          str.includes("championship") ||
          str.includes("mvp")
        )
          h += `<div class="form-group"><label class="form-label">M-Series</label><input type="text" class="form-input dyn-field" name="mSeries"></div>`;
        c.innerHTML = h;
        c.style.display = h ? "block" : "none";
      }
      function renderSkinForm(id = null, isUpcoming = false) {
        const src = currentPageId;
        saveScrollPos(src);
        showPage("page-skin-form");
        scrollToTop();
        document.getElementById("skin-form").reset();
        document.getElementById("skin-form-context").value = isUpcoming
          ? "upcoming"
          : "official";
        document.getElementById("skin-return-page").value = src;
        const sel = document.getElementById("skin-hero-id");
        sel.innerHTML = "";
        const heroSources = isUpcoming
          ? [
              ...getHeroes(),
              ...getUpcoming().filter((x) => x.itemType === "hero"),
            ]
          : getHeroes();
        if (heroSources.length === 0) {
          const o = document.createElement("option");
          o.value = "";
          o.textContent = "— No heroes found —";
          sel.appendChild(o);
        } else {
          heroSources.forEach((h) => {
            const o = document.createElement("option");
            o.value = h.id;
            o.textContent =
              h.name + (h.itemType === "hero" ? " (Upcoming)" : "");
            sel.appendChild(o);
          });
        }
        document.getElementById("painted-skins-container").innerHTML = "";
        document.getElementById("skin-skill-variants-container").innerHTML = "";
        document.getElementById("skin-dynamic-fields").innerHTML = "";
        const attrs = getAttributes();
        populateSelect("skin-rarity-select", attrs.skinRarities);
        populateSelect("skin-collectible-select", attrs.collectibleRarities);
        decorateImageSelect(
          document.getElementById("skin-rarity-select"),
          "skinRarities",
        );
        document.getElementById("skin-form-title").textContent =
          `${id ? "Edit" : "Add"} Item${isUpcoming ? " (Upcoming)" : ""}`;
        if (id) {
          const s = (isUpcoming ? getUpcoming() : getSkins()).find(
            (x) => x.id === id,
          );
          if (s) {
            document.getElementById("skin-id").value = s.id;
            document.getElementById("skin-hero-id").value = s.heroId;
            document.getElementById("skin-name").value = s.name;
            document.getElementById("skin-portrait").value = s.portrait || "";
            document.getElementById("skin-splash-art").value =
              s.splashArt || s.imageUrl || "";
            document.getElementById("skin-icon").value = s.icon || "";
            if (document.getElementById("skin-release-date"))
              document.getElementById("skin-release-date").value =
                s.releaseDate || "";
            if (document.getElementById("skin-price-diamonds"))
              document.getElementById("skin-price-diamonds").value =
                s.priceDiamonds || "";
            const isStatue = s.type === "statue";
            document.getElementById("is-sacred-statue").checked = isStatue;
            toggleSkinType();
            if (!isStatue) {
              document.getElementById("skin-rarity-select").value =
                s.rarity || "";
              decorateImageSelect(
                document.getElementById("skin-rarity-select"),
                "skinRarities",
              );
              document.getElementById("skin-collectible-select").value =
                s.collectible || "";
              document.getElementById("skin-tag-override").value =
                s.skinTag || "";
              const showSkills = !!s.showSkillIcons;
              document.getElementById("skin-show-skills").checked = showSkills;
              document.getElementById(
                "skin-skill-override-panel",
              ).style.display = showSkills ? "block" : "none";
              updateSkinDynamicFields();
              if (s.tagDetails)
                document.querySelectorAll(".dyn-field").forEach((i) => {
                  if (s.tagDetails[i.name]) i.value = s.tagDetails[i.name];
                });
              if (s.paintedSkins)
                s.paintedSkins.forEach((p) => addPaintedSkinInput(p));
              updateSkinSkillInputs();
              if (s.variantSkills) {
                s.variantSkills.forEach((v, i) => {
                  // Support both old flat string format and new object format
                  const mainUrl = typeof v === "string" ? v : v.main || "";
                  const subUrls = typeof v === "object" ? v.subs || [] : [];
                  const mainInp = document.querySelector(
                    `.skill-variant-input[data-index="${i}"]`,
                  );
                  if (mainInp) mainInp.value = mainUrl;
                  subUrls.forEach((url, j) => {
                    const subInp = document.querySelector(
                      `.skill-sub-variant-input[data-skill="${i}"][data-sub="${j}"]`,
                    );
                    if (subInp) subInp.value = url;
                  });
                });
              }
            }
          }
        } else {
          document.getElementById("skin-id").value = "";
          document.getElementById("is-sacred-statue").checked = false;
          toggleSkinType();
        }
      }

      document.getElementById("skin-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const id =
          document.getElementById("skin-id").value || Date.now().toString();
        const ctx = document.getElementById("skin-form-context").value;
        const isStatue = document.getElementById("is-sacred-statue").checked;
        const type = isStatue ? "statue" : "skin";
        const s = {
          id,
          type,
          heroId: document.getElementById("skin-hero-id").value,
          name: document.getElementById("skin-name").value,
          portrait: cleanImageUrl(
            document.getElementById("skin-portrait").value,
          ),
          splashArt: cleanImageUrl(
            document.getElementById("skin-splash-art").value,
          ),
          icon: cleanImageUrl(document.getElementById("skin-icon").value),
          releaseDate: document.getElementById("skin-release-date")
            ? document.getElementById("skin-release-date").value || ""
            : "",
          priceDiamonds: document.getElementById("skin-price-diamonds")
            ? document.getElementById("skin-price-diamonds").value || ""
            : "",
          addedAt: Date.now(),
        };
        if (!isStatue) {
          s.rarity = document.getElementById("skin-rarity-select").value;
          s.collectible = document.getElementById(
            "skin-collectible-select",
          ).value;
          s.skinTag = cleanImageUrl(
            document.getElementById("skin-tag-override").value.trim(),
          );
          s.showSkillIcons =
            document.getElementById("skin-show-skills").checked;
          s.tagDetails = {};
          document.querySelectorAll(".dyn-field").forEach((i) => {
            if (i.value) s.tagDetails[i.name] = i.value;
          });
          s.paintedSkins = [];
          document
            .querySelectorAll("#painted-skins-container > div")
            .forEach((r) => {
              s.paintedSkins.push({
                name: r.querySelector(".ps-name").value,
                splashArt: cleanImageUrl(r.querySelector(".ps-splash").value),
                icon: cleanImageUrl(r.querySelector(".ps-icon").value),
                portrait: cleanImageUrl(r.querySelector(".ps-portrait").value),
              });
            });
          const si = document.querySelectorAll(".skill-variant-input");
          if (si.length > 0) {
            s.variantSkills = Array.from(si).map((inp) => {
              const skillIdx = parseInt(inp.dataset.index);
              const subInputs = document.querySelectorAll(
                `.skill-sub-variant-input[data-skill="${skillIdx}"]`,
              );
              const subs = Array.from(subInputs).map((si2) =>
                cleanImageUrl(si2.value),
              );
              return { main: cleanImageUrl(inp.value), subs };
            });
          }
        }
        const list = ctx === "upcoming" ? getUpcoming() : getSkins();
        if (ctx === "upcoming") s.itemType = "skin";
        const idx = list.findIndex((x) => x.id === id);
        if (idx > -1) list[idx] = s;
        else list.push(s);
        ctx === "upcoming" ? saveUpcoming(list) : saveSkins(list);
        showToast("Saved!", "success");
        goBackFromForm("skin-return-page");
      });

      function getSortedData(d, m) {
        const c = [...d];
        if (m === "newest") return c.reverse();
        if (m === "oldest") return c;
        if (m === "az") return c.sort((a, b) => a.name.localeCompare(b.name));
        if (m === "za") return c.sort((a, b) => b.name.localeCompare(a.name));
        return c;
      }
      function getSkinDateValue(s) {
        if (!s.tagDetails) return -999999;
        const d = s.tagDetails;
        const m = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        if (d.starlightYear || d.releaseYear) {
          const y = parseInt(d.starlightYear || d.releaseYear) || 0;
          let mo = 0;
          const ms = d.starlightMonth || d.releaseMonth;
          if (ms) mo = m.indexOf(ms);
          return y * 12 + (mo === -1 ? 0 : mo);
        }
        if (d.seasonNumber)
          return parseInt(d.seasonNumber.replace(/\D/g, "")) || 0;
        if (d.mSeries) return parseInt(d.mSeries.replace(/\D/g, "")) || 0;
        if (d.anniversaryYear)
          return parseInt(d.anniversaryYear.replace(/\D/g, "")) || 0;
        return -999999;
      }
      function getSkinExtraInfo(s) {
        if (!s.tagDetails) return "";
        const d = s.tagDetails;
        const p = [];
        if (d.starlightMonth && d.starlightYear)
          p.push(`${d.starlightMonth} ${d.starlightYear}`);
        else if (d.starlightYear) p.push(`Starlight ${d.starlightYear}`);
        if (d.releaseMonth && d.releaseYear)
          p.push(`${d.releaseMonth} ${d.releaseYear}`);
        else if (d.releaseYear) p.push(d.releaseYear);
        if (d.seasonNumber) p.push(`Season ${d.seasonNumber}`);
        if (d.anniversaryYear) p.push(d.anniversaryYear);
        if (d.mSeries) p.push(d.mSeries);
        return p.join(" • ");
      }

      function createRolesBadge(roles) {
        if (!roles || roles.length === 0) return "";
        const norm = (r) =>
          r
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z\-]/g, "");
        if (roles.length === 1) {
          const v = `var(--role-${norm(roles[0])}, #555)`;
          return `<span class="role-badge" style="background: ${v}">${roles[0]}</span>`;
        }
        const vars = roles.map((r) => `var(--role-${norm(r)}, #555)`);
        const grad = `linear-gradient(135deg, ${vars.join(", ")})`;
        return `<span class="role-badge" style="background: ${grad}">${roles.join(" • ")}</span>`;
      }

      // Build attr tag strip with optional icon image
      function buildAttrTags(values, attrKey) {
        if (!values || values.length === 0) return "";
        const imgs = getAttributeImages();
        const keyImgs = imgs[attrKey] || {};
        return values
          .map((v) => {
            const imgUrl = keyImgs[v];
            const imgHtml = imgUrl
              ? `<img src="${imgUrl}" style="width:14px;height:14px;object-fit:contain;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`
              : "";
            return `<span class="attr-tag">${imgHtml}${v}</span>`;
          })
          .join("");
      }

      function getSkinImageWithFallback(
        skin,
        imageType,
        skinFallbackSrc = null,
      ) {
        const imageMap = {
          splash: () => skin.splashArt || skin.imageUrl,
          portrait: () => skin.portrait,
          icon: () => skin.icon || skin.headIconUrl,
        };
        const skinImg = imageMap[imageType]?.();
        if (skinImg) return { src: skinImg };

        if (skinFallbackSrc) return { src: skinFallbackSrc, isGreyed: true };

        const hero = getHeroById(skin.heroId);
        if (!hero)
          return { src: "https://placehold.co/400x225", isGreyed: true };

        const fallbackMap = {
          splash: () => hero.splashArt || hero.imageUrl,
          portrait: () => hero.portrait || hero.imageUrl,
          icon: () => hero.icon || hero.headIconUrl,
        };
        const heroImg = fallbackMap[imageType]?.();
        return {
          src: heroImg || "https://placehold.co/400x225",
          isGreyed: true,
        };
      }

      // Resolve painted skin image with proper fallback chain:
      // paintedSkin.splash -> baseSkin.splash -> hero.splash -> placeholder
      function getPaintedSkinImage(paintedSkin, baseSkin, imageType) {
        const typeMap = {
          splash: () => paintedSkin.splashArt || paintedSkin.splash,
          icon: () => paintedSkin.icon,
        };
        const img = typeMap[imageType]?.();
        if (img) return { src: img, isGreyed: false };

        // Fallback to base skin
        const baseMap = {
          splash: () => baseSkin.splashArt || baseSkin.imageUrl,
          icon: () => baseSkin.icon || baseSkin.headIconUrl,
        };
        const baseImg = baseMap[imageType]?.();
        if (baseImg) return { src: baseImg, isGreyed: true };

        // Fallback to hero
        const hero = getHeroById(baseSkin.heroId);
        if (hero) {
          const heroMap = {
            splash: () => hero.splashArt || hero.imageUrl,
            icon: () => hero.icon || hero.headIconUrl,
          };
          const heroImg = heroMap[imageType]?.();
          if (heroImg) return { src: heroImg, isGreyed: true };
        }
        return { src: "https://placehold.co/400x225", isGreyed: true };
      }

      function renderHeroesPage() {
        const g = document.getElementById("hero-grid");
        g.innerHTML = "";
        const fRole = document.getElementById("filter-hero-role").value;
        const fLane = document.getElementById("filter-hero-lane").value;
        const fSpec = document.getElementById("filter-hero-specialty").value;
        const fSearch = document
          .getElementById("filter-hero-search")
          .value.toLowerCase();
        let h = getHeroes();
        if (fRole || fLane || fSpec || fSearch)
          h = h.filter((x) => {
            if (fRole && !x.roles.includes(fRole)) return false;
            if (fLane && !x.lanes?.includes(fLane)) return false;
            if (fSpec && !x.specialties?.includes(fSpec)) return false;
            if (fSearch && !x.name.toLowerCase().includes(fSearch))
              return false;
            return true;
          });
        h = applySortPill(h, "heroes");
        h = applyStarredSort(h);
        const starred = getStarred();
        const frag = document.createDocumentFragment();

        const normRole = (r) =>
          r
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z\-]/g, "");
        h.forEach((x) => {
          const c = document.createElement("div");
          const isStarredCard = !!starred[x.id];
          c.className = "unified-card" + (isStarredCard ? " starred-card" : "");
          // Remove card-level tooltip; skill icons have their own title attribute
          c.onclick = (e) => {
            if (!e.target.closest(".card-overlay-actions"))
              openModal("hero", x.id);
          };

          let glowStyle = "transparent";
          if (x.roles && x.roles.length > 0) {
            const colors = x.roles.map(
              (r) => `var(--role-${normRole(r)}, #555)`,
            );
            if (colors.length === 1) glowStyle = colors[0];
            else glowStyle = `linear-gradient(135deg, ${colors.join(", ")})`;
          }
          c.style.setProperty("--card-glow", glowStyle);

          // Attr tags — all inline in one row
          const allTagsHtml = [
            buildAttrTags(x.roles, "roles"),
            buildAttrTags(x.lanes, "lanes"),
            buildAttrTags(x.specialties, "specialties"),
          ]
            .filter(Boolean)
            .join("");
          const attrStripHtml = allTagsHtml
            ? `<div class="attr-tag-row">${allTagsHtml}</div>`
            : "";

          // Skill icons strip - sub-skills cycle on hover
          let skillsHtml = "";
          if (x.skills && x.skills.length > 0) {
            const skillItems = x.skills
              .map((s) => {
                const all = [
                  { name: s.name, icon: s.icon || "" },
                  ...(s.subSkills || []).map((ss) => ({
                    name: ss.name || s.name,
                    // chain: sub icon → greyed parent icon
                    icon: ss.icon || s.icon || "",
                    greyed: !ss.icon,
                  })),
                ];
                const hasSubs = all.length > 1;
                return `<div class="card-skill-strip-wrapper" data-skill-name="${s.name.replace(/"/g, "&quot;")}" data-skill-variants="${encodeURIComponent(JSON.stringify(all))}" onmouseenter="startSkillCycle(this)" onmouseleave="stopSkillCycle(this)"><img src="${s.icon || ""}" class="card-skill-strip-icon${hasSubs ? " sub-cycling" : ""}" onerror="this.src=''"></div>`;
              })
              .join("");
            skillsHtml = `<div class="card-skill-strip">${skillItems}</div>`;
          }

          // Release date and price
          let metaHtml = "";
          if (x.releaseDate || x.priceBP || x.priceDiamonds) {
            metaHtml = '<div class="card-meta-row">';
            if (x.releaseDate)
              metaHtml += `<span class="card-meta-item"><span class="material-symbols-outlined card-meta-icon">calendar_month</span>${x.releaseDate}</span>`;
            if (x.priceBP)
              metaHtml += `<span class="card-meta-item"><svg class="card-meta-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><text x="10" y="14.5" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">BP</text></svg>${x.priceBP}</span>`;
            if (x.priceDiamonds)
              metaHtml += `<span class="card-meta-item"><svg class="card-meta-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="10,2 18,8 10,18 2,8" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polygon points="10,2 14,8 10,11 6,8" fill="currentColor" opacity="0.35"/></svg>${x.priceDiamonds}</span>`;
            metaHtml += "</div>";
          }

          const starIcon = isStarredCard ? "star" : "star_border";
          const starClass = isStarredCard ? "starred" : "";
          c.innerHTML = `<div class="card-image-wrapper"><img src="${x.splashArt || "https://placehold.co/400x225"}" class="card-image" loading="lazy">${skillsHtml}<div class="card-overlay-actions"><div class="overlay-btn star ${starClass}" onclick="event.stopPropagation();toggleStar('${x.id}',renderHeroesPage)"><span class="material-symbols-outlined">${starIcon}</span></div><div class="overlay-btn" onclick="renderHeroFormPage('${x.id}',false)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteHero('${x.id}',false)"><span class="material-symbols-outlined">delete</span></div></div></div><div class="card-content"><h3 class="card-title">${x.name}</h3>${attrStripHtml}${metaHtml}</div>`;
          frag.appendChild(c);
        });
        g.appendChild(frag);
        requestAnimationFrame(initAllSkillCycles);
      }

      function addPaintedSkinInput(
        d = { name: "", splashArt: "", icon: "", portrait: "" },
      ) {
        const div = document.createElement("div");
        div.style.cssText =
          "display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;";
        div.innerHTML = `<input type="text" class="form-input ps-name" placeholder="Name" value="${d.name}" style="flex:1"><input type="url" class="form-input ps-portrait" placeholder="Portrait URL" value="${d.portrait || ""}" style="flex:1"><input type="url" class="form-input ps-splash" placeholder="Splash Art URL" value="${d.splashArt || ""}" style="flex:1"><input type="url" class="form-input ps-icon" placeholder="Icon URL" value="${d.icon || ""}" style="flex:1"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>`;
        document.getElementById("painted-skins-container").appendChild(div);
      }

      function renderSkinModalContent(s, c) {
        const h =
          getHeroById(s.heroId) ||
          getUpcoming().find((x) => x.id === s.heroId && x.itemType === "hero");
        let skH = "";
        if (h && h.skills) {
          const rawV = s.variantSkills || [];
          const skillsMarkup = h.skills
            .map((k, i) => {
              const rv = rawV[i];
              const mainOverride = rv
                ? typeof rv === "string"
                  ? rv
                  : rv.main || ""
                : "";
              const subOverrides =
                rv && typeof rv === "object" ? rv.subs || [] : [];
              // 1. Checkbox unchecked → original, full color
              // 2. Checkbox checked + URL → override, full color
              // 3. Checkbox checked + no URL → original, greyed
              const mainIcon = mainOverride || k.icon || "";
              const mainGreyed = s.showSkillIcons && !mainOverride;
              const allVariants = [
                { name: k.name, icon: mainIcon, greyed: mainGreyed },
                ...(k.subSkills || []).map((ss, j) => {
                  const subUrl = subOverrides[j] || "";
                  if (!s.showSkillIcons) {
                    // Checkbox off → original sub icon, full color
                    return {
                      name: ss.name || k.name,
                      icon: ss.icon || k.icon || "",
                      greyed: false,
                    };
                  } else if (subUrl) {
                    // Sub override entered → full color
                    return {
                      name: ss.name || k.name,
                      icon: subUrl,
                      greyed: false,
                    };
                  } else if (mainOverride) {
                    // No sub URL but parent override exists → parent override, greyed
                    return {
                      name: ss.name || k.name,
                      icon: mainOverride,
                      greyed: true,
                    };
                  } else {
                    // No sub or parent override → original hero sub/parent icon, greyed
                    return {
                      name: ss.name || k.name,
                      icon: ss.icon || k.icon || "",
                      greyed: true,
                    };
                  }
                }),
              ];
              const safeJson = encodeURIComponent(JSON.stringify(allVariants));
              const hasSubs = allVariants.length > 1;
              const subDots = hasSubs
                ? `<div style="display:flex;justify-content:center;gap:3px;margin-top:3px;">${allVariants.map((_, j) => `<div style="width:5px;height:5px;border-radius:50%;background:${j === 0 ? "var(--accent)" : "rgba(255,255,255,0.25)"};" class="modal-skill-dot"></div>`).join("")}</div>`
                : "";
              const catTooltip = buildCatTooltipAttr(k.categories);
              return `<div class="skill-item modal-skill-cycler${hasSubs ? " has-subs" : ""}" data-skill-variants="${safeJson}" data-skill-idx="0"${catTooltip} onmouseenter="startModalSkillCycle(this)" onmouseleave="stopModalSkillCycle(this)">
              <img src="${mainIcon}" class="skill-icon" style="${mainGreyed ? "filter:grayscale(100%) opacity(0.45)" : ""}">
              <div class="skill-name">${k.name}</div>
              ${subDots}
            </div>`;
            })
            .join("");
          skH = `<div class="modal-section-header">Skill Effects</div><div class="skill-list">${skillsMarkup}</div>`;
        }

        const skinRelDate = s.releaseDate
          ? `<p><strong>Released:</strong> ${s.releaseDate}</p>`
          : "";
        const skinDia = s.priceDiamonds
          ? `<p><strong>Price:</strong> ${s.priceDiamonds} Diamonds</p>`
          : "";
        let html = `<div class="modal-section-header">Details</div>
      <p><strong>Hero:</strong> ${h ? h.name : "Unknown"}</p>
      ${!s.isStatue && s.type !== "statue" ? `<p><strong>Rarity:</strong> <span style="color:var(--rarity-${(s.collectible || "basic").toLowerCase().replace(/\s/g, "-")}, var(--text-light))">${s.collectible || s.rarity || "Basic"}</span></p>` : ""}
      ${skinRelDate}${skinDia}
      <div style="margin-top:1rem;font-size:0.9rem;color:var(--text-med);">
          ${
            s.tagDetails
              ? Object.entries(s.tagDetails)
                  .map(
                    ([k, v]) =>
                      `<div style="margin-bottom:0.25rem;"><span style="text-transform:capitalize;color:var(--accent);">${k.replace(/([A-Z])/g, " $1").trim()}:</span> ${v}</div>`,
                  )
                  .join("")
              : ""
          }
      </div>
      ${!s.isStatue && s.type !== "statue" ? skH : ""}
      `;

        if (!s.isStatue && s.type !== "statue") {
          html += `<div class="modal-section-header">Painted Skins</div><div class="mini-grid">
          <div class="landscape-item active" data-tooltip="Original" onclick="togglePaintedSkin(null,this)" style="--card-glow: var(--accent);"><img src="${s.splashArt || s.imageUrl}" class="item-bg" loading="lazy"></div>
          ${
            s.paintedSkins
              ? s.paintedSkins
                  .map((p, i) => {
                    const imgData = getPaintedSkinImage(p, s, "splash");
                    const filter = imgData.isGreyed
                      ? ' style="filter: grayscale(100%) opacity(0.5)"'
                      : "";
                    return `<div class="landscape-item" data-tooltip="${p.name}" onclick="togglePaintedSkin(${i},this)"><img src="${imgData.src}" class="item-bg" loading="lazy"${filter}></div>`;
                  })
                  .join("")
              : ""
          }
          </div>`;
        }
        c.innerHTML = html;
      }

      function renderHeroModalContent(h, c) {
        const s = getSkins().filter(
          (x) => x.heroId === h.id && x.type !== "statue",
        );
        const st = getSkins().filter(
          (x) => x.heroId === h.id && (x.type === "statue" || x.isStatue),
        );
        let skH = "";
        if (h.skills && h.skills.length > 0) {
          const skillsMarkup = h.skills
            .map((sk) => {
              const allVariants = [
                { name: sk.name, icon: sk.icon },
                ...(sk.subSkills || []).map((ss) => ({
                  name: ss.name || sk.name,
                  icon: ss.icon || "", // empty = fallback to parent greyed
                })),
              ];
              const safeJson = encodeURIComponent(JSON.stringify(allVariants));
              const hasSubs = allVariants.length > 1;
              const subDots = hasSubs
                ? `<div style="display:flex;justify-content:center;gap:3px;margin-top:3px;">${allVariants.map((_, i) => `<div style="width:5px;height:5px;border-radius:50%;background:${i === 0 ? "var(--accent)" : "rgba(255,255,255,0.25)"};" class="modal-skill-dot"></div>`).join("")}</div>`
                : "";
              const catTooltip = buildCatTooltipAttr(sk.categories);
              return `<div class="skill-item modal-skill-cycler${hasSubs ? " has-subs" : ""}" data-skill-variants="${safeJson}" data-skill-idx="0"${catTooltip} onmouseenter="startModalSkillCycle(this)" onmouseleave="stopModalSkillCycle(this)">
              <img src="${sk.icon || ""}" class="skill-icon" onerror="this.style.filter='grayscale(100%) opacity(0.4)'">
              <div class="skill-name">${sk.name}</div>
              ${subDots}
            </div>`;
            })
            .join("");
          skH = `<div class="modal-section-header">Skills</div><div class="skill-list">${skillsMarkup}</div>`;
        }

        const rolesHtml = createRolesBadge(h.roles);

        const tierColors = {
          S: "#ff7f7f",
          A: "#ffbf7f",
          B: "#ffff7f",
          C: "#7fff7f",
          D: "#7fbfff",
        };
        const td = getTierList();
        let heroTier = null;
        for (const [tier, heroes] of Object.entries(td)) {
          if (heroes.some((x) => (x.id || x) === h.id)) {
            heroTier = tier;
            break;
          }
        }
        const tierHtml = heroTier
          ? `<div style="display:flex;align-items:center;gap:0.75rem;"><strong>Tier:</strong>
              <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;font-size:1.1rem;font-weight:900;color:#000;background:${tierColors[heroTier]};box-shadow:0 4px 12px ${tierColors[heroTier]}88;">${heroTier}</span>
            </div>`
          : `<div><strong>Tier:</strong> <span style="color:var(--text-dark);font-style:italic;">Unranked</span></div>`;

        const relDateHtml = h.releaseDate
          ? `<div><strong>Released:</strong> ${h.releaseDate}</div>`
          : "";
        const bpHtml = h.priceBP
          ? `<div><strong>Price:</strong> ${h.priceBP} BP</div>`
          : "";
        const diaHtml = h.priceDiamonds
          ? `<div><strong>Price:</strong> ${h.priceDiamonds} Diamonds</div>`
          : "";
        let html = `<div class="modal-section-header">Details</div>
      <div style="display:inline-flex;flex-direction:column;align-items:center;gap:0.6rem;margin-bottom:1.5rem;min-width:260px;">
        ${tierHtml}
        <div style="display:flex;align-items:center;gap:0.75rem;"><strong>Roles:</strong> ${rolesHtml}</div>
        <div><strong>Lanes:</strong> ${(h.lanes || []).join(", ") || "—"}</div>
        <div><strong>Specialties:</strong> ${(h.specialties || []).join(", ") || "—"}</div>
        <div><strong>Nation:</strong> ${h.nation || "—"}</div>
        ${relDateHtml}${bpHtml}${diaHtml}
      </div>
      ${skH}
      <div class="modal-section-header">Skins</div>
      <div class="mini-grid">
          ${s
            .map((x) => {
              const ex = getSkinExtraInfo(x);
              const tt = x.name + (ex ? ` (${ex})` : "");
              let raritySlug = "basic";
              if (x.collectible)
                raritySlug = x.collectible.toLowerCase().replace(/\s+/g, "-");
              else if (x.rarity)
                raritySlug = x.rarity.toLowerCase().replace(/\s+/g, "-");
              const glowColor = `var(--rarity-${raritySlug}, var(--rarity-basic))`;

              return `<div class="landscape-item" style="--card-glow: ${glowColor};" data-tooltip="${tt}" onclick="closeModal();setTimeout(()=>openModal('skin','${x.id}'),200)">
                  <img src="${x.splashArt || x.imageUrl}" class="item-bg" loading="lazy">
              </div>`;
            })
            .join("")}
          <div class="landscape-item add-skin-btn" onclick="closeModal();renderSkinForm(null,false);setTimeout(()=>{document.getElementById('skin-hero-id').value='${h.id}'},100);" title="Add Skin"><span class="material-symbols-outlined">add</span></div>
      </div>`;

        const painted = s.filter(
          (x) => x.paintedSkins && x.paintedSkins.length > 0,
        );
        if (painted.length > 0) {
          html += `<div class="modal-section-header">Painted Skins</div><div class="mini-grid">${painted
            .map((p) =>
              p.paintedSkins
                .map((ps) => {
                  const imgData = getPaintedSkinImage(ps, p, "splash");
                  const filter = imgData.isGreyed
                    ? ' style="filter: grayscale(100%) opacity(0.5)"'
                    : "";
                  return `<div class="landscape-item" data-tooltip="${ps.name}" onclick="closeModal();setTimeout(()=>openModal('skin','${p.id}'),200)">
                  <img src="${imgData.src}" class="item-bg" loading="lazy"${filter}>
              </div>`;
                })
                .join(""),
            )
            .join("")}</div>`;
        }

        if (st.length > 0) {
          html += `<div class="modal-section-header">Sacred Statues</div><div class="mini-grid">${st
            .map((x) => {
              const imgData = getSkinImageWithFallback(x, "splash");
              const filter = imgData.isGreyed
                ? ' style="filter: grayscale(100%) opacity(0.5)"'
                : "";
              return `<div class="portrait-item" style="--card-glow: var(--rarity-basic);" data-tooltip="${x.name}" onclick="closeModal();setTimeout(()=>openModal('skin','${x.id}'),200)">
            <img src="${imgData.src}" class="item-bg" loading="lazy"${filter}>
        </div>`;
            })
            .join("")}</div>`;
        }
        c.innerHTML = html;
      }

      function renderSkinsPage() {
        const g = document.getElementById("skin-grid");
        g.innerHTML = "";
        const fHero = document.getElementById("filter-skin-hero").value;
        const fRarity = document.getElementById("filter-skin-rarity").value;
        const fColl = document.getElementById("filter-skin-collectible").value;
        const fSearch = document
          .getElementById("skin-search")
          .value.toLowerCase();
        let s = getSkins();
        let display = [];
        if (fColl === "Painted Skin") {
          s.forEach((b) => {
            if (b.paintedSkins)
              b.paintedSkins.forEach((p) =>
                display.push({
                  ...p,
                  _baseSkin: b, // reference to the base skin
                  id: b.id,
                  heroId: b.heroId,
                  type: "painted",
                  collectible: null,
                  paintedSkinName: p.name,
                  baseSkinName: b.name, // for subtitle
                }),
              );
          });
        } else if (fColl === "Sacred Statue") {
          display = s.filter((x) => x.isStatue || x.type === "statue");
        } else {
          display = s.filter((x) => !x.isStatue && x.type !== "statue");
        }

        if (
          fSearch ||
          fRarity ||
          fHero ||
          (fColl && fColl !== "Painted Skin" && fColl !== "Sacred Statue")
        ) {
          display = display.filter((x) => {
            if (fSearch && !x.name.toLowerCase().includes(fSearch))
              return false;
            if (fRarity && x.rarity !== fRarity) return false;
            if (fHero && x.heroId !== fHero) return false;
            if (
              fColl &&
              fColl !== "Painted Skin" &&
              fColl !== "Sacred Statue" &&
              x.collectible !== fColl
            )
              return false;
            return true;
          });
        }
        display = applySortPill(display, "skins");
        display = applyStarredSort(display);
        const starred = getStarred();

        if (display.length === 0) {
          document.getElementById("no-skins-message").style.display = "block";
          return;
        }
        document.getElementById("no-skins-message").style.display = "none";

        const isSacredStatueView = fColl === "Sacred Statue";
        const isPaintedView = fColl === "Painted Skin";
        g.classList.toggle("sacred-statue-view", isSacredStatueView);

        const frag = document.createDocumentFragment();
        display.forEach((x) => {
          const isSacredStatue = x.type === "statue" || x.isStatue;
          const isPainted = x.type === "painted";
          const baseSkin = isPainted
            ? x._baseSkin || getSkinById(x.id)
            : null;

          const cardClass = isSacredStatue ? "portrait-item" : "unified-card";
          const c = document.createElement("div");
          let cc = cardClass;

          let glowStyle = "transparent";
          if (x.collectible) {
            const raritySlug = x.collectible.toLowerCase().replace(/\s+/g, "-");
            glowStyle = `var(--rarity-${raritySlug}, var(--rarity-basic))`;
          } else if (baseSkin && baseSkin.collectible) {
            const raritySlug = baseSkin.collectible
              .toLowerCase()
              .replace(/\s+/g, "-");
            glowStyle = `var(--rarity-${raritySlug}, var(--rarity-basic))`;
          } else {
            const h = getHeroById(x.heroId);
            if (h && h.roles && h.roles.length > 0) {
              const normRole = (r) =>
                r
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z\-]/g, "");
              const colors = h.roles.map(
                (r) => `var(--role-${normRole(r)}, #555)`,
              );
              if (colors.length === 1) glowStyle = colors[0];
              else glowStyle = `linear-gradient(135deg, ${colors.join(", ")})`;
            }
          }

          c.className = cc + (starred[x.id] ? " starred-card" : "");
          c.style.setProperty("--card-glow", glowStyle);

          // Subtitle text (skinTag only affects the image, not the label)
          let rt = x.rarity || (baseSkin ? baseSkin.rarity : "") || "";
          const coll = x.collectible || (baseSkin ? baseSkin.collectible : "");
          if (coll) {
            if (rt) rt += ` | ${coll}`;
            else rt = coll;
          }
          if (!rt && x.type === "statue") rt = "Sacred Statue";
          if (!rt) rt = "Skin";

          const ex = getSkinExtraInfo(baseSkin || x);
          let tt = x.paintedSkinName || x.name;
          if (ex) tt += ` (${ex})`;

          // Rarity image — skinTag is a direct URL override; falls back to attribute image for the rarity
          const rarityImg = (() => {
            const override = x.skinTag || (baseSkin ? baseSkin.skinTag : "");
            if (override) return override;
            const key = x.rarity || (baseSkin ? baseSkin.rarity : "");
            return key ? getAttrImage("skinRarities", key) : "";
          })();
          const rarityImgHtml = rarityImg
            ? `<img src="${rarityImg}" style="height:22px;width:auto;max-width:56px;object-fit:contain;flex-shrink:0;vertical-align:middle;" onerror="this.style.display='none'">`
            : "";

          let sub = "";
          if (isPainted) {
            sub = `<span style="color:var(--text-med);font-size:0.75rem;">Painted Skin</span><div style="color:var(--accent-light);font-size:0.7rem;font-weight:600;margin-top:2px;">for ${x.baseSkinName || ""}</div>`;
          } else {
            sub = `<span style="color:var(--text-med);font-size:0.75rem;">${rt}</span>`;
            if (ex)
              sub += `<div style="color:var(--accent-light);font-size:0.7rem;font-weight:600;margin-top:2px;">${ex}</div>`;
          }

          // Meta row: release date + price below name
          let skinMetaHtml = "";
          if (!isPainted && (x.releaseDate || x.priceDiamonds)) {
            skinMetaHtml = '<div class="card-meta-row">';
            if (x.releaseDate)
              skinMetaHtml += `<span class="card-meta-item"><span class="material-symbols-outlined card-meta-icon">calendar_month</span>${x.releaseDate}</span>`;
            if (x.priceDiamonds)
              skinMetaHtml += `<span class="card-meta-item"><svg class="card-meta-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="10,2 18,8 10,18 2,8" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polygon points="10,2 14,8 10,11 6,8" fill="currentColor" opacity="0.35"/></svg>${x.priceDiamonds}</span>`;
            skinMetaHtml += "</div>";
          }

          // Hero icon overlay (top-left for normal, top-right for sacred statue)
          const hero = getHeroById(x.heroId);
          const heroIconHtml =
            hero && hero.icon
              ? `<div class="card-hero-icon" style="background-image:url('${hero.icon}')" title="${hero.name}"></div>`
              : "";
          const heroIconRightHtml =
            hero && hero.icon
              ? `<div class="card-hero-icon" style="background-image:url('${hero.icon}');top:8px;right:8px;left:auto;" title="${hero.name}"></div>`
              : "";

          // Skin skill strip (if showSkillIcons is enabled)
          let skinSkillStripHtml = "";
          const baseSkinForSkills = isPainted ? baseSkin : x;
          if (
            !isSacredStatue &&
            !isPainted &&
            baseSkinForSkills &&
            baseSkinForSkills.showSkillIcons &&
            hero &&
            hero.skills &&
            hero.skills.length > 0
          ) {
            const variantSkills = baseSkinForSkills.variantSkills || [];
            const skillItems = hero.skills
              .map((sk, i) => {
                const rv = variantSkills[i];
                const mainOverride = rv
                  ? typeof rv === "string"
                    ? rv
                    : rv.main || ""
                  : "";
                const subOverrides =
                  rv && typeof rv === "object" ? rv.subs || [] : [];
                // Main skill: override if set (full color), else original hero icon greyed
                const mainIcon = mainOverride || sk.icon || "";
                const mainGreyed = !mainOverride;
                const all = [
                  { name: sk.name, icon: mainIcon, greyed: mainGreyed },
                  ...(sk.subSkills || []).map((ss, j) => {
                    const subUrl = subOverrides[j] || "";
                    if (subUrl) {
                      // Sub override entered → full color
                      return {
                        name: ss.name || sk.name,
                        icon: subUrl,
                        greyed: false,
                      };
                    } else if (mainOverride) {
                      // No sub URL but parent override exists → parent override, greyed
                      return {
                        name: ss.name || sk.name,
                        icon: mainOverride,
                        greyed: true,
                      };
                    } else {
                      // No sub URL, no parent override → original hero sub/parent icon, greyed
                      return {
                        name: ss.name || sk.name,
                        icon: ss.icon || sk.icon || "",
                        greyed: true,
                      };
                    }
                  }),
                ];
                const greyStyle = mainGreyed
                  ? "filter:grayscale(100%) opacity(0.5);"
                  : "";
                return `<div class="card-skill-strip-wrapper" data-skill-name="${sk.name.replace(/"/g, "&quot;")}" data-skill-variants="${encodeURIComponent(JSON.stringify(all))}" onmouseenter="startSkillCycle(this)" onmouseleave="stopSkillCycle(this)"><img src="${mainIcon}" class="card-skill-strip-icon" style="${greyStyle}" onerror="this.src='${sk.icon || ""}';this.style.filter='grayscale(100%) opacity(0.5)'"></div>`;
              })
              .join("");
            skinSkillStripHtml = `<div class="card-skill-strip skin-skill-strip">${skillItems}</div>`;
          }

          // Painted skin pill (with proper fallback for popup images)
          let paintedPillHtml = "";
          if (!isPainted && x.paintedSkins && x.paintedSkins.length > 0) {
            const count = x.paintedSkins.length;
            // Build popup data with fallback images
            const popupData = x.paintedSkins.map((p) => {
              const imgRes = getPaintedSkinImage(p, x, "splash");
              return {
                name: p.name,
                splashArt: imgRes.src,
                isGreyed: imgRes.isGreyed,
              };
            });
            const safeJson = JSON.stringify(popupData).replace(/'/g, "\u0027");
            paintedPillHtml = `<span class="painted-pill" onmouseenter="showPaintedPopup(event,JSON.parse(this.dataset.skins),this)" onmouseleave="hidePaintedPopup()" data-skins='${safeJson}' onclick="event.stopPropagation()">+${count}</span>`;
          }

          // Skin display name (rarity image + name + painted pill)
          const displayName = isPainted ? x.paintedSkinName || x.name : x.name;
          const skinNameHtml = `<span style="display:inline-flex;align-items:center;gap:0.35rem;">${rarityImgHtml}${displayName}${paintedPillHtml}</span>`;

          let act = "";
          if (x.type !== "painted") {
            const starIcon = starred[x.id] ? "star" : "star_border";
            const starCls = starred[x.id] ? "starred" : "";
            act = `<div class="card-overlay-actions"><div class="overlay-btn star ${starCls}" onclick="event.stopPropagation();toggleStar('${x.id}',renderSkinsPage)"><span class="material-symbols-outlined">${starIcon}</span></div><div class="overlay-btn" onclick="renderSkinForm('${x.id}',false)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteSkin('${x.id}',false)"><span class="material-symbols-outlined">delete</span></div></div>`;
          }

          // Image with fallback
          let imgData;
          if (isPainted && baseSkin) {
            imgData = getPaintedSkinImage(x, baseSkin, "splash");
          } else {
            imgData = getSkinImageWithFallback(x, "splash");
          }
          const imgStyle = imgData.isGreyed
            ? ' style="filter: grayscale(100%) opacity(0.5);"'
            : "";

          c.dataset.tooltip = x.name;

          if (isSacredStatue) {
            // Sacred statue: portrait card with hero icon top-right and name overlay
            const starIconSt = starred[x.id] ? "star" : "star_border";
            const starClsSt = starred[x.id] ? "starred" : "";
            const statueAct = `<div class="card-overlay-actions" style="top:8px;left:8px;right:auto;flex-direction:column;gap:6px;">
              <div class="overlay-btn star ${starClsSt}" onclick="event.stopPropagation();toggleStar('${x.id}',renderSkinsPage)" style="width:30px;height:30px;"><span class="material-symbols-outlined" style="font-size:16px;">${starIconSt}</span></div>
              <div class="overlay-btn" onclick="renderSkinForm('${x.id}',false)" style="width:30px;height:30px;"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></div>
              <div class="overlay-btn delete" onclick="deleteSkin('${x.id}',false)" style="width:30px;height:30px;"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></div>
            </div>`;
            c.innerHTML = `
              <img src="${imgData.src}" class="item-bg" loading="lazy"${imgStyle}>
              ${heroIconRightHtml}
              ${statueAct}
              <div style="position:absolute;bottom:0;left:0;right:0;padding:0.5rem 0.5rem 0.6rem;background:linear-gradient(0deg,rgba(0,0,0,0.85),transparent);border-radius:0 0 16px 16px;text-align:center;">
                <span style="font-size:0.68rem;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.8);line-height:1.2;display:block;">${x.name}</span>
              </div>`;
          } else {
            c.innerHTML = `<div class="card-image-wrapper">${heroIconHtml}${skinSkillStripHtml}<img src="${imgData.src}" class="card-image" loading="lazy"${imgStyle}>${act}</div><div class="card-content"><h3 class="card-title" style="display:flex;align-items:center;flex-wrap:wrap;">${skinNameHtml}</h3><div class="card-subtitle">${sub}</div>${skinMetaHtml}</div>`;
          }

          c.onclick = (e) => {
            if (
              !e.target.closest(".btn-release") &&
              !e.target.closest(".card-overlay-actions") &&
              !e.target.closest(".painted-pill")
            ) {
              openModal("skin", x.id);
            }
          };
          frag.appendChild(c);
        });
        g.appendChild(frag);
        requestAnimationFrame(initAllSkillCycles);
      }

      function renderSkinCountPage() {
        const l = document.getElementById("skin-count-list");
        const tot = document.getElementById("total-skins-number");
        const ft = document
          .getElementById("filter-count-search")
          .value.toLowerCase();
        const by = document.getElementById("filter-count-sort").value;
        l.innerHTML = "";
        const s = getSkins().filter((x) => !x.isStatue && x.type !== "statue");
        const h = getHeroes();
        tot.textContent = s.length;
        const att = getAttributes();
        const grps = {};

        if (by === "hero") {
          h.forEach((x) => (grps[x.id] = { name: x.name, skins: [] }));
          grps["Unk"] = { name: "Unknown", skins: [] };
          s.forEach((x) => {
            const k = x.heroId && grps[x.heroId] ? x.heroId : "Unk";
            grps[k].skins.push(x);
          });
        } else if (by === "rarity") {
          att.skinRarities.forEach((r) => (grps[r] = { name: r, skins: [] }));
          grps["Other"] = { name: "Other", skins: [] };
          s.forEach((x) => {
            const k = x.rarity && grps[x.rarity] ? x.rarity : "Other";
            grps[k].skins.push(x);
          });
        } else if (by === "role") {
          att.roles.forEach((r) => (grps[r] = { name: r, skins: [] }));
          grps["None"] = { name: "None", skins: [] };
          s.forEach((x) => {
            const he = h.find((z) => z.id === x.heroId);
            if (he && he.roles && he.roles.length > 0) {
              he.roles.forEach((roleName) => {
                if (grps[roleName]) grps[roleName].skins.push(x);
              });
            } else {
              grps["None"].skins.push(x);
            }
          });
        } else if (by === "collectible") {
          att.collectibleRarities.forEach(
            (r) => (grps[r] = { name: r, skins: [] }),
          );
          grps["Std"] = { name: "Standard", skins: [] };
          s.forEach((x) => {
            const k =
              x.collectible && grps[x.collectible] ? x.collectible : "Std";
            grps[k].skins.push(x);
          });
        }

        const cState = getData(KEYS.SKIN_COUNT_STATE, {});
        const keys = Object.keys(grps).sort((a, b) =>
          grps[a].name.localeCompare(grps[b].name),
        );
        renderSkinCountPage._lastGroupKeys = keys;

        const frag = document.createDocumentFragment();

        // Recently added
        renderRecentlyAdded();

        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const chartItems = [];

        keys.forEach((k) => {
          const g = grps[k];
          if (g.skins.length === 0) return;
          let filt = g.skins.filter((x) => x.name.toLowerCase().includes(ft));
          if (filt.length === 0) return;

          // Track for pie chart (count after search filter, include skin splash URLs)
          chartItems.push({
            label: g.name,
            count: filt.length,
            splashUrls: filt
              .map((sk) => getSkinImageWithFallback(sk, "splash").src)
              .filter(Boolean),
          });

          filt = getSortedData(filt, "newest");

          const d = document.createElement("div");
          d.className = "skin-group-details";
          const isClosed = cState[k];
          const sum = document.createElement("div");
          sum.className = "skin-group-summary";
          // Header icon based on group-by type
          let groupIcon = "";
          if (by === "hero") {
            const heroObj = h.find((hx) => hx.id === k);
            if (heroObj && heroObj.icon)
              groupIcon = `<img src="${heroObj.icon}" class="group-hero-icon" onerror="this.style.display='none'">`;
          } else if (by === "rarity") {
            const ri = getAttrImage("skinRarities", k);
            if (ri)
              groupIcon = `<img src="${ri}" class="group-header-icon" onerror="this.style.display='none'">`;
          } else if (by === "role") {
            const ri = getAttrImage("roles", k);
            if (ri)
              groupIcon = `<img src="${ri}" class="group-header-icon" onerror="this.style.display='none'">`;
          }
          sum.innerHTML = `<span class="group-title" style="display:flex;align-items:center;gap:8px;">${groupIcon}${g.name} <span class="group-count" style="font-size:0.9em;opacity:0.7;">(${filt.length})</span></span><span class="material-symbols-outlined group-expand-arrow" style="transform:${isClosed ? "rotate(0deg)" : "rotate(180deg)"}">expand_more</span>`;
          const con = document.createElement("div");
          con.className = "skin-group-content";
          con.style.display = isClosed ? "none" : "block";

          sum.onclick = () => {
            const cl = con.style.display !== "none";
            con.style.display = cl ? "none" : "block";
            sum.querySelector(".group-expand-arrow").style.transform = cl
              ? "rotate(0deg)"
              : "rotate(180deg)";
            cState[k] = cl;
            saveData(KEYS.SKIN_COUNT_STATE, cState);
          };

          const iconsDiv = document.createElement("div");
          iconsDiv.className = "mini-grid";
          iconsDiv.style.justifyContent = "flex-start";

          filt.forEach((skin) => {
            const wrapper = document.createElement("div");
            wrapper.style.cssText = "position:relative;display:inline-block;";

            const icon = document.createElement("div");
            const rarityClass = skin.rarity
              ? `rarity-${skin.rarity.toLowerCase().replace(/\s+/g, "-")}`
              : "";
            icon.className = `icon-item ${rarityClass}`;
            icon.dataset.skinId = skin.id;

            const imgData = getSkinImageWithFallback(skin, "icon");
            if (imgData.src) {
              icon.style.backgroundImage = `url('${imgData.src}')`;
              if (imgData.isGreyed) {
                icon.style.filter = "grayscale(100%) opacity(0.5)";
                icon.classList.add("fallback");
              }
            }

            let glowColor = "rgba(243, 244, 246, 0.5)";
            let glowColorFull = "#f3f4f6";
            if (skin.collectible) {
              const raritySlug = skin.collectible
                .toLowerCase()
                .replace(/\s+/g, "-");
              const rarityColors = {
                common: "rgba(34,197,94,0.5)",
                exceptional: "rgba(59,130,246,0.5)",
                deluxe: "rgba(168,85,247,0.5)",
                exquisite: "rgba(244,114,182,0.5)",
                grand: "rgba(251,191,36,0.5)",
                supreme: "rgba(239,68,68,0.5)",
              };
              const rarityColorsFull = {
                common: "#22c55e",
                exceptional: "#3b82f6",
                deluxe: "#a855f7",
                exquisite: "#f472b6",
                grand: "#fbbf24",
                supreme: "#ef4444",
              };
              glowColor = rarityColors[raritySlug] || glowColor;
              glowColorFull = rarityColorsFull[raritySlug] || glowColorFull;
            } else if (skin.rarity) {
              const raritySlug = skin.rarity.toLowerCase().replace(/\s+/g, "-");
              const rarityColors = {
                basic: "rgba(203,213,225,0.5)",
                elite: "rgba(59,130,246,0.5)",
                special: "rgba(34,197,94,0.5)",
                epic: "rgba(168,85,247,0.5)",
                legend: "rgba(239,68,68,0.5)",
                collector: "rgba(251,191,36,0.5)",
              };
              const rarityColorsFull = {
                basic: "#cbd5e1",
                elite: "#3b82f6",
                special: "#22c55e",
                epic: "#a855f7",
                legend: "#ef4444",
                collector: "#eab308",
              };
              glowColor = rarityColors[raritySlug] || glowColor;
              glowColorFull = rarityColorsFull[raritySlug] || glowColorFull;
            }
            icon.style.boxShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor.replace("0.5", "0.2")}`;
            icon.style.setProperty("--card-glow", glowColorFull);
            icon.dataset.tooltip = skin.name;
            icon.onclick = () => openModal("skin", skin.id);

            // New badge for skins added within a week
            wrapper.appendChild(icon);
            if (skin.addedAt && now - skin.addedAt <= oneWeek) {
              const badge = document.createElement("span");
              badge.className = "new-badge";
              badge.textContent = "New";
              wrapper.appendChild(badge);
            }
            iconsDiv.appendChild(wrapper);
          });
          con.appendChild(iconsDiv);
          d.appendChild(sum);
          d.appendChild(con);
          frag.appendChild(d);
        });
        l.appendChild(frag);

        // Update chart data after rendering (accurate counts post-filter)
        renderSkinCountPage._chartData = chartItems;
        const chartContainer = document.getElementById(
          "skin-count-chart-container",
        );
        if (chartContainer && chartContainer.style.display !== "none") {
          drawSkinCountChart(chartItems);
        }
      }
