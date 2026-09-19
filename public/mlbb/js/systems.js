      // ============================================================
      // V2.10 — Relationship Graph, Rarity-based Skin Series, Categorized Builds & Emblems
      // ============================================================

      let relationshipGraphHeroId = "";
      const relationshipGraphFilters = new Set();

      function getAllHeroRecords() {
        return [
          ...getHeroes(),
          ...getUpcoming().filter((item) => item.itemType === "hero"),
        ];
      }

      function getAllSkinRecords() {
        return [
          ...getSkins(),
          ...getUpcoming().filter((item) => item.itemType === "skin"),
        ];
      }

      // ---------------- RELATIONSHIP GRAPH ----------------
      function renderRelationshipGraphPage() {
        const select = document.getElementById("relationship-graph-hero");
        const stage = document.getElementById("relationship-graph-stage");
        const filters = document.getElementById("relationship-graph-filters");
        const summary = document.getElementById("relationship-graph-summary");
        if (!select || !stage || !filters || !summary) return;

        const heroes = getAllHeroRecords().sort((a, b) => a.name.localeCompare(b.name));
        if (!heroes.length) {
          stage.innerHTML = `<div class="relationship-graph-empty">Add heroes and lore relationships to build the graph.</div>`;
          return;
        }

        const relationshipHeroes = heroes.filter((hero) =>
          typeof getHeroLoreRelationships === "function" && getHeroLoreRelationships(hero).length,
        );
        const preferred = relationshipHeroes[0] || heroes[0];
        if (!relationshipGraphHeroId || !heroes.some((hero) => hero.id === relationshipGraphHeroId)) {
          relationshipGraphHeroId = preferred.id;
        }

        select.innerHTML = heroes
          .map((hero) => `<option value="${hero.id}"${hero.id === relationshipGraphHeroId ? " selected" : ""}>${escHtml(hero.name)}</option>`)
          .join("");
        select.onchange = () => {
          relationshipGraphHeroId = select.value;
          renderRelationshipGraphPage();
        };

        const hero = heroes.find((item) => item.id === relationshipGraphHeroId) || preferred;
        let relationships = typeof getHeroLoreRelationships === "function" ? getHeroLoreRelationships(hero) : [];
        const types = [...new Set(relationships.map((rel) => rel.type))].sort();
        for (const value of [...relationshipGraphFilters]) {
          if (!types.includes(value)) relationshipGraphFilters.delete(value);
        }
        filters.innerHTML = types.length
          ? `<button type="button" class="relationship-filter-pill${relationshipGraphFilters.size ? "" : " active"}" onclick="clearRelationshipGraphFilters()">All</button>${types
              .map((type) => {
                const meta = typeof getRelationshipTypeMeta === "function" ? getRelationshipTypeMeta(type) : { icon: "link" };
                return `<button type="button" class="relationship-filter-pill${relationshipGraphFilters.has(type) ? " active" : ""}" onclick="toggleRelationshipGraphFilter('${String(type).replace(/'/g, "\\'")}')"><span class="material-symbols-outlined">${meta.icon}</span>${escHtml(type)}</button>`;
              })
              .join("")}`
          : `<span class="relationship-graph-no-filters">No relationship types yet.</span>`;

        if (relationshipGraphFilters.size) {
          relationships = relationships.filter((rel) => relationshipGraphFilters.has(rel.type));
        }

        summary.innerHTML = `<strong>${relationships.length}</strong><span>visible relationship${relationships.length === 1 ? "" : "s"}</span>`;
        if (!relationships.length) {
          stage.innerHTML = `<div class="relationship-graph-empty"><span class="material-symbols-outlined">hub</span><strong>No relationships to display</strong><span>Add lore relationships in the Hero form${relationshipGraphFilters.size ? " or clear the current filter" : ""}.</span></div>`;
          return;
        }

        const width = Math.max(900, Math.min(1320, 760 + relationships.length * 42));
        const height = Math.max(580, relationships.length > 12 ? 720 : 600);
        const cx = width / 2;
        const cy = height / 2;
        const radius = relationships.length > 10 ? Math.min(270, width * 0.29) : Math.min(235, width * 0.27);
        const nodePositions = relationships.map((rel, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / relationships.length;
          const ring = relationships.length > 14 && index % 2 ? radius * 1.15 : radius;
          return {
            rel,
            x: cx + Math.cos(angle) * ring,
            y: cy + Math.sin(angle) * ring,
          };
        });
        const edges = nodePositions
          .map(({ rel, x, y }) => {
            const mx = (cx + x) / 2;
            const my = (cy + y) / 2;
            return `<g class="relationship-graph-edge"><line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"></line><text x="${mx}" y="${my - 7}" text-anchor="middle">${escHtml(rel.type)}</text></g>`;
          })
          .join("");
        const centerBadge = getHeroBadgeImageSources(hero);
        const relatedNodes = nodePositions
          .map(({ rel, x, y }) => {
            const badge = getHeroBadgeImageSources(rel.hero);
            return `<button type="button" class="relationship-graph-node" style="left:${x}px;top:${y}px" onclick="focusRelationshipGraphHero(event,'${rel.hero.id}')" data-tooltip="Click to center · Shift-click to open hero"><img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt=""><strong>${escHtml(rel.hero.name)}</strong><small>${escHtml(rel.type)}</small></button>`;
          })
          .join("");
        stage.style.setProperty("--graph-width", `${width}px`);
        stage.style.setProperty("--graph-height", `${height}px`);
        stage.innerHTML = `<div class="relationship-graph-canvas" style="width:${width}px;height:${height}px"><svg class="relationship-graph-lines" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${edges}</svg><button type="button" class="relationship-graph-node center" style="left:${cx}px;top:${cy}px" onclick="openModal('hero','${hero.id}')" data-tooltip="Open ${escHtml(hero.name)}"><img src="${centerBadge.src}" data-fallback-src="${centerBadge.fallback}" data-fallback-src2="${centerBadge.fallback2}" alt=""><strong>${escHtml(hero.name)}</strong><small>Selected Hero</small></button>${relatedNodes}</div>`;
      }

      function focusRelationshipGraphHero(event, heroId) {
        if (event?.shiftKey) {
          openModal("hero", heroId);
          return;
        }
        relationshipGraphHeroId = heroId;
        renderRelationshipGraphPage();
      }
      function toggleRelationshipGraphFilter(type) {
        if (relationshipGraphFilters.has(type)) relationshipGraphFilters.delete(type);
        else relationshipGraphFilters.add(type);
        renderRelationshipGraphPage();
      }
      function clearRelationshipGraphFilters() {
        relationshipGraphFilters.clear();
        renderRelationshipGraphPage();
      }

      // ---------------- SKIN SERIES (RARITY-BASED) ----------------
      function renderSkinFamiliesPage() {
        const summary = document.getElementById("skin-family-summary");
        const host = document.getElementById("skin-family-groups");
        const search = document.getElementById("skin-family-search");
        if (!summary || !host || !search) return;
        const q = search.value.trim().toLowerCase();
        const skins = getSkins().filter((skin) => skin.type !== "statue" && !skin.isStatue);
        const series = (getAttributes().skinRarities || []).filter((value) => isSkinSeriesRarity(value));
        const assigned = skins.filter((skin) => getSkinSeriesName(skin)).length;
        summary.innerHTML = `<div class="skin-family-kpi"><span class="material-symbols-outlined">collections</span><strong>${series.length}</strong><small>Series</small></div><div class="skin-family-kpi"><span class="material-symbols-outlined">style</span><strong>${assigned}</strong><small>Series Skins</small></div><div class="skin-family-kpi"><span class="material-symbols-outlined">category</span><strong>${skins.length - assigned}</strong><small>Non-Series</small></div>`;
        const groups = series
          .map((name) => ({ family: name, skins: skins.filter((skin) => getSkinSeriesName(skin) === name) }))
          .filter(({ family, skins: seriesSkins }) => !q || family.toLowerCase().includes(q) || seriesSkins.some((skin) => skin.name.toLowerCase().includes(q)))
          .sort((a, b) => b.skins.length - a.skins.length || a.family.localeCompare(b.family));
        if (!groups.length && !q) {
          host.innerHTML = `<div class="empty-state-card"><span class="material-symbols-outlined">collections</span><strong>No Skin Series marked yet</strong><span>Open Attributes → Skin Rarity and mark the appropriate rarity as a Skin Series.</span><button class="btn btn-secondary btn-sm" onclick="showPage('page-attributes');switchAttrTab('skinRarities')">Open Skin Rarity</button></div>`;
          return;
        }
        host.innerHTML = groups.map(({ family, skins: seriesSkins }) => {
          const image = getAttrImage("skinRarities", family);
          return `<section class="skin-family-card"><div class="skin-family-card-head">${image ? `<img src="${image}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="">` : `<span class="material-symbols-outlined skin-family-placeholder">collections</span>`}<div><span class="dashboard-eyebrow">Skin Series</span><h2>${escHtml(family)}</h2><small>${seriesSkins.length} skin${seriesSkins.length === 1 ? "" : "s"}</small></div></div><div class="skin-family-skin-grid">${seriesSkins.length ? seriesSkins.map((skin) => `<button type="button" class="skin-family-skin" onclick="openModal('skin','${skin.id}')"><img src="${skin.splashArt || skin.imageUrl || skin.portrait || IMAGE_PLACEHOLDER}" data-fallback-src="${skin.portrait || skin.icon || IMAGE_PLACEHOLDER}" alt=""><span>${escHtml(skin.name)}</span></button>`).join("") : `<div class="skin-family-empty">No released skins use this series yet.</div>`}</div></section>`;
        }).join("");
      }

      // ---------------- RECOMMENDED BUILDS ----------------
      function buildChoiceButton(kind, value, selected, key) {
        const image = getAttrImage(key, value);
        const fallback = kind === "emblem" ? "verified" : kind === "talent" ? "stars" : "shopping_bag";
        return `<button type="button" class="build-choice-pill${selected ? " active" : ""}" data-kind="${kind}" data-value="${escHtml(value)}" onclick="toggleBuildChoice(this,'${kind}')">${image ? `<img src="${image}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="">` : `<span class="material-symbols-outlined">${fallback}</span>`}<span>${escHtml(value)}</span></button>`;
      }

      function buildItemCategorySections(kind, selectedValues) {
        const items = getAttributes().items || [];
        if (!items.length) return `<span class="build-choice-empty">Add Build Items in Attributes first.</span>`;
        const selected = new Set(selectedValues || []);
        const categorized = BUILD_ITEM_CATEGORIES.map((category) => ({
          category,
          items: items.filter((item) => getItemCategories(item).includes(category)),
        })).filter((group) => group.items.length);
        const uncategorized = items.filter((item) => !getItemCategories(item).length);
        const sections = [...categorized, ...(uncategorized.length ? [{ category: "Other", items: uncategorized }] : [])];
        return sections.map(({ category, items: categoryItems }, index) => `<details class="build-item-category" ${index < 2 ? "open" : ""}><summary><span>${category}</span><small>${categoryItems.length}</small></summary><div class="build-choice-grid">${categoryItems.map((value) => buildChoiceButton(kind, value, selected.has(value), "items")).join("")}</div></details>`).join("");
      }

      function addHeroBuildInput(data = { name: "Recommended", items: [], substituteItems: [], emblem: "", talents: [] }) {
        const container = document.getElementById("hero-builds-container");
        if (!container) return;
        const attrs = getAttributes();
        const card = document.createElement("div");
        card.className = "hero-build-editor-card";
        card.dataset.items = JSON.stringify(data.items || []);
        card.dataset.substituteItems = JSON.stringify(data.substituteItems || []);
        card.dataset.emblem = data.emblem || "";
        card.dataset.talents = JSON.stringify(data.talents || []);
        card.innerHTML = `<div class="hero-build-editor-head"><input type="text" class="form-input hero-build-name" value="${escHtml(data.name || "Recommended")}" placeholder="Build name, e.g. Burst / Sustain / Roam"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.hero-build-editor-card').remove()"><span class="material-symbols-outlined">delete</span></button></div>
          <details class="hero-build-choice-group" open><summary><span><span class="material-symbols-outlined">shopping_bag</span>Main Equipment</span><small class="build-choice-count build-item-count">${(data.items || []).length}/6 selected</small></summary><div class="build-category-stack build-items-grid">${buildItemCategorySections("item", data.items || [])}</div></details>
          <details class="hero-build-choice-group"><summary><span><span class="material-symbols-outlined">swap_horiz</span>Substitute Equipment</span><small class="build-choice-count build-substitute-count">${(data.substituteItems || []).length}/6 selected</small></summary><p class="build-choice-help">Optional alternatives you can swap into the build depending on matchup or role.</p><div class="build-category-stack build-substitute-grid">${buildItemCategorySections("substitute", data.substituteItems || [])}</div></details>
          <details class="hero-build-choice-group emblem-setup" open><summary><span><span class="material-symbols-outlined">shield</span>Emblem Setup</span><small class="build-choice-count build-emblem-summary">${data.emblem ? "1 emblem" : "No emblem"} · ${(data.talents || []).length}/3 talents</small></summary><div class="build-emblem-section"><div class="build-subsection-head"><strong>Main Emblem</strong><small>Choose exactly one</small></div><div class="build-choice-grid build-emblems-grid">${(attrs.emblems || []).map((value) => buildChoiceButton("emblem", value, data.emblem === value, "emblems")).join("") || `<span class="build-choice-empty">Add Main Emblems in Attributes first.</span>`}</div></div><div class="build-emblem-section"><div class="build-subsection-head"><strong>Talents</strong><small>Choose exactly three</small></div><div class="build-choice-grid build-talents-grid">${(attrs.emblemTalents || []).map((value) => buildChoiceButton("talent", value, (data.talents || []).includes(value), "emblemTalents")).join("") || `<span class="build-choice-empty">Add Talents in Attributes first.</span>`}</div></div></details>`;
        container.appendChild(card);
      }

      function updateBuildChoiceState(card, kind, values) {
        card.querySelectorAll(`.build-choice-pill[data-kind="${kind}"]`).forEach((pill) => {
          pill.classList.toggle("active", values.includes(pill.dataset.value));
        });
      }

      function updateEmblemSummary(card) {
        const el = card.querySelector(".build-emblem-summary");
        if (!el) return;
        let talents = [];
        try { talents = JSON.parse(card.dataset.talents || "[]"); } catch (e) {}
        el.textContent = `${card.dataset.emblem ? "1 emblem" : "No emblem"} · ${talents.length}/3 talents`;
      }

      function toggleBuildChoice(button, kind) {
        const card = button.closest(".hero-build-editor-card");
        if (!card) return;
        const value = button.dataset.value;
        if (kind === "emblem") {
          const next = card.dataset.emblem === value ? "" : value;
          card.dataset.emblem = next;
          card.querySelectorAll('.build-choice-pill[data-kind="emblem"]').forEach((pill) => pill.classList.toggle("active", pill.dataset.value === next));
          updateEmblemSummary(card);
          return;
        }
        const key = kind === "item" ? "items" : kind === "substitute" ? "substituteItems" : "talents";
        const max = kind === "talent" ? 3 : 6;
        let values = [];
        try { values = JSON.parse(card.dataset[key] || "[]"); } catch (e) {}
        if (values.includes(value)) values = values.filter((entry) => entry !== value);
        else {
          if (values.length >= max) {
            showToast(kind === "talent" ? "Choose exactly 3 talents." : `Choose up to ${max} equipment.`, "info");
            return;
          }
          values.push(value);
        }
        card.dataset[key] = JSON.stringify(values);
        updateBuildChoiceState(card, kind, values);
        if (kind === "item") {
          const count = card.querySelector(".build-item-count");
          if (count) count.textContent = `${values.length}/6 selected`;
        } else if (kind === "substitute") {
          const count = card.querySelector(".build-substitute-count");
          if (count) count.textContent = `${values.length}/6 selected`;
        } else updateEmblemSummary(card);
      }

      function collectHeroBuilds() {
        const builds = [...document.querySelectorAll("#hero-builds-container .hero-build-editor-card")].map((card) => {
          let items = [], substituteItems = [], talents = [];
          try { items = JSON.parse(card.dataset.items || "[]"); } catch (e) {}
          try { substituteItems = JSON.parse(card.dataset.substituteItems || "[]"); } catch (e) {}
          try { talents = JSON.parse(card.dataset.talents || "[]"); } catch (e) {}
          return {
            name: card.querySelector(".hero-build-name")?.value.trim() || "Recommended",
            items,
            substituteItems,
            emblem: card.dataset.emblem || "",
            talents,
          };
        }).filter((build) => build.items.length || build.substituteItems.length || build.emblem || build.talents.length);
        const invalid = builds.find((build) => !build.emblem || build.talents.length !== 3);
        if (invalid) {
          showToast(`Build "${invalid.name}" needs exactly 1 Main Emblem and 3 Talents.`, "info");
          return null;
        }
        return builds;
      }

      function buildHeroRecommendedBuildsHtml(hero) {
        const builds = hero?.builds || [];
        if (!builds.length) return "";
        const icon = (key, value, fallbackIcon) => {
          const image = getAttrImage(key, value);
          return `<div class="recommended-build-token" data-tooltip="${escHtml(value)}">${image ? `<img src="${image}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt="">` : `<span class="material-symbols-outlined">${fallbackIcon}</span>`}<small>${escHtml(value)}</small></div>`;
        };
        return `<div class="modal-section-header">Recommended Builds <span class="section-count">${builds.length}</span></div><div class="recommended-build-list">${builds.map((build) => `<article class="recommended-build-card"><div class="recommended-build-title"><span class="material-symbols-outlined">build_circle</span><strong>${escHtml(build.name || "Recommended")}</strong></div><div class="recommended-build-row"><span class="recommended-build-label">Main Equipment</span><div class="recommended-build-tokens">${(build.items || []).map((value) => icon("items", value, "shopping_bag")).join("") || `<em>None set</em>`}</div></div>${(build.substituteItems || []).length ? `<div class="recommended-build-row substitute"><span class="recommended-build-label">Substitutes</span><div class="recommended-build-tokens">${build.substituteItems.map((value) => icon("items", value, "swap_horiz")).join("")}</div></div>` : ""}<div class="recommended-build-row"><span class="recommended-build-label">Main Emblem</span><div class="recommended-build-tokens">${build.emblem ? icon("emblems", build.emblem, "verified") : `<em>None set</em>`}</div></div><div class="recommended-build-row"><span class="recommended-build-label">Talents</span><div class="recommended-build-tokens">${(build.talents || []).map((value) => icon("emblemTalents", value, "stars")).join("") || `<em>None set</em>`}</div></div></article>`).join("")}</div>`;
      }
