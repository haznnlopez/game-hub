      /* TIER LIST */
      function toggleUnrankedSidebar() {
        document
          .getElementById("unranked-sidebar")
          .classList.toggle("collapsed");
      }
      // Tier list drag state
      let dragOverItem = null;

      function renderTierListPage() {
        const c = document.getElementById("tier-list-container");
        const p = document.getElementById("unranked-pool");
        const s = document
          .getElementById("tier-pool-search")
          .value.toLowerCase();
        c.innerHTML = "";
        p.innerHTML = "";
        const td = getTierList();
        const cfg = getTierConfig();
        const h = getHeroes();
        const rid = new Set();

        cfg.forEach((tier) => {
          const t = tier.id;
          const r = document.createElement("div");
          r.className = "tier-row";
          const contentEl = document.createElement("div");
          contentEl.className = "tier-content";
          contentEl.id = `tier-${t}`;
          contentEl.dataset.tier = t;
          contentEl.addEventListener("dragover", allowDrop);
          contentEl.addEventListener("drop", (ev) => dropOnTierContent(ev, t));

          const labelDiv = document.createElement("div");
          labelDiv.className = "tier-label tier-label-editable";
          labelDiv.style.backgroundColor = tier.color;
          labelDiv.innerHTML = `<span class="tier-label-text">${tier.label}</span>`;
          labelDiv.addEventListener("dragover", allowDrop);
          labelDiv.addEventListener("drop", (ev) => dropOnTierContent(ev, t));

          // Controls sit on the row itself (position:absolute left of label)
          const ctrlDiv = document.createElement("div");
          ctrlDiv.className = "tier-controls";
          ctrlDiv.innerHTML = `
            <button class="tier-ctrl-btn" title="Rename" onclick="event.stopPropagation();renameTier('${t}')"><span class="material-symbols-outlined" style="font-size:14px;">edit</span></button>
            <label class="tier-ctrl-btn" title="Change color" style="cursor:pointer;position:relative;"><input type="color" value="${tier.color}" onchange="recolorTier('${t}',this.value)" style="position:absolute;width:0;height:0;opacity:0;"><span class="material-symbols-outlined" style="font-size:14px;">palette</span></label>
            <button class="tier-ctrl-btn danger" title="Delete tier" onclick="event.stopPropagation();deleteTier('${t}')"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>`;

          r.appendChild(ctrlDiv);
          r.appendChild(labelDiv);
          r.appendChild(contentEl);
          c.appendChild(r);

          (td[t] || []).forEach((hid) => {
            const hero = h.find((x) => x.id === hid);
            if (hero) {
              contentEl.appendChild(createTierItem(hero, true));
              rid.add(hid);
            }
          });
        });

        h.forEach((hero) => {
          if (!rid.has(hero.id) && (!s || hero.name.toLowerCase().includes(s)))
            p.appendChild(createTierItem(hero, false));
        });
      }

      function addTier() {
        const cfg = getTierConfig();
        const id = `t${Date.now()}`;
        cfg.push({ id, label: `T${cfg.length + 1}`, color: "#94a3b8" });
        saveTierConfig(cfg);
        renderTierListPage();
      }

      function renameTier(id) {
        const cfg = getTierConfig();
        const tier = cfg.find((t) => t.id === id);
        if (!tier) return;
        promptEdit("Rename Tier", tier.label, (newLabel) => {
          tier.label = newLabel.trim() || tier.label;
          saveTierConfig(cfg);
          renderTierListPage();
        });
      }

      function recolorTier(id, color) {
        const cfg = getTierConfig();
        const tier = cfg.find((t) => t.id === id);
        if (!tier) return;
        tier.color = color;
        saveTierConfig(cfg);
        const labelEl = document
          .querySelector(`#tier-${id}`)
          ?.closest(".tier-row")
          ?.querySelector(".tier-label");
        if (labelEl) labelEl.style.backgroundColor = color;
      }

      function deleteTier(id) {
        const cfg = getTierConfig();
        const tier = cfg.find((t) => t.id === id);
        showConfirm(
          `Delete tier "${tier ? tier.label : id}"? Heroes return to the unranked pool.`,
          () => {
            const newCfg = cfg.filter((t) => t.id !== id);
            saveTierConfig(newCfg);
            const td = getTierList();
            delete td[id];
            saveTierList(td);
            renderTierListPage();
            showToast("Tier deleted", "success");
          },
        );
      }

      function createTierItem(h, inTier) {
        const d = document.createElement("div");
        d.className = "tier-item";
        const iconSrc = h.icon || h.portrait || h.splashArt;
        d.style.backgroundImage = `url('${iconSrc}')`;
        d.draggable = true;
        d.dataset.id = h.id;
        d.dataset.tooltip = `${h.name} (${h.roles[0] || "?"})`;
        d.ondragstart = drag;
        // dragover on item = show insertion indicator
        d.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          dragOverItem = d;
          // Show drop indicator
          document
            .querySelectorAll(".tier-drop-indicator")
            .forEach((el) => el.remove());
          const rect = d.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          const insertBefore = ev.clientX < midX;
          const indicator = document.createElement("div");
          indicator.className = "tier-drop-indicator";
          indicator.style.cssText =
            "width:4px;height:70px;background:var(--accent);border-radius:4px;flex-shrink:0;box-shadow:0 0 8px rgba(251,191,36,0.8);pointer-events:none;";
          if (insertBefore) d.parentNode.insertBefore(indicator, d);
          else d.parentNode.insertBefore(indicator, d.nextSibling);
        });
        d.addEventListener("drop", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          document
            .querySelectorAll(".tier-drop-indicator")
            .forEach((el) => el.remove());
          const rect = d.getBoundingClientRect();
          const insertBefore = ev.clientX < rect.left + rect.width / 2;
          const tier = d.closest(".tier-content")?.dataset.tier;
          if (tier) dropAtPosition(tier, d, insertBefore);
        });
        return d;
      }

      function allowDrop(ev) {
        ev.preventDefault();
        // Highlight the tier-content being hovered
        const tc = ev.target.closest(".tier-content");
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        if (tc) tc.classList.add("drag-over");
        // Clear stale indicators if not on an item
        if (!ev.target.classList.contains("tier-item")) {
          document
            .querySelectorAll(".tier-drop-indicator")
            .forEach((el) => el.remove());
        }
      }

      function allowDropPool(ev) {
        ev.preventDefault();
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        document
          .querySelectorAll(".tier-drop-indicator")
          .forEach((el) => el.remove());
        ev.currentTarget.classList.add("drag-over-pool");
      }

      function drag(ev) {
        if (!ADMIN.isAdmin) {
          ev.preventDefault();
          showToast("Sign in as admin to edit the tier list", "info");
          return;
        }
        draggedHeroId = ev.target.dataset.id;
        // Clean up any leftover indicators
        ev.target.addEventListener(
          "dragend",
          () => {
            document
              .querySelectorAll(".tier-drop-indicator")
              .forEach((el) => el.remove());
          },
          { once: true },
        );
      }

      function dropAtPosition(tier, refItem, insertBefore) {
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        document
          .querySelectorAll(".tier-drop-indicator")
          .forEach((el) => el.remove());
        const t = getTierList();
        for (let k in t) t[k] = t[k].filter((id) => id !== draggedHeroId);
        if (!t[tier]) t[tier] = [];
        const refIdx = t[tier].indexOf(refItem.dataset.id);
        if (refIdx === -1) {
          t[tier].push(draggedHeroId);
        } else {
          const insertIdx = insertBefore ? refIdx : refIdx + 1;
          t[tier].splice(insertIdx, 0, draggedHeroId);
        }
        saveTierList(t);
        renderTierListPage();
      }

      function dropOnTierContent(ev, tier) {
        ev.preventDefault();
        document
          .querySelectorAll(".tier-drop-indicator")
          .forEach((el) => el.remove());
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        // If dropped on an item, dropAtPosition handles it; if on empty space, append
        if (ev.target.classList.contains("tier-item")) return; // handled by item's drop
        const t = getTierList();
        for (let k in t) t[k] = t[k].filter((id) => id !== draggedHeroId);
        if (!t[tier]) t[tier] = [];
        // Find closest item to insertion point
        const content = document.getElementById(`tier-${tier}`);
        const items = [...content.querySelectorAll(".tier-item")];
        if (items.length === 0) {
          t[tier].push(draggedHeroId);
        } else {
          // Find the position based on x coordinate
          let insertIdx = t[tier].length;
          for (let i = 0; i < items.length; i++) {
            const rect = items[i].getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            if (ev.clientX < midX) {
              insertIdx = i;
              break;
            }
          }
          t[tier].splice(insertIdx, 0, draggedHeroId);
        }
        saveTierList(t);
        renderTierListPage();
      }

      function drop(ev) {
        // Fallback for pool / sidebar drops (unrank)
        ev.preventDefault();
        document
          .querySelectorAll(".tier-drop-indicator")
          .forEach((el) => el.remove());
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        document
          .querySelectorAll(".drag-over-pool")
          .forEach((el) => el.classList.remove("drag-over-pool"));
        const inTier =
          ev.target.closest(".tier-content") || ev.target.closest(".tier-row");
        if (inTier) return; // handled above
        const t = getTierList();
        for (let k in t) t[k] = t[k].filter((id) => id !== draggedHeroId);
        saveTierList(t);
        renderTierListPage();
      }

      function resetTierList() {
        showConfirm(
          "Reset entire Tier List? All heroes will return to the unranked pool.",
          () => {
            const emptyTiers = {};
            getTierConfig().forEach((t) => {
              emptyTiers[t.id] = [];
            });
            saveTierList(emptyTiers);
            renderTierListPage();
            showToast("Tier List reset!", "success");
          },
        );
      }
