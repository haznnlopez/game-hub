      /* MATRIX PAGE — interactive cross-tab explorer */
      const MATRIX_CONFIG = {
        roles: {
          title: "Roles",
          singular: "Role",
          icon: "shield_person",
          values: (hero) => hero.roles || [],
        },
        nations: {
          title: "Nations",
          singular: "Nation",
          icon: "public",
          values: (hero) => (hero.nation ? [hero.nation] : []),
        },
        lanes: {
          title: "Lanes",
          singular: "Lane",
          icon: "signpost",
          values: (hero) => hero.lanes || [],
        },
        specialties: {
          title: "Specialties",
          singular: "Specialty",
          icon: "military_tech",
          values: (hero) => hero.specialties || [],
        },
      };
      let matrixRowKey = "roles";
      let matrixColumnKey = "lanes";
      let matrixSelectedCell = null;

      function getMatrixHeroValues(hero, key) {
        const cfg = MATRIX_CONFIG[key];
        return cfg ? cfg.values(hero).filter(Boolean) : [];
      }

      function heroMatchesMatrixValue(hero, key, value) {
        return getMatrixHeroValues(hero, key).includes(value);
      }

      function encodeMatrixValue(value) {
        return encodeURIComponent(String(value || "")).replace(/'/g, "%27");
      }

      function matrixAxisPills(activeKey, axis) {
        return Object.entries(MATRIX_CONFIG)
          .map(([key, cfg]) => {
            const active = key === activeKey;
            return `<button type="button" class="filter-pill matrix-axis-pill${active ? " active" : ""}" aria-pressed="${active}" onclick="setMatrixAxis('${axis}','${key}')"><span class="material-symbols-outlined">${cfg.icon}</span><span>${cfg.title}</span></button>`;
          })
          .join("");
      }

      function setMatrixAxis(axis, key) {
        if (!MATRIX_CONFIG[key]) return;
        if (axis === "row") {
          matrixRowKey = key;
          if (matrixColumnKey === key) {
            matrixColumnKey = Object.keys(MATRIX_CONFIG).find((k) => k !== key) || "lanes";
          }
        } else {
          matrixColumnKey = key;
          if (matrixRowKey === key) {
            matrixRowKey = Object.keys(MATRIX_CONFIG).find((k) => k !== key) || "roles";
          }
        }
        matrixSelectedCell = null;
        renderMatrixPage();
      }

      function swapMatrixAxes() {
        [matrixRowKey, matrixColumnKey] = [matrixColumnKey, matrixRowKey];
        matrixSelectedCell = null;
        renderMatrixPage();
      }

      function getMatrixCellHeroes(rowValue, columnValue) {
        return getHeroes()
          .filter(
            (hero) =>
              heroMatchesMatrixValue(hero, matrixRowKey, rowValue) &&
              heroMatchesMatrixValue(hero, matrixColumnKey, columnValue),
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      function selectMatrixCellEncoded(rowValue, columnValue) {
        matrixSelectedCell = {
          row: decodeURIComponent(rowValue),
          column: decodeURIComponent(columnValue),
        };
        renderMatrixSelection();
        document.querySelectorAll(".matrix-cell.selected").forEach((cell) =>
          cell.classList.remove("selected"),
        );
        Array.from(document.querySelectorAll(".matrix-cell")).find(
          (cell) =>
            cell.dataset.row === matrixSelectedCell.row &&
            cell.dataset.column === matrixSelectedCell.column,
        )?.classList.add("selected");
      }

      function renderMatrixSelection() {
        const panel = document.getElementById("matrix-selection");
        if (!panel) return;
        if (!matrixSelectedCell) {
          panel.innerHTML = `<div class="matrix-selection-empty"><span class="material-symbols-outlined">touch_app</span><strong>Select a cell</strong><span>Matching heroes will appear here.</span></div>`;
          return;
        }
        const { row, column } = matrixSelectedCell;
        const matched = getMatrixCellHeroes(row, column);
        const rowCfg = MATRIX_CONFIG[matrixRowKey];
        const colCfg = MATRIX_CONFIG[matrixColumnKey];
        const avatars = matched.length
          ? matched
              .map((hero) => {
                const badge = getHeroBadgeImageSources(hero);
                return `<button type="button" class="matrix-selection-hero" onclick="openModal('hero','${hero.id}')" title="${hero.name}"><img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt="${hero.name}"><span>${hero.name}</span></button>`;
              })
              .join("")
          : `<div class="matrix-selection-empty">No heroes currently match this combination.</div>`;
        panel.innerHTML = `<div class="matrix-selection-head"><div><span class="matrix-selection-kicker">Matching heroes</span><h3>${row} <span>×</span> ${column}</h3><p>${rowCfg.singular} + ${colCfg.singular}</p></div><span class="matrix-selection-count">${matched.length}</span></div><div class="matrix-selection-heroes">${avatars}</div>`;
      }

      function renderMatrixPage() {
        const rowPills = document.getElementById("matrix-row-pills");
        const columnPills = document.getElementById("matrix-column-pills");
        const container = document.getElementById("matrix-container");
        const insights = document.getElementById("matrix-insights");
        if (!rowPills || !columnPills || !container || !insights) return;

        const attrs = getAttributes();
        const heroes = getHeroes().sort((a, b) => a.name.localeCompare(b.name));
        const rowCfg = MATRIX_CONFIG[matrixRowKey];
        const colCfg = MATRIX_CONFIG[matrixColumnKey];
        const rowValues = attrs[matrixRowKey] || [];
        const columnValues = attrs[matrixColumnKey] || [];

        rowPills.innerHTML = matrixAxisPills(matrixRowKey, "row");
        columnPills.innerHTML = matrixAxisPills(matrixColumnKey, "column");

        if (!rowValues.length || !columnValues.length) {
          insights.innerHTML = "";
          container.innerHTML = `<div class="matrix-selection-empty">Add values for ${!rowValues.length ? rowCfg.title : colCfg.title} in Attributes first.</div>`;
          renderMatrixSelection();
          return;
        }

        const cells = [];
        let maxCount = 0;
        rowValues.forEach((rowValue) => {
          columnValues.forEach((columnValue) => {
            const matched = heroes.filter(
              (hero) =>
                heroMatchesMatrixValue(hero, matrixRowKey, rowValue) &&
                heroMatchesMatrixValue(hero, matrixColumnKey, columnValue),
            );
            const cell = { rowValue, columnValue, heroes: matched };
            cells.push(cell);
            maxCount = Math.max(maxCount, matched.length);
          });
        });

        const populated = cells.filter((cell) => cell.heroes.length > 0);
        const topCombos = [...populated]
          .sort(
            (a, b) =>
              b.heroes.length - a.heroes.length ||
              `${a.rowValue}${a.columnValue}`.localeCompare(`${b.rowValue}${b.columnValue}`),
          )
          .slice(0, 2);
        const coveredHeroes = new Set(populated.flatMap((cell) => cell.heroes.map((h) => h.id))).size;
        insights.innerHTML = `<div class="matrix-insight-card matrix-insight-stat"><span class="material-symbols-outlined">groups</span><div><strong>${coveredHeroes}</strong><span>heroes represented</span></div></div><div class="matrix-insight-card matrix-insight-stat"><span class="material-symbols-outlined">grid_view</span><div><strong>${populated.length}</strong><span>active combinations</span></div></div>${topCombos
          .map(
            (cell, index) =>
              `<button type="button" class="matrix-insight-card matrix-combo-card" onclick="selectMatrixCellEncoded('${encodeMatrixValue(cell.rowValue)}','${encodeMatrixValue(cell.columnValue)}')"><span class="matrix-combo-rank">#${index + 1}</span><div><strong>${cell.rowValue} × ${cell.columnValue}</strong><span>${cell.heroes.length} hero${cell.heroes.length === 1 ? "" : "es"}</span></div></button>`,
          )
          .join("")}`;

        const columnHeaders = columnValues
          .map((value) => {
            const img = getAttrImage(matrixColumnKey, value);
            return `<th scope="col"><div class="matrix-axis-header">${img ? `<img src="${img}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="">` : `<span class="material-symbols-outlined">${colCfg.icon}</span>`}<span>${value}</span></div></th>`;
          })
          .join("");

        const rows = rowValues
          .map((rowValue) => {
            const rowImg = getAttrImage(matrixRowKey, rowValue);
            const rowHead = `<th scope="row"><div class="matrix-axis-header matrix-row-header">${rowImg ? `<img src="${rowImg}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="">` : `<span class="material-symbols-outlined">${rowCfg.icon}</span>`}<span>${rowValue}</span></div></th>`;
            const rowCells = columnValues
              .map((columnValue) => {
                const cell = cells.find(
                  (c) => c.rowValue === rowValue && c.columnValue === columnValue,
                );
                const count = cell?.heroes.length || 0;
                const strength = maxCount ? count / maxCount : 0;
                const selected =
                  matrixSelectedCell?.row === rowValue &&
                  matrixSelectedCell?.column === columnValue;
                const names = (cell?.heroes || []).map((h) => h.name).join(", ");
                return `<td><button type="button" class="matrix-cell${count ? " populated" : ""}${selected ? " selected" : ""}" data-row="${rowValue.replace(/"/g, "&quot;")}" data-column="${columnValue.replace(/"/g, "&quot;")}" style="--matrix-strength:${strength.toFixed(3)}" onclick="selectMatrixCellEncoded('${encodeMatrixValue(rowValue)}','${encodeMatrixValue(columnValue)}')" title="${names ? names.replace(/"/g, "&quot;") : "No matching heroes"}"><strong>${count || "—"}</strong>${count ? `<span>${count === 1 ? "hero" : "heroes"}</span>` : ""}</button></td>`;
              })
              .join("");
            return `<tr>${rowHead}${rowCells}</tr>`;
          })
          .join("");

        container.innerHTML = `<table class="hero-matrix-table"><thead><tr><th class="matrix-corner"><span>${rowCfg.singular}</span><span class="material-symbols-outlined">close</span><span>${colCfg.singular}</span></th>${columnHeaders}</tr></thead><tbody>${rows}</tbody></table>`;
        renderMatrixSelection();
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
        img.src = IMAGE_PLACEHOLDER;
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
        const raw = document.getElementById(rid).value;
        if (
          raw &&
          raw.startsWith("modal:") &&
          typeof restoreModalReturnContext === "function"
        ) {
          restoreModalReturnContext(raw);
          return;
        }
        const target =
          raw || (rid === "hero-return-page" ? "page-heroes" : "page-skins");
        showPage(target, true);
      }

      function getSelectedFilterValues(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return [];
        if (select.multiple) {
          return Array.from(select.selectedOptions)
            .map((option) => option.value)
            .filter(Boolean);
        }
        return select.value ? [select.value] : [];
      }

      function setSelectedFilterValues(selectId, values) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const wanted = new Set(values || []);
        if (select.multiple) {
          Array.from(select.options).forEach((option) => {
            option.selected = !!option.value && wanted.has(option.value);
          });
        } else {
          select.value = values?.[0] || "";
        }
      }

      function renderFilterPills(
        selectId,
        imageKey = null,
        customImages = null,
        options = {},
      ) {
        const select = document.getElementById(selectId);
        const wrap = document.getElementById(`pills-${selectId}`);
        if (!select || !wrap) return;
        const images =
          customImages || (imageKey ? getAttributeImages()[imageKey] || {} : {});
        const selected = new Set(getSelectedFilterValues(selectId));
        const isMultiple = select.multiple && options.multiple !== false;
        const imageOnly = !!options.imageOnly;
        const wideImages = !!options.wideImages;
        const selectOptions = Array.from(select.options).filter((o) => !o.disabled);

        wrap.innerHTML = selectOptions
          .map((option) => {
            const value = option.value;
            const active = value ? selected.has(value) : selected.size === 0;
            const rawImg = value && images[value] ? images[value] : "";
            const img = rawImg ? cleanImageUrl(rawImg) : "";
            let content = `<span>${option.textContent}</span>`;
            if (img) {
              const iconClass = wideImages
                ? "filter-pill-icon filter-pill-icon-wide"
                : "filter-pill-icon";
              const icon = `<img class="${iconClass}" src="${img}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="${option.textContent}">`;
              content = imageOnly
                ? `${icon}<span class="filter-pill-fallback-label" hidden>${option.textContent}</span>`
                : `${icon}<span>${option.textContent}</span>`;
            }
            const classes = [
              "filter-pill",
              active ? "active" : "",
              imageOnly && img ? "filter-pill-image-only" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `<button type="button" class="${classes}" data-value="${value.replace(/"/g, "&quot;")}" aria-pressed="${active}" title="${option.textContent}">${content}</button>`;
          })
          .join("");

        wrap.querySelectorAll(".filter-pill").forEach((pill) => {
          pill.onclick = () => {
            const value = pill.dataset.value || "";
            if (!isMultiple) {
              select.value = value;
            } else if (!value) {
              Array.from(select.options).forEach((option) => {
                option.selected = false;
              });
            } else {
              const option = Array.from(select.options).find(
                (candidate) => candidate.value === value,
              );
              if (option) option.selected = !option.selected;
              const allOption = Array.from(select.options).find(
                (candidate) => !candidate.value,
              );
              if (allOption) allOption.selected = false;
            }
            renderFilterPills(selectId, imageKey, customImages, options);
            select.dispatchEvent(new Event("change", { bubbles: true }));
            if (typeof syncFilterPanelSummaries === "function") {
              syncFilterPanelSummaries();
            }
          };
        });
      }

      function refreshFilterPills() {
        renderFilterPills("filter-hero-role", "roles");
        renderFilterPills("filter-hero-lane", "lanes");
        renderFilterPills("filter-hero-specialty");
        renderFilterPills("filter-hero-nation", "nations");
        // Skin rarity artwork is usually a wide horizontal tag. Show the image
        // itself when one is assigned; otherwise fall back to the rarity name.
        renderFilterPills("filter-skin-rarity", "skinRarities", null, {
          imageOnly: true,
          wideImages: true,
        });
        // Type and collectible rarity are intentionally text-only pills.
        renderFilterPills("filter-skin-type");
        renderFilterPills("filter-skin-collectible");
        renderFilterPills("filter-count-sort", null, null, { multiple: false });
        if (typeof syncFilterPanelSummaries === "function") {
          syncFilterPanelSummaries();
        }
      }

      function populateFilters() {
        const attrs = getAttributes();
        const heroes = getHeroes().sort((a, b) => a.name.localeCompare(b.name));
        const fill = (id, list) => {
          const select = document.getElementById(id);
          if (!select) return;
          const previous = getSelectedFilterValues(id);
          select.innerHTML = '<option value="">All</option>';
          (list || []).forEach((item) => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
          });
          setSelectedFilterValues(
            id,
            previous.filter((value) => (list || []).includes(value)),
          );
        };

        fill("filter-hero-role", attrs.roles);
        fill("filter-hero-lane", attrs.lanes);
        fill("filter-hero-specialty", attrs.specialties);
        fill("filter-hero-nation", attrs.nations);
        fill("filter-skin-rarity", attrs.skinRarities);
        fill("filter-skin-collectible", attrs.collectibleRarities);

        const typeSelect = document.getElementById("filter-skin-type");
        if (typeSelect) {
          const previous = getSelectedFilterValues("filter-skin-type");
          typeSelect.innerHTML = '<option value="">All</option>';
          ["Painted Skin", "Sacred Statue"].forEach((type) => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
          });
          const valid = new Set(["Painted Skin", "Sacred Statue"]);
          setSelectedFilterValues(
            "filter-skin-type",
            previous.filter((value) => valid.has(value)),
          );
        }

        const heroSelect = document.getElementById("filter-skin-hero");
        if (heroSelect) {
          const previous = heroSelect.value;
          heroSelect.innerHTML = '<option value="">All Heroes</option>';
          heroes.forEach((hero) => {
            const option = document.createElement("option");
            option.value = hero.id;
            option.textContent = hero.name;
            heroSelect.appendChild(option);
          });
          if (Array.from(heroSelect.options).some((o) => o.value === previous)) {
            heroSelect.value = previous;
          }
        }
        refreshFilterPills();
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
      function renderHeroFormPage(id = null, isUpcoming = false, returnContext = null) {
        const src = currentPageId;
        saveScrollPos(src);
        showPage("page-hero-form");
        document.getElementById("hero-form").reset();
        document.getElementById("hero-skills-container").innerHTML = "";
        updateSkillHeaders();
        document.getElementById("hero-form-context").value = isUpcoming
          ? "upcoming"
          : "official";
        document.getElementById("hero-return-page").value = returnContext || src;
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
      function addSkinExtraVariant(skillIndex, data = { name: "", icon: "" }) {
        const list = document.querySelector(
          `.skin-extra-variant-list[data-skill="${skillIndex}"]`,
        );
        if (!list) return;
        const row = document.createElement("div");
        row.className = "skill-extra-variant-row";
        row.dataset.skill = skillIndex;
        row.innerHTML = `<span class="material-symbols-outlined skill-extra-branch">add_link</span><input type="text" class="form-input skill-extra-name-input" placeholder="Variation name (e.g. Enhanced)" value="${String(data.name || "").replace(/"/g, "&quot;")}"><input type="url" class="form-input skill-extra-url-input" placeholder="Variation icon URL..." value="${String(data.icon || "").replace(/"/g, "&quot;")}"><button type="button" class="btn btn-danger btn-sm skill-extra-remove" title="Remove variation"><span class="material-symbols-outlined">close</span></button>`;
        row.querySelector(".skill-extra-remove").onclick = () => row.remove();
        list.appendChild(row);
      }

      function updateSkinSkillInputs() {
        const hid = document.getElementById("skin-hero-id").value;
        const c = document.getElementById("skin-skill-variants-container");
        c.innerHTML = "";
        if (!hid) return;
        const h = getHeroById(hid);
        if (!h || !h.skills) return;
        h.skills.forEach((skill, i) => {
          const d = document.createElement("div");
          d.className = "form-group skill-variant-group";
          d.dataset.skillIndex = i;
          const subRows = (skill.subSkills || [])
            .map(
              (subSkill, j) =>
                `<div class="skill-override-row skill-sub-override-row"><span class="material-symbols-outlined skill-override-branch">subdirectory_arrow_right</span><img src="${subSkill.icon || skill.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="skill-override-preview" alt=""><span class="skill-override-name">${subSkill.name || "Variation " + (j + 1)}</span><input type="url" class="form-input skill-sub-variant-input" data-skill="${i}" data-sub="${j}" placeholder="Override URL..."></div>`,
            )
            .join("");
          d.innerHTML = `
            <div class="skill-override-heading"><label class="form-label">${skill.name}</label><span class="skill-override-hint">Base + skin-specific variations</span></div>
            <div class="skill-override-row">
              <img src="${skill.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="skill-override-preview skill-override-preview-main" alt="">
              <span class="skill-override-name">Main</span>
              <input type="url" class="form-input skill-variant-input" data-index="${i}" placeholder="Main icon override URL...">
            </div>
            ${subRows}
            <div class="skin-extra-variant-section">
              <div class="skin-extra-variant-label"><span>Additional icon variations</span><span>These cycle after the base/sub icons.</span></div>
              <div class="skin-extra-variant-list" data-skill="${i}"></div>
              <button type="button" class="btn btn-secondary btn-sm add-skill-extra-btn" onclick="addSkinExtraVariant(${i})"><span class="material-symbols-outlined">add</span>Add Variation</button>
            </div>`;
          c.appendChild(d);
        });
      }

      function getSkinSkillDisplayVariants(skin, heroSkill, skillIndex, options = {}) {
        const raw = (skin.variantSkills || [])[skillIndex];
        const mainOverride = raw
          ? typeof raw === "string"
            ? raw
            : raw.main || ""
          : "";
        const subOverrides = raw && typeof raw === "object" ? raw.subs || [] : [];
        const extras =
          raw && typeof raw === "object"
            ? raw.extras || raw.extraVariants || []
            : [];
        const showOverrides = !!skin.showSkillIcons;
        const mainIcon = mainOverride || heroSkill.icon || IMAGE_PLACEHOLDER;
        const mainGreyed = showOverrides && !mainOverride;
        const variants = [
          { name: heroSkill.name, icon: mainIcon, greyed: mainGreyed },
          ...(heroSkill.subSkills || []).map((subSkill, j) => {
            const subUrl = subOverrides[j] || "";
            if (!showOverrides) {
              return {
                name: subSkill.name || heroSkill.name,
                icon: subSkill.icon || heroSkill.icon || IMAGE_PLACEHOLDER,
                greyed: false,
              };
            }
            if (subUrl) {
              return {
                name: subSkill.name || heroSkill.name,
                icon: subUrl,
                greyed: false,
              };
            }
            if (mainOverride) {
              return {
                name: subSkill.name || heroSkill.name,
                icon: mainOverride,
                greyed: true,
              };
            }
            return {
              name: subSkill.name || heroSkill.name,
              icon: subSkill.icon || heroSkill.icon || IMAGE_PLACEHOLDER,
              greyed: showOverrides,
            };
          }),
        ];
        if (showOverrides) {
          extras.forEach((extra, index) => {
            const icon = cleanImageUrl(
              typeof extra === "string" ? extra : extra?.icon || extra?.url || "",
            );
            if (!icon) return;
            variants.push({
              name:
                (typeof extra === "object" && extra?.name) ||
                `${heroSkill.name} Variation ${index + 1}`,
              icon,
              greyed: false,
              extra: true,
            });
          });
        }
        return variants;
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
      function renderSkinForm(id = null, isUpcoming = false, returnContext = null) {
        const src = currentPageId;
        saveScrollPos(src);
        showPage("page-skin-form");
        scrollToTop();
        document.getElementById("skin-form").reset();
        document.getElementById("skin-form-context").value = isUpcoming
          ? "upcoming"
          : "official";
        document.getElementById("skin-return-page").value = returnContext || src;
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
                  // Support legacy strings plus main/sub/extra variation objects.
                  const mainUrl = typeof v === "string" ? v : v.main || "";
                  const subUrls = typeof v === "object" ? v.subs || [] : [];
                  const extras =
                    typeof v === "object"
                      ? v.extras || v.extraVariants || []
                      : [];
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
                  extras.forEach((extra) =>
                    addSkinExtraVariant(i,
                      typeof extra === "string"
                        ? { name: "", icon: extra }
                        : extra,
                    ),
                  );
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
        const existingSkin = (ctx === "upcoming" ? getUpcoming() : getSkins()).find((item) => item.id === id);
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
          addedAt: existingSkin?.addedAt || Date.now(),
          firstAddedAt: existingSkin?.firstAddedAt || (!existingSkin ? Date.now() : null),
          collectionAddedAt: existingSkin?.collectionAddedAt || (!existingSkin && ctx !== "upcoming" ? Date.now() : 0),
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
          const skillGroups = document.querySelectorAll(".skill-variant-group");
          if (skillGroups.length > 0) {
            s.variantSkills = Array.from(skillGroups).map((group) => {
              const skillIdx = parseInt(group.dataset.skillIndex);
              const mainInput = group.querySelector(
                `.skill-variant-input[data-index="${skillIdx}"]`,
              );
              const subInputs = group.querySelectorAll(
                `.skill-sub-variant-input[data-skill="${skillIdx}"]`,
              );
              const extras = Array.from(
                group.querySelectorAll(".skill-extra-variant-row"),
              )
                .map((row) => ({
                  name: row.querySelector(".skill-extra-name-input")?.value.trim() || "",
                  icon: cleanImageUrl(
                    row.querySelector(".skill-extra-url-input")?.value || "",
                  ),
                }))
                .filter((extra) => extra.icon);
              return {
                main: cleanImageUrl(mainInput?.value || ""),
                subs: Array.from(subInputs).map((input) =>
                  cleanImageUrl(input.value),
                ),
                extras,
              };
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
          return { src: IMAGE_PLACEHOLDER, isGreyed: true };

        const fallbackMap = {
          splash: () => hero.splashArt || hero.imageUrl,
          portrait: () => hero.portrait || hero.imageUrl,
          icon: () => hero.icon || hero.headIconUrl,
        };
        const heroImg = fallbackMap[imageType]?.();
        return {
          src: heroImg || IMAGE_PLACEHOLDER,
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
        return { src: IMAGE_PLACEHOLDER, isGreyed: true };
      }

      function renderHeroesPage() {
        const g = document.getElementById("hero-grid");
        g.innerHTML = "";
        const fRoles = getSelectedFilterValues("filter-hero-role");
        const fLanes = getSelectedFilterValues("filter-hero-lane");
        const fSpecs = getSelectedFilterValues("filter-hero-specialty");
        const fNations = getSelectedFilterValues("filter-hero-nation");
        const fSearch = document
          .getElementById("filter-hero-search")
          .value.toLowerCase();
        let h = getHeroes();
        if (fRoles.length || fLanes.length || fSpecs.length || fNations.length || fSearch)
          h = h.filter((x) => {
            if (fRoles.length && !fRoles.some((role) => (x.roles || []).includes(role)))
              return false;
            if (fLanes.length && !fLanes.some((lane) => (x.lanes || []).includes(lane)))
              return false;
            if (fSpecs.length && !fSpecs.some((spec) => (x.specialties || []).includes(spec)))
              return false;
            if (fNations.length && !fNations.includes(x.nation || "")) return false;
            if (fSearch && !x.name.toLowerCase().includes(fSearch)) return false;
            return true;
          });
        h = applySortPill(h, "heroes");
        h = applyRevampingSort(h);
        const revamping = getRevamping();
        const frag = document.createDocumentFragment();

        const normRole = (r) =>
          r
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z\-]/g, "");
        h.forEach((x) => {
          const c = document.createElement("div");
          const isRevampingCard = !!revamping[x.id];
          c.className = "unified-card" + (isRevampingCard ? " revamping-card" : "");
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
                return `<div class="card-skill-strip-wrapper" data-skill-name="${s.name.replace(/"/g, "&quot;")}" data-skill-variants="${encodeURIComponent(JSON.stringify(all))}" onmouseenter="startSkillCycle(this)" onmouseleave="stopSkillCycle(this)"><img src="${s.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="card-skill-strip-icon${hasSubs ? " sub-cycling" : ""}"></div>`;
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

          const revampIcon = isRevampingCard ? "construction" : "handyman";
          const revampClass = isRevampingCard ? "active" : "";
          c.innerHTML = `<div class="card-image-wrapper"><img src="${x.splashArt || IMAGE_PLACEHOLDER}" class="card-image" loading="lazy">${skillsHtml}<div class="card-overlay-actions"><div class="overlay-btn revamp ${revampClass}" data-tooltip="${isRevampingCard ? 'Remove Revamping status' : 'Mark as Revamping'}" onclick="event.stopPropagation();toggleRevamping('${x.id}',renderHeroesPage)"><span class="material-symbols-outlined">${revampIcon}</span></div><div class="overlay-btn" onclick="renderHeroFormPage('${x.id}',false)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteHero('${x.id}',false)"><span class="material-symbols-outlined">delete</span></div></div></div><div class="card-content"><h3 class="card-title">${x.name}</h3>${attrStripHtml}${metaHtml}</div>`;
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

      function detailChip(value, options = {}) {
        if (value == null || value === "") return "";
        const data = typeof value === "object" ? value : { text: value };
        const text = data.text == null ? "" : data.text;
        if (text === "") return "";
        const clickable = !!data.onclick;
        const tag = clickable ? "button" : "span";
        const type = clickable ? ' type="button"' : "";
        const className = `detail-chip${clickable ? " detail-chip-clickable" : ""}`;
        const color = data.color || options.color || "";
        const style = color ? ` style="--chip-accent:${color};"` : "";
        const click = clickable ? ` onclick="${data.onclick}"` : "";
        return `<${tag}${type} class="${className}"${style}${click}>${text}</${tag}>`;
      }

      function detailGroup(label, values, options = {}) {
        const list = (Array.isArray(values) ? values : [values]).filter(
          (value) => value != null && value !== "",
        );
        if (!list.length) return "";
        return `<div class="detail-group"><span class="detail-group-label">${label}</span><div class="detail-chip-list">${list
          .map((value) => detailChip(value, options))
          .join("")}</div></div>`;
      }

      function detailMeta(icon, label, value) {
        if (value == null || value === "") return "";
        return `<div class="detail-meta-item"><span class="material-symbols-outlined detail-meta-icon">${icon}</span><div class="detail-meta-copy"><span class="detail-meta-label">${label}</span><span class="detail-meta-value">${value}</span></div></div>`;
      }

      function formatDetailKey(key) {
        return key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (m) => m.toUpperCase())
          .trim();
      }

      function renderSkinModalContent(s, c) {
        const h =
          getHeroById(s.heroId) ||
          getUpcoming().find((x) => x.id === s.heroId && x.itemType === "hero");
        let skillsHtml = "";
        if (h?.skills?.length && !s.isStatue && s.type !== "statue") {
          const skillsMarkup = h.skills
            .map((skill, i) => {
              const allVariants = getSkinSkillDisplayVariants(s, skill, i);
              const first = allVariants[0] || {
                icon: skill.icon || IMAGE_PLACEHOLDER,
                greyed: false,
              };
              const safeJson = encodeURIComponent(JSON.stringify(allVariants));
              const hasVariants = allVariants.length > 1;
              const dots = hasVariants
                ? `<div class="modal-skill-dots">${allVariants.map((_, j) => `<span class="modal-skill-dot${j === 0 ? " active" : ""}"></span>`).join("")}</div>`
                : "";
              return `<div class="skill-item modal-skill-cycler${hasVariants ? " has-subs" : ""}" data-skill-variants="${safeJson}" data-skill-idx="0"${buildCatTooltipAttr(skill.categories)} onmouseenter="startModalSkillCycle(this)" onmouseleave="stopModalSkillCycle(this)">
                <img src="${first.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="skill-icon" style="${first.greyed ? "filter:grayscale(100%) opacity(0.45)" : ""}">
                <div class="skill-name">${skill.name}</div>${dots}</div>`;
            })
            .join("");
          skillsHtml = `<div class="modal-section-header">Skill Effects</div><div class="skill-list">${skillsMarkup}</div>`;
        }

        const isStatue = s.isStatue || s.type === "statue";
        const rarityColor = `var(--rarity-${(s.collectible || s.rarity || "basic").toLowerCase().replace(/\s+/g, "-")}, var(--accent))`;
        const identityGroups = [
          isRevamping(s.id) ? detailGroup("Status", [{ text: "Revamping", color: "#60a5fa" }]) : "",
          detailGroup(
            "Hero",
            h
              ? [{ text: h.name, onclick: `openModal('hero','${h.id}')` }]
              : ["Unknown"],
          ),
          detailGroup("Type", [isStatue ? "Sacred Statue" : "Skin"]),
          !isStatue
            ? detailGroup("Rarity", [{ text: s.rarity || "Basic", color: rarityColor }])
            : "",
          !isStatue && s.collectible
            ? detailGroup("Tag", [{ text: s.collectible, color: rarityColor }])
            : "",
        ].join("");

        const tagMeta = Object.entries(s.tagDetails || {})
          .map(([key, value]) => detailMeta("label", formatDetailKey(key), value))
          .join("");
        const meta = [
          detailMeta("calendar_month", "Released", s.releaseDate),
          detailMeta("diamond", "Diamonds", s.priceDiamonds),
          tagMeta,
        ].join("");

        let html = `<div class="modal-detail-summary"><div class="detail-groups">${identityGroups}</div>${meta ? `<div class="detail-meta-strip">${meta}</div>` : ""}</div>${skillsHtml}`;

        if (!isStatue && s.paintedSkins?.length) {
          html += `<div class="modal-section-header">Painted Skins</div><div class="mini-grid compact-gallery">
            <div class="landscape-item active" data-tooltip="Original" onclick="togglePaintedSkin(null,this)" style="--card-glow:var(--accent);"><img src="${s.splashArt || s.imageUrl || IMAGE_PLACEHOLDER}" class="item-bg" loading="lazy"></div>
            ${s.paintedSkins
              .map((painted, i) => {
                const imgData = getPaintedSkinImage(painted, s, "splash");
                return `<div class="landscape-item" data-tooltip="${painted.name}" onclick="togglePaintedSkin(${i},this)"><img src="${imgData.src}" class="item-bg" loading="lazy"${imgData.isGreyed ? ' style="filter:grayscale(100%) opacity(0.5)"' : ""}></div>`;
              })
              .join("")}
          </div>`;
        }
        c.innerHTML = html;
      }

      function renderHeroModalContent(h, c) {
        const skins = getSkins().filter((x) => x.heroId === h.id && x.type !== "statue");
        const statues = getSkins().filter((x) => x.heroId === h.id && (x.type === "statue" || x.isStatue));

        let skillsHtml = "";
        if (h.skills?.length) {
          const skillsMarkup = h.skills
            .map((skill) => {
              const allVariants = [
                { name: skill.name, icon: skill.icon || IMAGE_PLACEHOLDER },
                ...(skill.subSkills || []).map((ss) => ({
                  name: ss.name || skill.name,
                  icon: ss.icon || skill.icon || IMAGE_PLACEHOLDER,
                  greyed: !ss.icon,
                })),
              ];
              const safeJson = encodeURIComponent(JSON.stringify(allVariants));
              const hasSubs = allVariants.length > 1;
              const dots = hasSubs
                ? `<div class="modal-skill-dots">${allVariants.map((_, i) => `<span class="modal-skill-dot${i === 0 ? " active" : ""}"></span>`).join("")}</div>`
                : "";
              return `<div class="skill-item modal-skill-cycler${hasSubs ? " has-subs" : ""}" data-skill-variants="${safeJson}" data-skill-idx="0"${buildCatTooltipAttr(skill.categories)} onmouseenter="startModalSkillCycle(this)" onmouseleave="stopModalSkillCycle(this)">
                <img src="${skill.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="skill-icon">
                <div class="skill-name">${skill.name}</div>${dots}</div>`;
            })
            .join("");
          skillsHtml = `<div class="modal-section-header">Skills</div><div class="skill-list">${skillsMarkup}</div>`;
        }

        const tierColors = { S: "#ff7f7f", A: "#ffbf7f", B: "#ffff7f", C: "#7fff7f", D: "#7fbfff" };
        let heroTier = null;
        for (const [tier, heroes] of Object.entries(getTierList())) {
          if (heroes.some((x) => (x.id || x) === h.id)) {
            heroTier = tier;
            break;
          }
        }

        const classification = [
          isRevamping(h.id) ? detailGroup("Status", [{ text: "Revamping", color: "#60a5fa" }]) : "",
          detailGroup("Tier", [{ text: heroTier || "Unranked", color: heroTier ? tierColors[heroTier] : "" }]),
          detailGroup(
            "Role",
            (h.roles || []).map((value) => ({
              text: value,
              color: `var(--role-${value.toLowerCase().replace(/\s+/g, "-")}, var(--accent))`,
            })),
          ),
          detailGroup("Lane", h.lanes || []),
          detailGroup("Specialty", h.specialties || []),
          detailGroup("Nation", h.nation ? [h.nation] : []),
        ].join("");
        const meta = [
          detailMeta("calendar_month", "Released", h.releaseDate),
          detailMeta("paid", "Battle Points", h.priceBP),
          detailMeta("diamond", "Diamonds", h.priceDiamonds),
        ].join("");

        let html = `<div class="modal-detail-summary"><div class="detail-groups">${classification}</div>${meta ? `<div class="detail-meta-strip">${meta}</div>` : ""}</div>${skillsHtml}`;
        html += `<div class="modal-section-header">Skins <span class="section-count">${skins.length}</span></div><div class="mini-grid compact-gallery">${skins
          .map((skin) => {
            const ex = getSkinExtraInfo(skin);
            const raritySlug = (skin.collectible || skin.rarity || "basic").toLowerCase().replace(/\s+/g, "-");
            return `<div class="landscape-item" style="--card-glow:var(--rarity-${raritySlug},var(--rarity-basic));" data-tooltip="${skin.name}${ex ? ` (${ex})` : ""}" onclick="openModal('skin','${skin.id}')"><img src="${skin.splashArt || skin.imageUrl || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="item-bg" loading="lazy"></div>`;
          })
          .join("")}
          <div class="landscape-item add-skin-btn" onclick="openSkinFormFromModal('${h.id}')" title="Add Skin"><span class="material-symbols-outlined">add</span></div>
        </div>`;

        const painted = skins.filter((x) => x.paintedSkins?.length);
        if (painted.length) {
          html += `<div class="modal-section-header">Painted Skins</div><div class="mini-grid compact-gallery">${painted
            .map((base) =>
              base.paintedSkins
                .map((paintedSkin) => {
                  const imgData = getPaintedSkinImage(paintedSkin, base, "splash");
                  return `<div class="landscape-item" data-tooltip="${paintedSkin.name}" onclick="openModal('skin','${base.id}')"><img src="${imgData.src}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="item-bg" loading="lazy"${imgData.isGreyed ? ' style="filter:grayscale(100%) opacity(0.5)"' : ""}></div>`;
                })
                .join(""),
            )
            .join("")}</div>`;
        }

        if (statues.length) {
          html += `<div class="modal-section-header">Sacred Statues</div><div class="mini-grid compact-gallery">${statues
            .map((statue) => {
              const imgData = getSkinImageWithFallback(statue, "splash");
              return `<div class="portrait-item" style="--card-glow:var(--rarity-basic);" data-tooltip="${statue.name}" onclick="openModal('skin','${statue.id}')"><img src="${imgData.src}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="item-bg" loading="lazy"${imgData.isGreyed ? ' style="filter:grayscale(100%) opacity(0.5)"' : ""}></div>`;
            })
            .join("")}</div>`;
        }
        c.innerHTML = html;
      }

      function getHeroBadgeImageSources(hero) {
        if (!hero) {
          return { src: IMAGE_PLACEHOLDER, fallback: IMAGE_PLACEHOLDER, fallback2: IMAGE_PLACEHOLDER };
        }
        const candidates = [hero.icon, hero.portrait, hero.splashArt]
          .map((url) => (url ? cleanImageUrl(url) : ""))
          .filter(Boolean);
        const unique = [...new Set(candidates)];
        return {
          src: unique[0] || IMAGE_PLACEHOLDER,
          fallback: unique[1] || IMAGE_PLACEHOLDER,
          fallback2: unique[2] || IMAGE_PLACEHOLDER,
        };
      }

      function renderSkinsPage() {
        const g = document.getElementById("skin-grid");
        g.innerHTML = "";
        const fHero = document.getElementById("filter-skin-hero").value;
        const fRarities = getSelectedFilterValues("filter-skin-rarity");
        const fTypes = getSelectedFilterValues("filter-skin-type");
        const fCollectibles = getSelectedFilterValues("filter-skin-collectible");
        const fSearch = document
          .getElementById("skin-search")
          .value.toLowerCase();
        const skins = getSkins();
        const wantsPainted = fTypes.includes("Painted Skin");
        const wantsStatues = fTypes.includes("Sacred Statue");
        const standardSkins = skins.filter(
          (skin) => !skin.isStatue && skin.type !== "statue",
        );
        let display = [];

        if (fTypes.length === 0) {
          // "All" in Type keeps the normal/default skin catalogue view.
          display = [...standardSkins];
        } else {
          if (wantsPainted) {
            standardSkins.forEach((baseSkin) => {
              (baseSkin.paintedSkins || []).forEach((paintedSkin) =>
                display.push({
                  ...paintedSkin,
                  _baseSkin: baseSkin,
                  id: baseSkin.id,
                  heroId: baseSkin.heroId,
                  rarity: baseSkin.rarity,
                  type: "painted",
                  collectible: baseSkin.collectible || null,
                  paintedSkinName: paintedSkin.name,
                  baseSkinName: baseSkin.name,
                }),
              );
            });
          }
          if (wantsStatues) {
            display.push(
              ...skins.filter((skin) => skin.isStatue || skin.type === "statue"),
            );
          }
        }

        if (fSearch || fRarities.length || fCollectibles.length || fHero) {
          display = display.filter((item) => {
            const baseSkin =
              item.type === "painted" ? item._baseSkin || getSkinById(item.id) : null;
            const rarity = item.rarity || baseSkin?.rarity || "";
            const collectible = item.collectible || baseSkin?.collectible || "";
            if (fSearch && !String(item.name || "").toLowerCase().includes(fSearch))
              return false;
            if (fRarities.length && !fRarities.includes(rarity)) return false;
            if (fCollectibles.length && !fCollectibles.includes(collectible))
              return false;
            if (fHero && item.heroId !== fHero) return false;
            return true;
          });
        }
        display = applySortPill(display, "skins");
        display = applyRevampingSort(display);
        const revamping = getRevamping();

        if (display.length === 0) {
          document.getElementById("no-skins-message").style.display = "block";
          g.classList.remove("sacred-statue-view");
          return;
        }
        document.getElementById("no-skins-message").style.display = "none";

        const isSacredStatueView =
          fTypes.length === 1 && wantsStatues;
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

          c.className = cc + (revamping[x.id] ? " revamping-card" : "");
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

          // Hero icon overlay (top-left for normal, top-right for sacred statue).
          // Clean the stored icon URL and fall back to other hero artwork before
          // showing the generic placeholder.
          const hero = getHeroById(x.heroId);
          const heroBadge = getHeroBadgeImageSources(hero);
          const heroIconHtml = hero
            ? `<div class="card-hero-icon" title="${hero.name}"><img src="${heroBadge.src}" data-fallback-src="${heroBadge.fallback}" data-fallback-src2="${heroBadge.fallback2}" alt="${hero.name} icon" loading="lazy"></div>`
            : "";
          const heroIconRightHtml = hero
            ? `<div class="card-hero-icon card-hero-icon-right" title="${hero.name}"><img src="${heroBadge.src}" data-fallback-src="${heroBadge.fallback}" data-fallback-src2="${heroBadge.fallback2}" alt="${hero.name} icon" loading="lazy"></div>`
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
            const skillItems = hero.skills
              .map((skill, i) => {
                const variants = getSkinSkillDisplayVariants(
                  baseSkinForSkills,
                  skill,
                  i,
                );
                const first = variants[0] || {
                  icon: skill.icon || IMAGE_PLACEHOLDER,
                  greyed: true,
                };
                return `<div class="card-skill-strip-wrapper" data-skill-name="${skill.name.replace(/"/g, "&quot;")}" data-skill-variants="${encodeURIComponent(JSON.stringify(variants))}" onmouseenter="startSkillCycle(this)" onmouseleave="stopSkillCycle(this)"><img src="${first.icon || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" class="card-skill-strip-icon${variants.length > 1 ? " sub-cycling" : ""}" style="${first.greyed ? "filter:grayscale(100%) opacity(0.5);" : ""}"></div>`;
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
            const revampIcon = revamping[x.id] ? "construction" : "handyman";
            const revampCls = revamping[x.id] ? "active" : "";
            act = `<div class="card-overlay-actions"><div class="overlay-btn revamp ${revampCls}" data-tooltip="${revamping[x.id] ? 'Remove Revamping status' : 'Mark as Revamping'}" onclick="event.stopPropagation();toggleRevamping('${x.id}',renderSkinsPage)"><span class="material-symbols-outlined">${revampIcon}</span></div><div class="overlay-btn" onclick="renderSkinForm('${x.id}',false)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteSkin('${x.id}',false)"><span class="material-symbols-outlined">delete</span></div></div>`;
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
            const revampIconSt = revamping[x.id] ? "construction" : "handyman";
            const revampClsSt = revamping[x.id] ? "active" : "";
            const statueAct = `<div class="card-overlay-actions" style="top:8px;left:8px;right:auto;flex-direction:column;gap:6px;">
              <div class="overlay-btn revamp ${revampClsSt}" data-tooltip="${revamping[x.id] ? 'Remove Revamping status' : 'Mark as Revamping'}" onclick="event.stopPropagation();toggleRevamping('${x.id}',renderSkinsPage)" style="width:30px;height:30px;"><span class="material-symbols-outlined" style="font-size:16px;">${revampIconSt}</span></div>
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

        const newestSkin = typeof getNewestSkinAddition === "function" ? getNewestSkinAddition() : null;
        const newestSkinId = newestSkin?.id || "";
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
          d.dataset.groupKey = k;
          const isClosed = !!cState[k];
          d.classList.toggle("is-collapsed", isClosed);
          const sum = document.createElement("div");
          sum.className = "skin-group-summary";
          // Header icon based on group-by type
          let groupIcon = "";
          if (by === "hero") {
            const heroObj = getHeroById(k);
            if (heroObj) {
              const badge = getHeroBadgeImageSources(heroObj);
              groupIcon = `<img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" class="group-hero-icon" alt="${heroObj.name}">`;
            }
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
          con.hidden = isClosed;

          sum.onclick = () => {
            const shouldOpen = d.classList.contains("is-collapsed");
            if (typeof setSkinCountGroupOpen === "function") setSkinCountGroupOpen(d, shouldOpen, true);
            else { d.classList.toggle("is-collapsed", !shouldOpen); con.hidden = !shouldOpen; }
            cState[k] = !shouldOpen;
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

            // "New" belongs only to the single newest skin added to the collection.
            wrapper.appendChild(icon);
            if (skin.id === newestSkinId) {
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
        if (typeof updateSkinCountGroupControls === "function") updateSkinCountGroupControls();

        // Update chart data after rendering (accurate counts post-filter)
        renderSkinCountPage._chartData = chartItems;
        const chartContainer = document.getElementById(
          "skin-count-chart-container",
        );
        if (chartContainer && chartContainer.style.display !== "none") {
          drawSkinCountChart(chartItems);
        }
      }
