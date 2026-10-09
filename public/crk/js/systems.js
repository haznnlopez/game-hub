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
          refreshOpenDetails();
          showToast("Cookie Deleted");
        });
      }
      function deleteSkin(idx) {
        showConfirm("Delete Costume?", () => {
          appData.costumes.splice(idx, 1);
          persistAppData();
          renderSkins();
          refreshOpenDetails();
          showToast("Costume Deleted");
        });
      }
      function deletePowerup(idx) {
        showConfirm("Delete Power-up?", () => {
          appData.powerups.splice(idx, 1);
          persistAppData();
          renderAllPowerups();
          refreshOpenDetails();
          showToast("Power-up Deleted");
        });
      }

      // --- Cookies Logic ---
      
      // --- New Detail View Logic ---
      
      function changeDetailImg(btn, src) {
        document.getElementById("detail-main-img").src = src;
        btn.parentElement
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }

      
      function changeSkinImg(btn, src) {
        document.getElementById("skin-detail-img").src = src;
        btn.parentElement
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }

      
      
      
      function triggerEditFromDetail() {
        if (currentDetailId) {
          closeModal("modal-cookie-detail");
          openCookieForm(currentDetailId);
        }
      }

      // --- Edit Form Logic ---
      
      // --- Costumes & Sets ---
      
      
      
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
      
            
      // --- Matrix View ---
      
      // Public handlers used by the HTML UI and other modules.
      Object.assign(window, {
        deleteCookie, deleteSkin, deletePowerup,
        changeDetailImg, changeSkinImg,
        triggerEditFromDetail,
        renderSets
      });

      

