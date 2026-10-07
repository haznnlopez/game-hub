// --- Missing Input Warning System ---
      function isFieldResolved(warnKey, fieldKey) {
        const resolved = JSON.parse(
          localStorage.getItem("resolvedWarnings") || "{}",
        );
        return !!(resolved[warnKey] && resolved[warnKey].includes(fieldKey));
      }
      function setResolvedWarning(warnKey, fieldKeys) {
        const resolved = JSON.parse(
          localStorage.getItem("resolvedWarnings") || "{}",
        );
        if (!resolved[warnKey]) resolved[warnKey] = [];
        fieldKeys.forEach((fk) => {
          if (!resolved[warnKey].includes(fk)) resolved[warnKey].push(fk);
        });
        localStorage.setItem("resolvedWarnings", JSON.stringify(resolved));
      }
      function clearResolvedWarning(warnKey, fieldKey) {
        const resolved = JSON.parse(
          localStorage.getItem("resolvedWarnings") || "{}",
        );
        if (resolved[warnKey]) {
          resolved[warnKey] = resolved[warnKey].filter((k) => k !== fieldKey);
          if (!resolved[warnKey].length) delete resolved[warnKey];
        }
        localStorage.setItem("resolvedWarnings", JSON.stringify(resolved));
      }

      function getCookieMissingFields(c) {
        const isGuest = c.rarity === "Guest";
        const fields = [];
        if (!c.images.head)
          fields.push({ key: "head", label: "Head Icon", icon: null });
        if (!c.images.splash)
          fields.push({ key: "splash", label: "Splash Art", icon: null });
        if (!c.images.card)
          fields.push({ key: "card", label: "Card Art", icon: null });
        if (!c.images.sprite)
          fields.push({ key: "sprite", label: "Sprite Image", icon: null });
        if (!isGuest) {
          if (!c.rarity)
            fields.push({ key: "rarity", label: "Rarity", icon: null });
          if (!c.role) fields.push({ key: "role", label: "Role", icon: null });
          if (!c.position)
            fields.push({ key: "position", label: "Position", icon: null });
          if (!c.skill || !c.skill.name)
            fields.push({
              key: "skill_name",
              label: "Skill Name",
              icon: c.images.head || null,
            });
          if (!c.skill || !c.skill.icon)
            fields.push({
              key: "skill_icon",
              label: "Skill Icon",
              icon: c.images.head || null,
            });
          if (!c.skill || !c.skill.desc)
            fields.push({
              key: "skill_desc",
              label: "Skill Description",
              icon: c.images.head || null,
            });
        }
        return fields;
      }
      function getSkinMissingFields(s) {
        const fields = [];
        if (!s.card)
          fields.push({ key: "card", label: "Card Art", icon: null });
        if (!s.splash)
          fields.push({ key: "splash", label: "Splash Art", icon: null });
        if (!s.sprite)
          fields.push({ key: "sprite", label: "Sprite Image", icon: null });
        if (!s.rarity)
          fields.push({ key: "rarity", label: "Rarity", icon: null });
        if (!s.ownerId)
          fields.push({ key: "owner", label: "Cookie Owner", icon: null });
        if (!s.desc)
          fields.push({ key: "desc", label: "Description", icon: null });
        return fields;
      }
      function getPowerupMissingFields(p) {
        const fields = [];
        if (!p.url10)
          fields.push({ key: "url10", label: "Image (+10)", icon: null });
        if (!p.url20)
          fields.push({ key: "url20", label: "Image (+20)", icon: null });
        if (!p.url30)
          fields.push({ key: "url30", label: "Image (+30)", icon: null });
        if (!p.type) fields.push({ key: "type", label: "Type", icon: null });
        if (!p.ownerId)
          fields.push({ key: "owner", label: "Cookie Owner", icon: null });
        if (!p.desc)
          fields.push({ key: "desc", label: "Description", icon: null });
        return fields;
      }

      function getActiveWarnings(warnKey, fields) {
        return fields.filter((f) => !isFieldResolved(warnKey, f.key));
      }

      let _warnTooltip = null;
      function getWarnTooltip() {
        if (!_warnTooltip) {
          _warnTooltip = document.createElement("div");
          _warnTooltip.className = "warning-tooltip";
          _warnTooltip.id = "warning-tooltip-singleton";
          document.body.appendChild(_warnTooltip);
          document.addEventListener("click", (e) => {
            if (
              !_warnTooltip.contains(e.target) &&
              !e.target.closest(".card-warning-btn")
            )
              _warnTooltip.classList.remove("visible");
          });
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") _warnTooltip.classList.remove("visible");
          });
        }
        return _warnTooltip;
      }

      function showWarningTooltip(btn, warnKey, fields, onResolved) {
        const tooltip = getWarnTooltip();
        const renderTooltipContent = () => {
          const currentActive = getActiveWarnings(warnKey, fields);
          tooltip.innerHTML = `
            <div class="warning-tooltip-header">
              <span class="material-symbols-outlined">warning</span>
              Missing Information (${currentActive.length})
              <button onclick="document.getElementById('warning-tooltip-singleton').classList.remove('visible')" style="margin-left:auto;background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;padding:0;display:flex;align-items:center;" title="Close"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
            </div>
            ${fields
              .map((f) => {
                const resolved = isFieldResolved(warnKey, f.key);
                return `<div class="warning-field-row">
                ${f.icon ? `<img class="warning-field-icon" src="${f.icon}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined" style="font-size:18px;color:var(--text-muted);flex-shrink:0">help_outline</span>`}
                <span style="${resolved ? "text-decoration:line-through;opacity:0.5;" : ""}">${f.label}</span>
                <input type="checkbox" class="warning-checkbox" ${resolved ? "checked" : ""}
                  data-warn-key="${warnKey}" data-field-key="${f.key}">
              </div>`;
              })
              .join("")}
            <div class="warning-tooltip-footer">Check to mark as N/A · Fill in the field to auto-resolve</div>`;
          tooltip.querySelectorAll(".warning-checkbox").forEach((cb) => {
            cb.addEventListener("change", (e) => {
              e.stopPropagation();
              if (cb.checked)
                setResolvedWarning(cb.dataset.warnKey, [cb.dataset.fieldKey]);
              else
                clearResolvedWarning(cb.dataset.warnKey, cb.dataset.fieldKey);
              renderTooltipContent();
              if (onResolved) onResolved();
            });
          });
        };
        renderTooltipContent();
        tooltip.classList.add("visible");
        const rect = btn.getBoundingClientRect();
        let top = rect.top - tooltip.offsetHeight - 8;
        let left = rect.left;
        if (top < 8) top = rect.bottom + 8;
        if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
        if (left < 8) left = 8;
        tooltip.style.top = top + "px";
        tooltip.style.left = left + "px";
        requestAnimationFrame(() => {
          let t2 = rect.top - tooltip.offsetHeight - 8;
          if (t2 < 8) t2 = rect.bottom + 8;
          tooltip.style.top = t2 + "px";
        });
      }

      function makeWarningBtn(warnKey, fields, onResolved) {
        const active = getActiveWarnings(warnKey, fields);
        if (!active.length) return "";
        return `<button class="card-warning-btn" title="Missing fields" onclick="event.stopPropagation();_triggerWarning(this,'${warnKey}')">
          <span class="material-symbols-outlined">warning</span>
        </button>`;
      }

      const _warningDataMap = {};
      function _triggerWarning(btn, warnKey) {
        const data = _warningDataMap[warnKey];
        if (!data) return;
        showWarningTooltip(btn, warnKey, data.fields, data.onResolved);
      }
      function registerWarning(warnKey, fields, onResolved) {
        _warningDataMap[warnKey] = { fields, onResolved };
      }
      // ============================================================

      // --- Helper for Card Actions ---
      function getCardActions(type, idOrIdx) {
        let editFn = "",
          delFn = "";
        if (type === "cookie") {
          editFn = `event.stopPropagation(); openCookieForm('${idOrIdx}')`;
          delFn = `event.stopPropagation(); deleteCookie('${idOrIdx}')`;
        } else if (type === "skin") {
          editFn = `event.stopPropagation(); openSkinForm(${idOrIdx})`;
          delFn = `event.stopPropagation(); deleteSkin(${idOrIdx})`;
        } else if (type === "powerup") {
          editFn = `event.stopPropagation(); openPowerupForm(${idOrIdx})`;
          delFn = `event.stopPropagation(); deletePowerup(${idOrIdx})`;
        }

        return `
            <div class="card-actions">
                <button class="action-btn" onclick="${editFn}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button class="action-btn delete" onclick="${delFn}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
            </div>
        `;
      }

      // --- Deletion Handlers ---
      function deleteCookie(id) {
        showConfirm("Delete this Cookie?", () => {
          appData.cookies = appData.cookies.filter((c) => c.id !== id);
          // Cascade delete? Optional. keeping skins orphaned or deleting them:
          appData.costumes = appData.costumes.filter((c) => c.ownerId !== id);
          appData.powerups = appData.powerups.filter((p) => p.ownerId !== id);
          persistAppData();
          renderCookies();
          showToast("Cookie Deleted");
        });
      }
      function deleteSkin(idx) {
        showConfirm("Delete Costume?", () => {
          appData.costumes.splice(idx, 1);
          persistAppData();
          if (
            document
              .getElementById("modal-cookie-detail")
              .classList.contains("open")
          )
            openCookieDetail(currentDetailId);
          else renderSkins();
          showToast("Costume Deleted");
        });
      }
      function deletePowerup(idx) {
        showConfirm("Delete Power-up?", () => {
          appData.powerups.splice(idx, 1);
          persistAppData();
          if (
            document
              .getElementById("modal-cookie-detail")
              .classList.contains("open")
          )
            openCookieDetail(currentDetailId);
          else renderAllPowerups();
          showToast("Power-up Deleted");
        });
      }

      // --- Cookies Logic ---
      function renderCookies() {
        clearCycles();
        const container = document.getElementById("cookie-container");
        container.innerHTML = "";
        const sortBy = document.getElementById("sort-cookie").value;
        const search = document
          .getElementById("search-cookie")
          .value.toLowerCase();

        // Grouping
        const groups = {};
        appData.cookies
          .filter((c) => c.name.toLowerCase().includes(search))
          .forEach((c) => {
            const isGuest = c.rarity === "Guest";

            if (sortBy === "element") {
              // Guests have no elements — skip them from element groups
              if (isGuest) return;
              const elems =
                c.elements && c.elements.length ? c.elements : ["None"];
              elems.forEach((e) => {
                if (!groups[e]) groups[e] = [];
                groups[e].push(c);
              });
            } else if (sortBy === "role" || sortBy === "position") {
              // Guests have no role/position — skip them from these groups
              if (isGuest) return;
              const k = c[sortBy] || "Other";
              if (!groups[k]) groups[k] = [];
              groups[k].push(c);
            } else {
              const k =
                sortBy === "none" ? "All Cookies" : c[sortBy] || "Other";
              if (!groups[k]) groups[k] = [];
              groups[k].push(c);
            }
          });

        // Sort keys
        let keys = Object.keys(groups);
        if (sortBy === "rarity") {
          keys.sort(
            (a, b) =>
              appData.attributes.rarity.findIndex((x) => x.name === a) -
              appData.attributes.rarity.findIndex((x) => x.name === b),
          );
        } else if (sortBy === "element") {
          keys.sort((a, b) => {
            let idxA = appData.attributes.element.findIndex(
              (x) => x.name === a,
            );
            let idxB = appData.attributes.element.findIndex(
              (x) => x.name === b,
            );
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
          });
        } else if (sortBy !== "none") {
          keys.sort();
        }

        keys.forEach((k) => {
          const section = document.createElement("div");
          section.className = "category-section";

          let iconUrl = "";
          if (sortBy !== "none") {
            const attrObj = getAttr(sortBy, k);
            if (attrObj && attrObj.icon) iconUrl = attrObj.icon;
          }

          section.innerHTML = `<div class="category-title" onclick="toggleSection(this)">${iconUrl ? `<img src="${iconUrl}" class="category-icon">` : ""} ${k}</div>`;

          const grid = document.createElement("div");
          grid.className = "card-grid";
          groups[k].forEach((c) => {
            const card = document.createElement("div");
            card.className = "card";
            card.onclick = () => {
              openCookieDetail(c.id);
            };

            // Guest Logic for Cards
            const isGuest = c.rarity === "Guest";

            let cardIconsHtml = "";

            if (!isGuest) {
              const roleIco = getAttr("role", c.role).icon;
              const posIco = getAttr("position", c.position).icon;

              // Element Cycling Logic
              let elHtml = "";
              const elementIcons = (c.elements || [])
                .map((e) => getAttr("element", e).icon)
                .filter(Boolean);

              if (elementIcons.length > 1) {
                const cycleId = `el-cycle-${c.id}`;
                elHtml = `<div class="mini-icon"><img id="${cycleId}" src="${elementIcons[0]}"></div>`;
                registerCycle(cycleId, elementIcons, (el, item) => {
                  el.src = item;
                });
              } else if (elementIcons.length === 1) {
                elHtml = `<div class="mini-icon"><img src="${elementIcons[0]}"></div>`;
              }

              cardIconsHtml = `
                        ${roleIco ? `<div class="mini-icon"><img src="${roleIco}"></div>` : ""}
                        ${posIco ? `<div class="mini-icon"><img src="${posIco}"></div>` : ""}
                        ${elHtml}
                    `;
            }

            card.innerHTML = `
                    <img src="${c.images.card || c.images.splash || c.images.head}" class="card-img" onerror="this.src='https://placehold.co/100/3e2b2b/FFF?text=?'">
                    <div class="card-icons">
                         ${cardIconsHtml}
                    </div>
                    <div class="card-overlay">
                        <div class="card-text-wrapper">
                            <div class="card-name">${c.name}</div>
                            <div class="card-sub">${c.rarity}</div>
                        </div>
                    </div>
                    ${(() => {
                      const wk = "cookie_" + c.id;
                      const mf = getCookieMissingFields(c);
                      registerWarning(wk, mf, () => renderCookies());
                      return makeWarningBtn(wk, mf, () => renderCookies());
                    })()}
                    ${getCardActions("cookie", c.id)}
                `;
            grid.appendChild(card);
          });
          section.appendChild(grid);
          container.appendChild(section);
        });
        restoreCollapsedSections();
      }

      // --- New Detail View Logic ---
      function openCookieDetail(id) {
        const c = appData.cookies.find((x) => x.id === id);
        if (!c) return;
        currentDetailId = id;

        const container = document.getElementById("cookie-detail-content");
        const modalBox = document.querySelector(
          "#modal-cookie-detail .modal-box",
        );

        // Apply Custom Background if exists
        if (c.images.bg) {
          modalBox.style.backgroundImage = `linear-gradient(to bottom, rgba(30, 20, 20, 0.8), rgba(30, 20, 20, 0.9)), url('${c.images.bg}')`;
          modalBox.style.backgroundRepeat = "no-repeat";
          modalBox.style.backgroundSize = "cover";
          modalBox.style.backgroundPosition = "center";
        } else {
          modalBox.style.backgroundImage = "none";
          modalBox.style.backgroundRepeat = "";
          modalBox.style.backgroundSize = "";
          modalBox.style.backgroundPosition = "";
        }

        const isGuest = c.rarity === "Guest";

        // Match attributes using specific categories to avoid collision
        const rarityIcon = getAttr("rarity", c.rarity).icon;
        const roleIcon = isGuest ? null : getAttr("role", c.role).icon;

        // Filter Related Data
        const costumes = appData.costumes.filter((x) => x.ownerId === id);
        const powerups = isGuest
          ? []
          : appData.powerups.filter((x) => x.ownerId === id);

        const renderSkinCard = (s) => {
          const idx = appData.costumes.indexOf(s);
          // Costume Rarity Icon
          const sRarityIcon = getAttr("skinRarity", s.rarity).icon;

          return `
            <div class="card" onclick="viewSkin(${idx})">
                <img src="${s.card || s.splash || s.sprite}" class="card-img" style="object-fit:contain; background:var(--bg-darker);">
                 <div class="card-icons" style="top:8px; right:8px;">
                    ${sRarityIcon ? `<div class="mini-icon"><img src="${sRarityIcon}"></div>` : ""}
                </div>
                <div class="card-overlay"><div class="card-text-wrapper"><div class="card-name" style="font-size:0.8rem">${s.name}</div></div></div>
                ${getCardActions("skin", idx)}
            </div>`;
        };

        const renderPuCard = (p) => {
          const idx = appData.powerups.indexOf(p);
          // Cycle Logic for Powerup Card (+10, +20, +30 images) - USING IMG ELEMENT
          const images = [p.url10, p.url20, p.url30].filter(Boolean);
          const cycleId = `pu-card-img-detail-${Math.random().toString(36).substr(2, 9)}`; // Unique ID with random suffix

          // Get Background from Attribute
          const typeData = getAttr("powerupType", p.type);
          const bgStyle = typeData.background
            ? `background-image:url('${typeData.background}'); background-size:cover;`
            : "";
          const typeIcon = typeData.icon;

          const initialImg = images.length > 0 ? images[0] : "";

          // Register cycle AFTER rendering to ensure element exists
          const htmlStr = `
            <div class="pu-card" onclick="viewPowerup(${idx})" style="${bgStyle}">
                 <div class="pu-img-container">
                    ${initialImg ? `<img id="${cycleId}" src="${initialImg}" class="pu-cycle-img">` : ""}
                 </div>
                <div class="card-icons" style="top:8px; right:8px; z-index:5;">
                    ${typeIcon ? `<div class="mini-icon"><img src="${typeIcon}"></div>` : ""}
                </div>
                <!-- Reusing card-overlay structure for consistent hover effect -->
                <div class="card-overlay">
                    <div class="card-text-wrapper">
                        <div class="card-name">${p.name}</div>
                        <div class="card-sub">${p.type}</div>
                    </div>
                </div>
                ${getCardActions("powerup", idx)}
            </div>`;

          // Store cycle info for registration after DOM update
          if (images.length > 1) {
            // Use setTimeout to ensure element exists before registering cycle
            setTimeout(() => {
              registerCycle(cycleId, images, (el, item) => {
                el.src = item;
              });
            }, 0);
          }

          return htmlStr;
        };

        // Image Sources
        const imgSplash = c.images.splash || "";
        const imgSprite = c.images.sprite || "";
        const imgCard = c.images.card || "";
        const defaultImg = imgSplash || imgCard || imgSprite || c.images.head;

        let badgesHtml = `<div class="detail-pill">${rarityIcon ? `<img src="${rarityIcon}">` : ""} ${c.rarity}</div>`;

        if (!isGuest) {
          badgesHtml += `<div class="detail-pill">${roleIcon ? `<img src="${roleIcon}">` : ""} ${c.role}</div>`;
          const posIcon = getAttr("position", c.position).icon;
          badgesHtml += `<div class="detail-pill">${posIcon ? `<img src="${posIcon}">` : ""} ${c.position}</div>`;
          badgesHtml += (c.elements || [])
            .map((e) => {
              const i = getAttr("element", e).icon;
              return `<div class="detail-pill">${i ? `<img src="${i}">` : ""} ${e}</div>`;
            })
            .join("");
        }

        container.innerHTML = `
            <div class="detail-split-header">
                <div class="detail-left">
                    <div class="detail-img-container">
                        <img id="detail-main-img" class="main-img" src="${defaultImg}" style="aspect-ratio: 4/5; object-fit: contain;" onerror="this.src='https://placehold.co/800x600/3e2b2b/FFF?text=No+Image'">
                    </div>
                    <div class="img-toggles">
                        ${imgSplash ? `<button class="toggle-btn active" onclick="changeDetailImg(this, '${imgSplash}')">Splash</button>` : ""}
                        ${imgSprite ? `<button class="toggle-btn" onclick="changeDetailImg(this, '${imgSprite}')">Sprite</button>` : ""}
                        ${imgCard ? `<button class="toggle-btn" onclick="changeDetailImg(this, '${imgCard}')">Card</button>` : ""}
                    </div>
                </div>
                <div class="detail-right">
                    <div class="detail-title-block">
                        <img src="${c.images.head}" class="detail-head-icon" onerror="this.src='https://placehold.co/80?text=?'">
                        <h2>${c.name}</h2>
                    </div>
                    <div class="detail-badges">
                        ${badgesHtml}
                    </div>
                </div>
            </div>

            <div style="padding: 2rem;">
                ${
                  !isGuest
                    ? `
                <div class="detail-section" style="margin-top:0;">
                    <h3>Skill</h3>
                    <div class="skill-box">
                        <img src="${c.skill.icon || "https://placehold.co/64/3e2b2b/FFF?text=?"}" class="skill-icon">
                        <div class="skill-content">
                            <h4>${c.skill.name || "Unknown Skill"}</h4>
                            <div class="skill-desc">${smartText(c.skill.desc || "No description available.")}</div>
                        </div>
                    </div>
                </div>
                `
                    : ""
                }

                <div class="detail-section">
                    <h3>Costumes (${costumes.length})</h3>
                    <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
                        ${costumes.map(renderSkinCard).join("")}
                        <button class="card add-card" onclick="openSkinForm()" title="Add Costume">
                            <span class="material-symbols-outlined" style="font-size:32px">add</span>
                        </button>
                    </div>
                </div>

                ${
                  !isGuest
                    ? `
                <div class="detail-section">
                    <h3>Power-ups (${powerups.length})</h3>
                    <div class="pu-grid">
                        ${powerups.map(renderPuCard).join("")}
                        <button class="card add-card" onclick="openPowerupForm()" style="min-height:150px" title="Add Power-up">
                            <span class="material-symbols-outlined" style="font-size:32px">add</span>
                        </button>
                    </div>
                </div>
                `
                    : ""
                }
            </div>
        `;

        openModal("modal-cookie-detail");
      }

      function changeDetailImg(btn, src) {
        document.getElementById("detail-main-img").src = src;
        btn.parentElement
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }

      function viewSkin(idx) {
        const s = appData.costumes[idx];
        if (!s) return;
        currentSkinIdx = idx;
        const owner = appData.cookies.find(
          (c) => String(c.id) === String(s.ownerId),
        );
        const modal = document.getElementById("modal-skin-detail");
        const content = document.getElementById("skin-detail-content");

        const rarityIcon = getAttr("skinRarity", s.rarity).icon;
        const imgSplash = s.splash || "";
        const imgSprite = s.sprite || "";
        const imgCard = s.card || "";
        const defaultImg = imgSplash || imgCard || imgSprite;

        content.innerHTML = `
            <div class="detail-split-header">
                <div class="detail-left">
                    <div class="detail-img-container">
                        <img id="skin-detail-img" class="main-img" src="${defaultImg}" style="aspect-ratio: 4/5; object-fit: contain;" onerror="this.src='https://placehold.co/400?text=?'">
                    </div>
                    <div class="img-toggles">
                        ${imgSplash ? `<button class="toggle-btn active" onclick="changeSkinImg(this, '${imgSplash}')">Splash</button>` : ""}
                        ${imgSprite ? `<button class="toggle-btn" onclick="changeSkinImg(this, '${imgSprite}')">Sprite</button>` : ""}
                        ${imgCard ? `<button class="toggle-btn" onclick="changeSkinImg(this, '${imgCard}')">Card</button>` : ""}
                    </div>
                </div>
                <div class="detail-right">
                    <h2 style="font-size:2rem; margin-bottom:0.5rem;">${s.name}</h2>
                    <div class="detail-badges">
                        <div class="detail-pill">${rarityIcon ? `<img src="${rarityIcon}">` : ""} ${s.rarity}</div>
                        ${s.set ? `<div class="detail-pill">${s.set}</div>` : ""}
                        ${owner ? `<div class="detail-pill" style="border-color:var(--accent-pink); color:var(--accent-pink);"><img src="${owner.images.head}" style="border-radius:50%;">${owner.name}</div>` : ""}
                    </div>
                    ${s.desc ? `<div class="detail-desc" style="margin-top:1.5rem;">${smartText(s.desc)}</div>` : ""}
                </div>
            </div>
        `;

        const skinModalBox = modal.querySelector(".modal-box");
        if (s.bg) {
          skinModalBox.style.backgroundImage = `linear-gradient(to bottom, rgba(30, 20, 20, 0.8), rgba(30, 20, 20, 0.9)), url('${s.bg}')`;
          skinModalBox.style.backgroundRepeat = "no-repeat";
          skinModalBox.style.backgroundSize = "cover";
          skinModalBox.style.backgroundPosition = "center";
        } else {
          skinModalBox.style.backgroundImage = "none";
          skinModalBox.style.backgroundRepeat = "";
          skinModalBox.style.backgroundSize = "";
          skinModalBox.style.backgroundPosition = "";
        }

        openModal("modal-skin-detail");
      }

      function changeSkinImg(btn, src) {
        document.getElementById("skin-detail-img").src = src;
        btn.parentElement
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }

      function editSkinFromDetail() {
        if (currentSkinIdx !== null) {
          closeModal("modal-skin-detail");
          openSkinForm(currentSkinIdx);
        }
      }

      function viewSet(setName) {
        const skins = appData.costumes.filter((s) => s.set === setName);
        const content = document.getElementById("set-detail-content");
        document.getElementById("set-detail-title").innerText =
          `${setName} Set`;

        content.innerHTML = `
            <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
                ${skins
                  .map((s) => {
                    const idx = appData.costumes.indexOf(s);
                    const owner = appData.cookies.find(
                      (c) => c.id === s.ownerId,
                    );
                    return `
                    <div class="card" onclick="viewSkin(${idx}); closeModal('modal-set-detail');">
                        <img src="${s.card || s.splash || s.sprite}" class="card-img" style="object-fit:contain; background:var(--bg-darker);">
                        <div class="card-overlay"><div class="card-text-wrapper">
                            <div class="card-name">${s.name}</div>
                            <div class="card-sub">${owner ? owner.name : "Unknown"}</div>
                        </div></div>
                    </div>`;
                  })
                  .join("")}
            </div>
        `;
        openModal("modal-set-detail");
      }

      function viewPowerup(idx) {
        const p = appData.powerups[idx];
        if (!p) return;
        currentPowerupIdx = idx;
        const owner = appData.cookies.find(
          (c) => String(c.id) === String(p.ownerId),
        );
        const content = document.getElementById("pu-detail-content");

        const typeData = getAttr("powerupType", p.type);

        content.innerHTML = `
            <div style="padding:2rem;">
                <div style="display:flex; gap:1rem; align-items:center; margin-bottom:1.5rem;">
                    ${typeData.icon ? `<img src="${typeData.icon}" style="width:64px;height:64px;">` : ""}
                    <div>
                        <h2 style="font-size:1.8rem; margin:0;">${p.name}</h2>
                        <div style="color:var(--text-muted); margin-top:5px;">${p.type} for ${owner ? owner.name : "Unknown"}</div>
                    </div>
                </div>
                
                <div class="detail-desc">${smartText(p.desc)}</div>
                
                ${p.ingredientName || p.ingredientUrl ? `<div style="margin-top:1rem; padding:0.75rem 1rem; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:0.75rem;"><span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); white-space:nowrap;">Ingredient:</span>${p.ingredientUrl ? `<img src="${p.ingredientUrl}" style="width:32px;height:32px;object-fit:contain;border-radius:6px;" onerror="this.style.display='none'">` : ""}${p.ingredientName ? `<span style="font-size:0.95rem; color:var(--text-main); font-weight:600;">${p.ingredientName}</span>` : ""}</div>` : ""}
                
                <div style="margin-top:2rem; display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
                    ${p.url10 ? `<div style="text-align:center;"><img src="${p.url10}" style="width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom:5px; aspect-ratio: 1/1; object-fit: contain;"><span>Base</span></div>` : ""}
                    ${p.url20 ? `<div style="text-align:center;"><img src="${p.url20}" style="width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom:5px; aspect-ratio: 1/1; object-fit: contain;"><span>+10</span></div>` : ""}
                    ${p.url30 ? `<div style="text-align:center;"><img src="${p.url30}" style="width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom:5px; aspect-ratio: 1/1; object-fit: contain;"><span>+20</span></div>` : ""}
                </div>
            </div>
        `;
        openModal("modal-pu-detail");
      }

      function editPowerupFromDetail() {
        if (currentPowerupIdx !== null) {
          closeModal("modal-pu-detail");
          openPowerupForm(currentPowerupIdx);
        }
      }

      function triggerEditFromDetail() {
        if (currentDetailId) {
          closeModal("modal-cookie-detail");
          openCookieForm(currentDetailId);
        }
      }

      // --- Edit Form Logic ---
      function openCookieForm(id = null) {
        document.getElementById("cookie-form").reset();
        document.getElementById("cookie-form-title").innerText = id
          ? "Edit Cookie"
          : "Add Cookie";
        document.getElementById("cf-id").value = id || "";

        setupDropdown("cf-rarity", appData.attributes.rarity, "Common");
        setupDropdown("cf-role", appData.attributes.role, "Charge");
        setupDropdown("cf-pos", appData.attributes.position, "Front");

        // Hook rarity change to toggle guest fields
        const cfRarityEl = document.getElementById("cf-rarity");
        if (cfRarityEl) {
          cfRarityEl.addEventListener("click", () =>
            setTimeout(updateGuestFieldVisibility, 50),
          );
        }

        const elContainer = document.getElementById("cf-elements");
        let selectedEls = [];
        if (id) {
          const c = appData.cookies.find((x) => x.id === id);
          selectedEls = c ? c.elements || [] : [];
        }

        elContainer.innerHTML = `
            <div class="multi-select" id="element-multiselect">
                <div class="select-box" onclick="toggleMultiSelect(event)">
                    <span id="selected-text">${selectedEls.length > 0 ? selectedEls.join(", ") : "Select Elements..."}</span>
                    <span class="material-symbols-outlined">arrow_drop_down</span>
                </div>
                <div class="options-container" id="element-options">
                    ${appData.attributes.element
                      .map(
                        (e) => `
                        <label class="option">
                            <input type="checkbox" value="${e.name}" ${selectedEls.includes(e.name) ? "checked" : ""} onchange="updateMultiSelectLabel()">
                            ${e.icon ? `<img src="${e.icon}">` : ""}
                            <span>${e.name}</span>
                        </label>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;

        if (id) {
          const c = appData.cookies.find((x) => x.id === id);
          if (c) {
            document.getElementById("cf-name").value = c.name;
            setupDropdown("cf-rarity", appData.attributes.rarity, c.rarity);
            setupDropdown("cf-role", appData.attributes.role, c.role);
            setupDropdown("cf-pos", appData.attributes.position, c.position);
            document.getElementById("cf-head").value = c.images.head || "";
            document.getElementById("cf-splash").value = c.images.splash || "";
            document.getElementById("cf-sprite").value = c.images.sprite || "";
            document.getElementById("cf-card").value = c.images.card || "";
            document.getElementById("cf-bg").value = c.images.bg || ""; // Populate BG Field

            document.getElementById("cf-skill-name").value =
              c.skill?.name || "";
            document.getElementById("cf-skill-icon").value =
              c.skill?.icon || "";
            document.getElementById("cf-skill-desc").value =
              c.skill?.desc || "";
          }
        } else {
          document.getElementById("cf-id").value = "c" + Date.now();
        }

        document.addEventListener("click", closeMultiSelectOutside);

        openModal("modal-cookie-form");
        setTimeout(updateGuestFieldVisibility, 50);
      }

      // Dropdown Helpers
      function toggleMultiSelect(e) {
        if (e) e.stopPropagation();
        const opts = document.getElementById("element-options");
        opts.classList.toggle("active");
        document.querySelector(".select-box").classList.toggle("active");
      }

      function closeMultiSelectOutside(e) {
        const ms = document.getElementById("element-multiselect");
        if (ms && !ms.contains(e.target)) {
          document.getElementById("element-options").classList.remove("active");
          document.querySelector(".select-box").classList.remove("active");
        }
      }

      function updateMultiSelectLabel() {
        const checked = Array.from(
          document.querySelectorAll("#element-options input:checked"),
        ).map((cb) => cb.value);
        const label = document.getElementById("selected-text");
        if (checked.length === 0) label.innerText = "Select Elements...";
        else label.innerText = checked.join(", ");
      }

      function submitCookieForm() {
        const id = document.getElementById("cf-id").value;
        const existing = appData.cookies.find((x) => x.id === id);

        const rarity = getDropdownValue("cf-rarity");
        const isGuest = rarity === "Guest";

        const elements = isGuest
          ? []
          : Array.from(
              document.querySelectorAll("#element-options input:checked"),
            ).map((cb) => cb.value);

        const data = {
          id: id,
          name: document.getElementById("cf-name").value,
          rarity: rarity,
          role: isGuest ? "" : getDropdownValue("cf-role"),
          position: isGuest ? "" : getDropdownValue("cf-pos"),
          elements: elements,
          images: {
            head: cleanUrl(document.getElementById("cf-head").value),
            splash: cleanUrl(document.getElementById("cf-splash").value),
            sprite: cleanUrl(document.getElementById("cf-sprite").value),
            card: cleanUrl(document.getElementById("cf-card").value),
            bg: cleanUrl(document.getElementById("cf-bg").value),
          },
          skill: isGuest
            ? {}
            : {
                name: document.getElementById("cf-skill-name").value,
                icon: cleanUrl(document.getElementById("cf-skill-icon").value),
                desc: document.getElementById("cf-skill-desc").value,
              },
        };

        if (existing) Object.assign(existing, data);
        else appData.cookies.push(data);

        persistAppData();
        document.removeEventListener("click", closeMultiSelectOutside);
        closeModal("modal-cookie-form");
        renderCookies();
        showToast("Cookie Saved!");
      }

      // --- Costumes & Sets ---
      function openSkinForm(idx = null) {
        document.getElementById("modal-skin-form").classList.add("open");
        document.getElementById("sf-idx").value = idx !== null ? idx : "";
        document.getElementById("skin-form-title").innerText =
          idx !== null ? "Edit Costume" : "Costume";
        resetModalScroll("modal-skin-form");

        // Prepare Cookie Owner Options
        const cookiesForDropdown = appData.cookies.map((c) => ({
          name: c.name,
          value: c.id,
          icon: c.images.head,
        }));
        if (currentDetailId) {
          setupDropdown("sf-owner", cookiesForDropdown, currentDetailId);
        } else {
          setupDropdown("sf-owner", cookiesForDropdown, "");
        }

        const uniqueSets = [
          ...new Set(appData.costumes.map((c) => c.set).filter(Boolean)),
        ];
        document.getElementById("set-list").innerHTML = uniqueSets
          .map((s) => `<option value="${s}">`)
          .join("");

        if (idx !== null) {
          const s = appData.costumes[idx];
          document.getElementById("sf-name").value = s.name;
          setupDropdown("sf-owner", cookiesForDropdown, s.ownerId); // Set correct owner in edit mode
          setupDropdown("sf-rarity", appData.attributes.skinRarity, s.rarity);
          document.getElementById("sf-set").value = s.set || "";
          document.getElementById("sf-desc").value = s.desc || "";
          document.getElementById("sf-bg").value = s.bg || "";
          document.getElementById("sf-card").value = s.card || "";
          document.getElementById("sf-splash").value = s.splash || "";
          document.getElementById("sf-sprite").value = s.sprite || "";
        } else {
          document.getElementById("sf-name").value = "";
          setupDropdown("sf-rarity", appData.attributes.skinRarity, "Common");
          document.getElementById("sf-set").value = "";
          document.getElementById("sf-desc").value = "";
          document.getElementById("sf-bg").value = "";
          document.getElementById("sf-card").value = "";
          document.getElementById("sf-splash").value = "";
          document.getElementById("sf-sprite").value = "";
        }
      }

      function saveSkin() {
        const idx = document.getElementById("sf-idx").value;
        const c = {
          name: document.getElementById("sf-name").value,
          ownerId: getDropdownValue("sf-owner"), // Changed to use getDropdownValue
          rarity: getDropdownValue("sf-rarity"),
          set: document.getElementById("sf-set").value,
          desc: document.getElementById("sf-desc").value,
          bg: cleanUrl(document.getElementById("sf-bg").value),
          card: cleanUrl(document.getElementById("sf-card").value),
          splash: cleanUrl(document.getElementById("sf-splash").value),
          sprite: cleanUrl(document.getElementById("sf-sprite").value),
        };

        if (idx !== "") {
          appData.costumes[parseInt(idx)] = c;
          showToast("Costume Updated");
        } else {
          appData.costumes.push(c);
          showToast("Costume Added");
        }

        closeModal("modal-skin-form");
        if (
          currentDetailId &&
          document
            .getElementById("modal-cookie-detail")
            .classList.contains("open")
        ) {
          openCookieDetail(currentDetailId);
        } else {
          renderSkins();
        }
        persistAppData();
      }

      function renderSkins() {
        clearCycles();
        const container = document.getElementById("costume-grid");
        container.innerHTML = "";
        const search = document
          .getElementById("search-skins")
          .value.toLowerCase();
        const sort = document.getElementById("sort-skins")?.value || "name";

        let list = appData.costumes.filter((c) =>
          c.name.toLowerCase().includes(search),
        );

        // Grouping Logic (Matching Cookies Version)
        const groups = {};

        list.forEach((c) => {
          let key = "All Costumes";
          if (sort === "rarity") key = c.rarity || "Unknown";
          if (sort === "set") key = c.set || "No Set";

          if (!groups[key]) groups[key] = [];
          groups[key].push(c);
        });

        // Sort keys
        let keys = Object.keys(groups);
        if (sort === "rarity") {
          keys.sort(
            (a, b) =>
              appData.attributes.skinRarity.findIndex((x) => x.name === a) -
              appData.attributes.skinRarity.findIndex((x) => x.name === b),
          );
        } else {
          keys.sort();
        }

        keys.forEach((key) => {
          // Create Section
          const section = document.createElement("div");
          section.className = "category-section";

          // Icon Logic
          let iconUrl = "";
          if (sort === "rarity") {
            const attrObj = getAttr("skinRarity", key);
            if (attrObj && attrObj.icon) iconUrl = attrObj.icon;
          }

          section.innerHTML = `<div class="category-title" onclick="toggleSection(this)">${iconUrl ? `<img src="${iconUrl}" class="category-icon">` : ""} ${key}</div>`;

          const grid = document.createElement("div");
          grid.className = "card-grid";

          groups[key].forEach((c) => {
            const idx = appData.costumes.indexOf(c); // Use Master Index
            const owner = appData.cookies.find((k) => k.id === c.ownerId);
            const ownerHead = owner ? owner.images.head : "";
            const rarityIcon = getAttr("skinRarity", c.rarity).icon;

            const div = document.createElement("div");
            div.className = "card";
            div.onclick = () => viewSkin(idx);
            div.innerHTML = `
                    <img src="${c.card || c.splash || c.sprite || "https://placehold.co/100/3e2b2b/FFF?text=?"}" class="card-img" style="object-fit:contain; background:var(--bg-darker);">
                    <div class="card-icons" style="top:8px; right:8px;">
                        ${ownerHead ? `<div class="mini-icon"><img src="${ownerHead}"></div>` : ""}
                        ${rarityIcon ? `<div class="mini-icon"><img src="${rarityIcon}"></div>` : ""}
                    </div>
                    <div class="card-overlay">
                        <div class="card-text-wrapper">
                            <div class="card-name">${c.name}</div>
                            <div class="card-sub">${owner ? owner.name : "Unknown"}</div>
                        </div>
                    </div>
                    ${(() => {
                      const wk = "skin_" + idx;
                      const mf = getSkinMissingFields(c);
                      registerWarning(wk, mf, () => renderSkins());
                      return makeWarningBtn(wk, mf, () => renderSkins());
                    })()}
                    ${getCardActions("skin", idx)}
                `;
            grid.appendChild(div);
          });

          section.appendChild(grid);
          container.appendChild(section);
        });
        restoreCollapsedSections();
      }

      function renderSets() {
        clearCycles();
        const grid = document.getElementById("sets-grid");
        const sets = {};
        appData.costumes.forEach((c) => {
          if (c.set) {
            if (!sets[c.set]) sets[c.set] = [];
            sets[c.set].push(c);
          }
        });
        const cycleJobs=[];
        grid.innerHTML = Object.keys(sets).map((k) => {
          const images=sets[k].map(s=>s.card||s.splash||s.sprite).filter(Boolean);
          const cycleId=`set-cycle-${k.replace(/[^a-zA-Z0-9-_]/g,"-")}`;
          if(images.length>1)cycleJobs.push([cycleId,images]);
          const initialImg=images[0]||"";
          return `<article class="card crk-set-card" onclick="viewSet(${jsq(k)})"><img id="${cycleId}" src="${initialImg||"https://placehold.co/400?text=Set"}" class="card-img" alt="${k}" style="object-fit:contain; background:var(--bg-darker);"><div class="card-overlay"><div class="set-card-hover"><span class="card-name">${k}</span><span class="set-count-badge">${sets[k].length}</span></div></div></article>`;
        }).join("");
        setTimeout(()=>cycleJobs.forEach(([id,images])=>registerCycle(id,images,(el,item)=>{el.src=item;})),0);
      }

      // --- Powerups ---
      function openPowerupForm(idx = null) {
        document.getElementById("modal-pu-form").classList.add("open");
        document.getElementById("puf-idx").value = idx !== null ? idx : "";
        document.getElementById("pu-form-title").innerText =
          idx !== null ? "Edit Power-Up" : "Power-Up";
        resetModalScroll("modal-pu-form");

        // Prepare Cookie Owner Options (Copied structure from Skin Form)
        const cookiesForDropdown = appData.cookies.map((c) => ({
          name: c.name,
          value: c.id,
          icon: c.images.head,
        }));

        // Initial setup based on context
        let initialOwner = "";
        if (currentDetailId) {
          initialOwner = currentDetailId;
        }

        // Logic copied from openSkinForm to ensure consistency
        if (idx !== null) {
          const p = appData.powerups[idx];
          document.getElementById("puf-name").value = p.name;

          // Update dropdowns for edit state - Using EXACT SAME setupDropdown logic as Skin Form
          setupDropdown("puf-owner", cookiesForDropdown, p.ownerId);
          setupDropdown("puf-type", appData.attributes.powerupType, p.type);

          document.getElementById("puf-desc").value = p.desc;
          document.getElementById("puf-ingredient-name").value =
            p.ingredientName || "";
          document.getElementById("puf-ingredient-url").value =
            p.ingredientUrl || "";
          document.getElementById("puf-10-url").value = p.url10 || "";
          document.getElementById("puf-20-url").value = p.url20 || "";
          document.getElementById("puf-30-url").value = p.url30 || "";
        } else {
          document.getElementById("puf-name").value = "";

          // Default dropdown state - Using EXACT SAME setupDropdown logic as Skin Form
          setupDropdown("puf-owner", cookiesForDropdown, initialOwner);
          setupDropdown(
            "puf-type",
            appData.attributes.powerupType,
            "Magic Candy",
          ); // Default type

          document.getElementById("puf-desc").value = "";
          document.getElementById("puf-ingredient-name").value = "";
          document.getElementById("puf-ingredient-url").value = "";
          document.getElementById("puf-10-url").value = "";
          document.getElementById("puf-20-url").value = "";
          document.getElementById("puf-30-url").value = "";
        }
      }

      function savePowerup() {
        const idx = document.getElementById("puf-idx").value;
        const p = {
          name: document.getElementById("puf-name").value,
          ownerId: getDropdownValue("puf-owner"), // Changed to use getDropdownValue
          type: getDropdownValue("puf-type"),
          desc: document.getElementById("puf-desc").value,
          ingredientName: document.getElementById("puf-ingredient-name").value,
          ingredientUrl: cleanUrl(
            document.getElementById("puf-ingredient-url").value,
          ),
          url10: cleanUrl(document.getElementById("puf-10-url").value),
          url20: cleanUrl(document.getElementById("puf-20-url").value),
          url30: cleanUrl(document.getElementById("puf-30-url").value),
        };

        if (idx !== "") {
          appData.powerups[parseInt(idx)] = p;
          showToast("Power-up Updated");
        } else {
          appData.powerups.push(p);
          showToast("Power-up Saved");
        }

        closeModal("modal-pu-form");
        if (
          currentDetailId &&
          document
            .getElementById("modal-cookie-detail")
            .classList.contains("open")
        ) {
          openCookieDetail(currentDetailId);
        } else {
          renderAllPowerups();
        }
        persistAppData();
      }
      function renderAllPowerups() {
        clearCycles();
        const container = document.getElementById("all-powerups-grid");
        container.innerHTML = "";
        const sort = document.getElementById("sort-powerups")?.value || "name";

        let list = [...appData.powerups];

        // Grouping Logic
        const groups = {};

        // Sort logic helper
        const getSortKey = (item) => {
          if (sort === "type") return item.type;
          if (sort === "owner") {
            const o = appData.cookies.find((c) => c.id === item.ownerId);
            return o ? o.name : "Unknown Owner";
          }
          return "All Power-ups";
        };

        list.forEach((item) => {
          const key = getSortKey(item);
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        });

        const keys = Object.keys(groups).sort();

        keys.forEach((key) => {
          const section = document.createElement("div");
          section.className = "category-section";
          section.innerHTML = `<div class="category-title" onclick="toggleSection(this)">${key}</div>`;

          const subGrid = document.createElement("div");
          subGrid.className = "pu-grid";

          groups[key].forEach((p) => {
            const idx = appData.powerups.indexOf(p); // Use Master Index
            const owner = appData.cookies.find((c) => c.id === p.ownerId);
            const ownerHead = owner ? owner.images.head : "";

            // Cycle Logic
            const images = [p.url10, p.url20, p.url30].filter(Boolean);
            const cycleId = `pu-card-img-${idx}`;

            // Get Background from Attribute
            const typeData = getAttr("powerupType", p.type);
            const bgStyle = typeData.background
              ? `background-image:url('${typeData.background}'); background-size:cover;`
              : "";
            const typeIcon = typeData.icon;

            if (images.length > 1) {
              registerCycle(cycleId, images, (el, item) => {
                el.src = item;
              });
            }
            const initialImg = images.length > 0 ? images[0] : "";

            const div = document.createElement("div");
            div.className = "pu-card";
            div.setAttribute("onclick", `viewPowerup(${idx})`);
            div.style.cssText = bgStyle;
            div.innerHTML = `
                      <div class="pu-img-container">
                         ${initialImg ? `<img id="${cycleId}" src="${initialImg}" class="pu-cycle-img">` : ""}
                      </div>
                     <div class="card-icons" style="top:8px; right:8px; z-index:5;">
                         ${typeIcon ? `<div class="mini-icon"><img src="${typeIcon}"></div>` : ""}
                         ${ownerHead ? `<div class="mini-icon"><img src="${ownerHead}"></div>` : ""}
                     </div>
                     <div class="card-overlay">
                         <div class="card-text-wrapper">
                             <div class="card-name">${p.name}</div>
                             <div class="card-sub">${p.type}</div>
                         </div>
                     </div>

                     ${(() => {
                       const wk = "powerup_" + idx;
                       const mf = getPowerupMissingFields(p);
                       registerWarning(wk, mf, () => renderAllPowerups());
                       return makeWarningBtn(wk, mf, () => renderAllPowerups());
                     })()}
                     ${getCardActions("powerup", idx)}
                 `;
            subGrid.appendChild(div);
          });

          section.appendChild(subGrid);
          container.appendChild(section);
        });
        restoreCollapsedSections();
      }

      // --- Matrix View ---
      function renderMatrix() {
        const rowSelect = document.getElementById("matrix-row");
        const colSelect = document.getElementById("matrix-col");
        const container = document.getElementById("matrix-container");

        // Populate selects if empty
        if (!rowSelect.value) {
          ["rarity", "role", "position", "element"].forEach((x) => {
            rowSelect.innerHTML += `<option value="${x}">${capitalize(x)}</option>`;
            colSelect.innerHTML += `<option value="${x}">${capitalize(x)}</option>`;
          });
          // Set default values and trigger update
          rowSelect.value = "rarity";
          colSelect.value = "role";
        }

        const rowCat = rowSelect.value;
        const colCat = colSelect.value;

        // Make row/col attributes not selectable in opposite field
        const availableForCol = [
          "rarity",
          "role",
          "position",
          "element",
        ].filter((x) => x !== rowCat);
        const availableForRow = [
          "rarity",
          "role",
          "position",
          "element",
        ].filter((x) => x !== colCat);

        // Update column options
        const originalColValue = colSelect.value;
        colSelect.innerHTML = availableForCol
          .map((x) => `<option value="${x}">${capitalize(x)}</option>`)
          .join("");
        if (availableForCol.includes(originalColValue)) {
          colSelect.value = originalColValue;
        } else {
          colSelect.value = availableForCol[0];
        }

        // Update row options
        const originalRowValue = rowSelect.value;
        rowSelect.innerHTML = availableForRow
          .map((x) => `<option value="${x}">${capitalize(x)}</option>`)
          .join("");
        if (availableForRow.includes(originalRowValue)) {
          rowSelect.value = originalRowValue;
        } else {
          rowSelect.value = availableForRow[0];
        }

        const rows = appData.attributes[rowSelect.value] || [];
        const cols = appData.attributes[colSelect.value] || [];

        let html = `<table class="matrix-table"><thead><tr><th class="matrix-th" style="background:transparent"></th>`;
        cols.forEach(
          (c) =>
            (html += `<th class="matrix-th">${c.icon ? `<img src="${c.icon}">` : c.name}</th>`),
        );
        html += `</tr></thead><tbody>`;

        rows.forEach((r) => {
          html += `<tr><td class="matrix-rh">${r.icon ? `<img src="${r.icon}">` : r.name}</td>`;
          cols.forEach((c) => {
            // Find matches logic
            const matches = appData.cookies.filter((cookie) => {
              if (cookie.rarity === "Guest") return false;
              // Map category names to correct cookie properties (element -> elements)
              const rProp = rowCat === "element" ? "elements" : rowCat;
              const cProp = colCat === "element" ? "elements" : colCat;

              const rVal = cookie[rProp];
              const cVal = cookie[cProp];

              const matchRow = Array.isArray(rVal)
                ? rVal.includes(r.name)
                : rVal === r.name;
              const matchCol = Array.isArray(cVal)
                ? cVal.includes(c.name)
                : cVal === c.name;
              return matchRow && matchCol;
            });

            // Encode IDs for the click handler
            const matchIds = matches.map((m) => m.id).join(",");
            const clickFn =
              matches.length > 0
                ? `onclick="openMatrixCell('${r.name}', '${c.name}', '${matchIds}')"`
                : "";

            html += `<td class="matrix-td" ${clickFn}><div class="matrix-cell-content" style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: center;">`;
            matches.forEach((m) => {
              html += `<img src="${m.images.head}" class="matrix-head" title="${m.name}" onerror="this.src='https://placehold.co/40?text=?'">`;
            });
            html += `</div></td>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
      }

      // Public handlers used by the HTML UI and other modules.
      Object.assign(window, {
        deleteCookie, deleteSkin, deletePowerup,
        changeDetailImg, viewSkin, changeSkinImg, editSkinFromDetail,
        viewSet, viewPowerup, editPowerupFromDetail, triggerEditFromDetail,
        openCookieForm, toggleMultiSelect, updateMultiSelectLabel, submitCookieForm,
        openSkinForm, saveSkin, openPowerupForm, savePowerup,
        renderSets, openMatrixCell
      });

      function openMatrixCell(rowName, colName, ids) {
        if (!ids) return;

        // Get attribute icons
        const rowCat = document.getElementById("matrix-row").value;
        const colCat = document.getElementById("matrix-col").value;
        const rowAttr = getAttr(rowCat, rowName);
        const colAttr = getAttr(colCat, colName);

        const titleHtml = `${rowAttr.icon ? `<img src="${rowAttr.icon}" style="width:24px;height:24px;vertical-align:middle;margin-right:5px;">` : ""}${rowName} + ${colAttr.icon ? `<img src="${colAttr.icon}" style="width:24px;height:24px;vertical-align:middle;margin-right:5px;">` : ""}${colName}`;
        document.getElementById("list-view-title").innerHTML = titleHtml;

        const idArray = ids.split(",");
        const cookies = appData.cookies.filter((c) => idArray.includes(c.id));

        const grid = document.getElementById("list-view-grid");
        grid.innerHTML = cookies
          .map(
            (c) => `
             <div class="card" onclick="openCookieDetail('${c.id}')">
                <img src="${c.images.card || c.images.splash || c.images.head}" class="card-img" onerror="this.src='https://placehold.co/100/3e2b2b/FFF?text=?'">
                <div class="card-overlay">
                    <div class="card-text-wrapper">
                        <div class="card-name">${c.name}</div>
                        <div class="card-sub">${c.rarity}</div>
                    </div>
                </div>
            </div>
        `,
          )
          .join("");

        openModal("modal-list-view");
      }


