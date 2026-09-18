      /* TIER LIST — smoother drag/drop + saved version comparison */
      function toggleUnrankedSidebar() {
        document
          .getElementById("unranked-sidebar")
          ?.classList.toggle("collapsed");
      }

      let tierDragPlaceholder = null;
      let tierCompareSnapshotId = "";

      function deepCloneTierData(value) {
        return JSON.parse(JSON.stringify(value || {}));
      }

      function getSelectedTierSnapshot() {
        if (!tierCompareSnapshotId) return null;
        return getTierSnapshots().find(
          (snapshot) => snapshot.id === tierCompareSnapshotId,
        ) || null;
      }

      function buildTierPositionMap(list, config) {
        const map = new Map();
        (config || []).forEach((tier, tierIndex) => {
          (list?.[tier.id] || []).forEach((heroId, position) => {
            map.set(heroId, {
              tierId: tier.id,
              tierLabel: tier.label,
              tierIndex,
              position,
            });
          });
        });
        return map;
      }

      function getTierMovement(heroId) {
        const snapshot = getSelectedTierSnapshot();
        if (!snapshot) return null;
        const currentMap = buildTierPositionMap(getTierList(), getTierConfig());
        const oldMap = buildTierPositionMap(
          snapshot.tierList || {},
          snapshot.tierConfig || [],
        );
        const current = currentMap.get(heroId) || null;
        const previous = oldMap.get(heroId) || null;
        if (!current && !previous) return { kind: "same" };
        if (current && !previous) {
          return {
            kind: "new",
            label: "New",
            current,
            previous,
          };
        }
        if (!current && previous) {
          return {
            kind: "unranked",
            label: "Unranked",
            current,
            previous,
          };
        }
        const delta = previous.tierIndex - current.tierIndex;
        if (delta > 0) {
          return {
            kind: "up",
            label: `↑${delta}`,
            delta,
            current,
            previous,
          };
        }
        if (delta < 0) {
          return {
            kind: "down",
            label: `↓${Math.abs(delta)}`,
            delta,
            current,
            previous,
          };
        }
        const positionDelta = previous.position - current.position;
        if (positionDelta !== 0) {
          return {
            kind: "same-tier",
            label: positionDelta > 0 ? `↟${positionDelta}` : `↡${Math.abs(positionDelta)}`,
            positionDelta,
            current,
            previous,
          };
        }
        return { kind: "same", current, previous };
      }

      function tierMovementBadgeHtml(heroId) {
        const movement = getTierMovement(heroId);
        if (!movement || movement.kind === "same") return "";
        const title = (() => {
          if (movement.kind === "up")
            return `Moved from ${movement.previous.tierLabel} to ${movement.current.tierLabel}`;
          if (movement.kind === "down")
            return `Moved from ${movement.previous.tierLabel} to ${movement.current.tierLabel}`;
          if (movement.kind === "new")
            return `Newly ranked in ${movement.current.tierLabel}`;
          if (movement.kind === "unranked")
            return `Was ${movement.previous.tierLabel}, now unranked`;
          return `Position changed within ${movement.current?.tierLabel || "tier"}`;
        })();
        return `<span class="tier-movement-badge ${movement.kind}" title="${title}">${movement.label}</span>`;
      }

      function renderTierVersionControls() {
        const select = document.getElementById("tier-compare-version");
        if (!select) return;
        const snapshots = [...getTierSnapshots()].sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
        );
        if (
          tierCompareSnapshotId &&
          !snapshots.some((snapshot) => snapshot.id === tierCompareSnapshotId)
        ) {
          tierCompareSnapshotId = "";
        }
        select.innerHTML = '<option value="">No saved version</option>';
        snapshots.forEach((snapshot) => {
          const option = document.createElement("option");
          option.value = snapshot.id;
          const date = snapshot.createdAt
            ? new Date(snapshot.createdAt).toLocaleString()
            : "Saved version";
          option.textContent = `${snapshot.name || "Tier Version"} — ${date}`;
          select.appendChild(option);
        });
        select.value = tierCompareSnapshotId;
        const hasSelection = !!getSelectedTierSnapshot();
        const restore = document.getElementById("tier-restore-version");
        const del = document.getElementById("tier-delete-version");
        if (restore) restore.disabled = !hasSelection;
        if (del) del.disabled = !hasSelection;
      }

      function renderTierComparisonSummary() {
        const panel = document.getElementById("tier-comparison-summary");
        if (!panel) return;
        const snapshot = getSelectedTierSnapshot();
        if (!snapshot) {
          panel.hidden = true;
          panel.innerHTML = "";
          return;
        }
        const groups = { up: [], down: [], new: [], unranked: [] };
        getHeroes().forEach((hero) => {
          const movement = getTierMovement(hero.id);
          if (movement && groups[movement.kind]) {
            groups[movement.kind].push({ hero, movement });
          }
        });
        const groupHtml = (kind, title, icon) => {
          const items = groups[kind];
          return `<div class="tier-change-group ${kind}"><div class="tier-change-heading"><span class="material-symbols-outlined">${icon}</span><span>${title}</span><strong>${items.length}</strong></div><div class="tier-change-heroes">${
            items.length
              ? items
                  .map(({ hero, movement }) => {
                    const badge = getHeroBadgeImageSources(hero);
                    const from = movement.previous?.tierLabel || "Unranked";
                    const to = movement.current?.tierLabel || "Unranked";
                    return `<button type="button" class="tier-change-chip" onclick="openModal('hero','${hero.id}')" title="${hero.name}: ${from} → ${to}"><img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt=""><span>${hero.name}</span></button>`;
                  })
                  .join("")
              : `<span class="tier-change-none">None</span>`
          }</div></div>`;
        };
        panel.hidden = false;
        panel.innerHTML = `<div class="tier-comparison-head"><div><span class="tier-comparison-kicker">Changes since</span><strong>${snapshot.name || "Saved Version"}</strong></div><span>${snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : ""}</span></div><div class="tier-change-grid">${groupHtml("up", "Moved Up", "trending_up")}${groupHtml("down", "Moved Down", "trending_down")}${groupHtml("new", "Newly Ranked", "add_circle")}${groupHtml("unranked", "Unranked", "remove_circle")}</div>`;
      }

      function setTierCompareVersion(id) {
        tierCompareSnapshotId = id || "";
        renderTierListPage();
      }

      function saveTierSnapshot() {
        if (!ADMIN.isAdmin) {
          showToast("Sign in as admin to save tier list versions", "info");
          return;
        }
        const currentSnapshots = getTierSnapshots();
        const defaultName = `Version ${currentSnapshots.length + 1}`;
        promptEdit("Save Tier List Version", defaultName, async (name) => {
          const saveButton = document.getElementById("tier-save-version");
          if (saveButton) {
            saveButton.disabled = true;
            saveButton.classList.add("is-saving");
          }
          const snapshot = {
            id: `tier-${Date.now()}`,
            name: name.trim() || defaultName,
            createdAt: Date.now(),
            tierConfig: deepCloneTierData(getTierConfig()),
            tierList: deepCloneTierData(getTierList()),
          };
          // Never mutate the live cached array before the server confirms the save.
          const nextSnapshots = [...getTierSnapshots(), snapshot];
          const ok = await DB.setItemAwaited(
            KEYS.TIER_SNAPSHOTS,
            JSON.stringify(nextSnapshots),
          );
          if (saveButton) {
            saveButton.disabled = false;
            saveButton.classList.remove("is-saving");
          }
          if (!ok) {
            showToast("Tier list version was not saved", "info");
            return;
          }
          _tierSnapshotsData = nextSnapshots;
          tierCompareSnapshotId = snapshot.id;
          renderTierListPage();
          showToast(`Saved "${snapshot.name}"`, "success");
        });
      }

      function restoreSelectedTierSnapshot() {
        const snapshot = getSelectedTierSnapshot();
        if (!snapshot) return;
        if (!ADMIN.isAdmin) {
          showToast("Sign in as admin to restore tier list versions", "info");
          return;
        }
        showConfirm(
          `Restore tier list version "${snapshot.name}"? Your current unsaved arrangement will be replaced.`,
          () => {
            saveTierConfig(deepCloneTierData(snapshot.tierConfig || []));
            saveTierList(deepCloneTierData(snapshot.tierList || {}));
            renderTierListPage();
            showToast(`Restored "${snapshot.name}"`, "success");
          },
        );
      }

      function deleteSelectedTierSnapshot() {
        const snapshot = getSelectedTierSnapshot();
        if (!snapshot) return;
        if (!ADMIN.isAdmin) {
          showToast("Sign in as admin to delete tier list versions", "info");
          return;
        }
        showConfirm(`Delete saved version "${snapshot.name}"?`, async () => {
          const next = getTierSnapshots().filter((item) => item.id !== snapshot.id);
          const ok = await DB.setItemAwaited(
            KEYS.TIER_SNAPSHOTS,
            JSON.stringify(next),
          );
          if (!ok) {
            showToast("Saved version could not be deleted", "info");
            return;
          }
          _tierSnapshotsData = next;
          tierCompareSnapshotId = "";
          renderTierListPage();
          showToast("Saved version deleted", "success");
        });
      }

      function renderTierListPage() {
        const container = document.getElementById("tier-list-container");
        const pool = document.getElementById("unranked-pool");
        if (!container || !pool) return;
        const search = (
          document.getElementById("tier-pool-search")?.value || ""
        ).toLowerCase();
        container.innerHTML = "";
        pool.innerHTML = "";
        cleanupTierDrag();

        const tierData = getTierList();
        const config = getTierConfig();
        const heroes = getHeroes();
        const heroMap = new Map(heroes.map((hero) => [hero.id, hero]));
        const rankedIds = new Set();

        config.forEach((tier) => {
          const row = document.createElement("div");
          row.className = "tier-row";

          const content = document.createElement("div");
          content.className = "tier-content";
          content.id = `tier-${tier.id}`;
          content.dataset.tier = tier.id;
          content.addEventListener("dragover", (event) =>
            handleTierDragOver(event, tier.id, content),
          );
          content.addEventListener("drop", (event) =>
            dropOnTierContent(event, tier.id),
          );
          content.addEventListener("dragleave", (event) => {
            if (!content.contains(event.relatedTarget)) {
              content.classList.remove("drag-over");
            }
          });

          const label = document.createElement("div");
          label.className = "tier-label tier-label-editable";
          label.style.backgroundColor = tier.color;
          label.innerHTML = `<span class="tier-label-text">${tier.label}</span>`;
          label.addEventListener("dragover", (event) =>
            handleTierDragOver(event, tier.id, content),
          );
          label.addEventListener("drop", (event) =>
            dropOnTierContent(event, tier.id),
          );

          const controls = document.createElement("div");
          controls.className = "tier-controls";
          controls.innerHTML = `
            <button class="tier-ctrl-btn" title="Rename" onclick="event.stopPropagation();renameTier('${tier.id}')"><span class="material-symbols-outlined">edit</span></button>
            <label class="tier-ctrl-btn" title="Change color"><input type="color" value="${tier.color}" onchange="recolorTier('${tier.id}',this.value)"><span class="material-symbols-outlined">palette</span></label>
            <button class="tier-ctrl-btn danger" title="Delete tier" onclick="event.stopPropagation();deleteTier('${tier.id}')"><span class="material-symbols-outlined">delete</span></button>`;

          row.appendChild(controls);
          row.appendChild(label);
          row.appendChild(content);
          container.appendChild(row);

          (tierData[tier.id] || []).forEach((heroId) => {
            const hero = heroMap.get(heroId);
            if (!hero) return;
            content.appendChild(createTierItem(hero, true));
            rankedIds.add(heroId);
          });
        });

        heroes.forEach((hero) => {
          if (rankedIds.has(hero.id)) return;
          if (search && !hero.name.toLowerCase().includes(search)) return;
          pool.appendChild(createTierItem(hero, false));
        });

        renderTierVersionControls();
        renderTierComparisonSummary();
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
        const tier = cfg.find((item) => item.id === id);
        if (!tier) return;
        promptEdit("Rename Tier", tier.label, (newLabel) => {
          tier.label = newLabel.trim() || tier.label;
          saveTierConfig(cfg);
          renderTierListPage();
        });
      }

      function recolorTier(id, color) {
        const cfg = getTierConfig();
        const tier = cfg.find((item) => item.id === id);
        if (!tier) return;
        tier.color = color;
        saveTierConfig(cfg);
        const label = document
          .getElementById(`tier-${id}`)
          ?.closest(".tier-row")
          ?.querySelector(".tier-label");
        if (label) label.style.backgroundColor = color;
      }

      function deleteTier(id) {
        const cfg = getTierConfig();
        const tier = cfg.find((item) => item.id === id);
        showConfirm(
          `Delete tier "${tier ? tier.label : id}"? Heroes return to the unranked pool.`,
          () => {
            saveTierConfig(cfg.filter((item) => item.id !== id));
            const data = getTierList();
            delete data[id];
            saveTierList(data);
            renderTierListPage();
            showToast("Tier deleted", "success");
          },
        );
      }

      function createTierItem(hero, inTier) {
        const item = document.createElement("div");
        item.className = "tier-item";
        item.draggable = true;
        item.dataset.id = hero.id;
        item.dataset.tooltip = `${hero.name} (${hero.roles?.[0] || "?"})`;
        const badge = getHeroBadgeImageSources(hero);
        item.innerHTML = `<img class="tier-item-image" src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt="${hero.name}">${tierMovementBadgeHtml(hero.id)}`;
        item.addEventListener("dragstart", drag);
        item.addEventListener("dragend", cleanupTierDrag);
        return item;
      }

      function createTierDragPlaceholder() {
        if (tierDragPlaceholder) return tierDragPlaceholder;
        tierDragPlaceholder = document.createElement("div");
        tierDragPlaceholder.className = "tier-drop-placeholder";
        tierDragPlaceholder.setAttribute("aria-hidden", "true");
        const hero = draggedHeroId ? getHeroById(draggedHeroId) : null;
        if (hero) {
          const badge = getHeroBadgeImageSources(hero);
          tierDragPlaceholder.innerHTML = `
            <img class="tier-drop-preview-image"
              src="${badge.src}"
              data-fallback-src="${badge.fallback}"
              data-fallback-src2="${badge.fallback2}"
              alt="">
            <span class="tier-drop-preview-label">Drop here</span>`;
        } else {
          tierDragPlaceholder.innerHTML =
            '<span class="material-symbols-outlined">add</span>';
        }
        return tierDragPlaceholder;
      }

      function getTierInsertBefore(content, event) {
        const items = Array.from(
          content.querySelectorAll(".tier-item:not(.dragging)"),
        );
        for (const item of items) {
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const midX = rect.left + rect.width / 2;
          if (event.clientY < midY - rect.height * 0.2) return item;
          if (
            event.clientY <= rect.bottom &&
            event.clientY >= rect.top &&
            event.clientX < midX
          ) {
            return item;
          }
        }
        return null;
      }

      function handleTierAutoScroll(event) {
        const main = document.querySelector(".tier-main");
        if (!main) return;
        const rect = main.getBoundingClientRect();
        const threshold = 70;
        if (event.clientY < rect.top + threshold) main.scrollTop -= 18;
        else if (event.clientY > rect.bottom - threshold) main.scrollTop += 18;
      }

      function handleTierDragOver(event, tier, explicitContent = null) {
        if (!draggedHeroId) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        handleTierAutoScroll(event);
        const content =
          explicitContent || document.getElementById(`tier-${tier}`);
        if (!content) return;
        document
          .querySelectorAll(".tier-content.drag-over")
          .forEach((element) => element.classList.remove("drag-over"));
        document
          .querySelectorAll(".tier-pool-grid.drag-over-pool")
          .forEach((element) => element.classList.remove("drag-over-pool"));
        content.classList.add("drag-over");
        const placeholder = createTierDragPlaceholder();
        const before = getTierInsertBefore(content, event);
        if (before) content.insertBefore(placeholder, before);
        else content.appendChild(placeholder);
      }

      function allowDrop(event) {
        const content = event.target.closest(".tier-content");
        if (content) {
          handleTierDragOver(event, content.dataset.tier, content);
        } else {
          event.preventDefault();
        }
      }

      function allowDropPool(event) {
        if (!draggedHeroId) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        document
          .querySelectorAll(".tier-content.drag-over")
          .forEach((element) => element.classList.remove("drag-over"));
        tierDragPlaceholder?.remove();
        event.currentTarget.classList.add("drag-over-pool");
      }

      function drag(event) {
        if (!ADMIN.isAdmin) {
          event.preventDefault();
          showToast("Sign in as admin to edit the tier list", "info");
          return;
        }
        const item = event.currentTarget;
        draggedHeroId = item.dataset.id;
        item.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", draggedHeroId);
          const ghost = item.cloneNode(true);
          ghost.classList.add("tier-drag-ghost");
          document.body.appendChild(ghost);
          event.dataTransfer.setDragImage(ghost, 35, 35);
          setTimeout(() => ghost.remove(), 0);
        }
      }

      function cleanupTierDrag() {
        document
          .querySelectorAll(".tier-item.dragging")
          .forEach((item) => item.classList.remove("dragging"));
        document
          .querySelectorAll(".tier-content.drag-over")
          .forEach((element) => element.classList.remove("drag-over"));
        document
          .querySelectorAll(".tier-pool-grid.drag-over-pool")
          .forEach((element) => element.classList.remove("drag-over-pool"));
        tierDragPlaceholder?.remove();
        tierDragPlaceholder = null;
        draggedHeroId = null;
      }

      function moveDraggedHeroToTier(tier, index = null) {
        if (!draggedHeroId) return;
        const data = getTierList();
        Object.keys(data).forEach((key) => {
          data[key] = (data[key] || []).filter((id) => id !== draggedHeroId);
        });
        if (!data[tier]) data[tier] = [];
        const safeIndex =
          index === null
            ? data[tier].length
            : Math.max(0, Math.min(index, data[tier].length));
        data[tier].splice(safeIndex, 0, draggedHeroId);
        saveTierList(data);
      }

      function dropAtPosition(tier, refItem, insertBefore) {
        if (!draggedHeroId) return;
        const data = getTierList();
        const current = (data[tier] || []).filter((id) => id !== draggedHeroId);
        const refIndex = current.indexOf(refItem.dataset.id);
        const index =
          refIndex < 0 ? current.length : refIndex + (insertBefore ? 0 : 1);
        moveDraggedHeroToTier(tier, index);
        cleanupTierDrag();
        renderTierListPage();
      }

      function dropOnTierContent(event, tier) {
        if (!draggedHeroId) return;
        event.preventDefault();
        event.stopPropagation();
        const content = document.getElementById(`tier-${tier}`);
        if (!content) return;
        let index = null;
        const placeholder = tierDragPlaceholder;
        if (placeholder && placeholder.parentElement === content) {
          const ordered = Array.from(content.children).filter(
            (child) =>
              child === placeholder ||
              (child.classList.contains("tier-item") &&
                !child.classList.contains("dragging")),
          );
          index = ordered.indexOf(placeholder);
        }
        moveDraggedHeroToTier(tier, index);
        cleanupTierDrag();
        renderTierListPage();
      }

      function drop(event) {
        if (!draggedHeroId) return;
        event.preventDefault();
        const inTier =
          event.target.closest(".tier-content") || event.target.closest(".tier-row");
        if (inTier) return;
        const data = getTierList();
        Object.keys(data).forEach((key) => {
          data[key] = (data[key] || []).filter((id) => id !== draggedHeroId);
        });
        saveTierList(data);
        cleanupTierDrag();
        renderTierListPage();
      }

      function resetTierList() {
        showConfirm(
          "Reset entire Tier List? All heroes will return to the unranked pool.",
          () => {
            const emptyTiers = {};
            getTierConfig().forEach((tier) => {
              emptyTiers[tier.id] = [];
            });
            saveTierList(emptyTiers);
            renderTierListPage();
            showToast("Tier List reset!", "success");
          },
        );
      }
