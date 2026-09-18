      // ============================================================
      // V2.5 — DASHBOARD, GLOBAL SEARCH, HERO CHANGE LOGS,
      // HERO RELATIONSHIPS, SKIN ANALYTICS, RELEASE READINESS
      // ============================================================

      const CHANGE_TYPES = ["Buff", "Nerf", "Adjusted", "Revamped", "Fix", "Other"];
      const CHANGE_TYPE_ICONS = {
        Buff: "trending_up",
        Nerf: "trending_down",
        Adjusted: "tune",
        Revamped: "construction",
        Fix: "build_circle",
        Other: "notes",
      };

      function escHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function changeTypeClass(type) {
        return `change-${String(type || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      }

      function parseLooseDate(value) {
        if (!value) return 0;
        const n = Date.parse(value);
        return Number.isFinite(n) ? n : 0;
      }

      function formatCompactDate(value) {
        const ts = parseLooseDate(value);
        if (!ts) return value || "Undated";
        try {
          return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }).format(new Date(ts));
        } catch (_) {
          return value;
        }
      }

      // ---------------- CHANGE LOG PAGE ----------------
      let changeLogEditing = null;

      function getAllHeroChangeEntries() {
        return getHeroes()
          .flatMap((hero) => (hero.changeLog || []).map((entry, index) => ({ hero, entry, index })))
          .sort((a, b) => parseLooseDate(b.entry.date) - parseLooseDate(a.entry.date));
      }

      function getSelectedChangeLogType() {
        const input = document.getElementById("changelog-type");
        const value = input?.value || "Adjusted";
        return CHANGE_TYPES.includes(value) ? value : "Adjusted";
      }

      function setChangeLogType(type) {
        const normalized = CHANGE_TYPES.includes(type) ? type : "Adjusted";
        const input = document.getElementById("changelog-type");
        if (input) input.value = normalized;
        renderChangeLogTypePills();
      }

      function renderChangeLogTypePills() {
        const wrap = document.getElementById("changelog-type-pills");
        if (!wrap) return;
        const selected = getSelectedChangeLogType();
        wrap.innerHTML = CHANGE_TYPES.map((type) => {
          const active = type === selected;
          return `<button type="button" class="changelog-type-pill ${changeTypeClass(type)}${active ? " active" : ""}" aria-pressed="${active}" onclick="setChangeLogType('${type}')"><span class="material-symbols-outlined">${CHANGE_TYPE_ICONS[type] || "notes"}</span><span>${type}</span></button>`;
        }).join("");
      }

      function updateChangeLogEditorMode() {
        const editing = !!changeLogEditing;
        const eyebrow = document.getElementById("changelog-editor-eyebrow");
        const title = document.getElementById("changelog-editor-title");
        const saveBtn = document.getElementById("changelog-save-btn");
        const cancelBtn = document.getElementById("changelog-cancel-edit-btn");
        const heroSelect = document.getElementById("changelog-hero");
        if (eyebrow) eyebrow.textContent = editing ? "Editing entry" : "New entry";
        if (title) title.textContent = editing ? "Edit Hero Change" : "Add Hero Change";
        if (saveBtn) saveBtn.innerHTML = editing
          ? '<span class="material-symbols-outlined">save</span><span>Update Change</span>'
          : '<span class="material-symbols-outlined">add</span><span>Add Change</span>';
        if (cancelBtn) cancelBtn.hidden = !editing;
        if (heroSelect) heroSelect.disabled = editing;
      }

      function populateChangeLogControls() {
        const heroSelect = document.getElementById("changelog-hero");
        const filterType = document.getElementById("changelog-filter-type");
        if (heroSelect) {
          const current = heroSelect.value;
          heroSelect.innerHTML = '<option value="">Select hero...</option>' + getHeroes()
            .slice().sort((a,b) => a.name.localeCompare(b.name))
            .map((hero) => `<option value="${escHtml(hero.id)}">${escHtml(hero.name)}</option>`).join("");
          if ([...heroSelect.options].some((o) => o.value === current)) heroSelect.value = current;
        }
        const options = CHANGE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
        if (filterType && filterType.options.length <= 1) filterType.insertAdjacentHTML("beforeend", options);
        renderChangeLogTypePills();
        updateChangeLogEditorMode();
      }

      function clearChangeLogTextFields() {
        ["changelog-date", "changelog-summary", "changelog-notes"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
      }

      function resetChangeLogEditorForm() {
        changeLogEditing = null;
        clearChangeLogTextFields();
        const heroSelect = document.getElementById("changelog-hero");
        if (heroSelect) {
          heroSelect.disabled = false;
          heroSelect.value = "";
        }
        const typeInput = document.getElementById("changelog-type");
        if (typeInput) typeInput.value = "Adjusted";
        renderChangeLogTypePills();
        updateChangeLogEditorMode();
      }

      function cancelChangeLogEdit() {
        resetChangeLogEditorForm();
      }

      function editChangeLogEntry(heroId, index) {
        const hero = getHeroes().find((item) => item.id === heroId);
        const entry = hero?.changeLog?.[index];
        if (!hero || !entry) return showToast("Change log entry not found.", "info");
        changeLogEditing = { heroId, index };
        const heroSelect = document.getElementById("changelog-hero");
        const date = document.getElementById("changelog-date");
        const summary = document.getElementById("changelog-summary");
        const notes = document.getElementById("changelog-notes");
        if (heroSelect) heroSelect.value = heroId;
        if (date) date.value = entry.date || "";
        if (summary) summary.value = entry.summary || "";
        if (notes) notes.value = entry.notes || "";
        setChangeLogType(entry.type || "Adjusted");
        updateChangeLogEditorMode();
        document.querySelector(".changelog-editor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      async function saveChangeLogEntry() {
        const heroId = document.getElementById("changelog-hero")?.value || "";
        const date = document.getElementById("changelog-date")?.value.trim() || "";
        const type = getSelectedChangeLogType();
        const summary = document.getElementById("changelog-summary")?.value.trim() || "";
        const notes = document.getElementById("changelog-notes")?.value.trim() || "";
        if (!heroId) return showToast("Choose a hero first.", "info");
        if (!date && !summary && !notes) return showToast("Add at least a date, summary, or details.", "info");

        const heroes = getHeroes();
        const targetHeroId = changeLogEditing?.heroId || heroId;
        const hero = heroes.find((item) => item.id === targetHeroId);
        if (!hero) return showToast("Hero not found.", "info");

        const nextEntry = { date, type, summary, notes };
        let wasEditing = false;
        if (changeLogEditing) {
          const current = hero.changeLog?.[changeLogEditing.index];
          if (!current) {
            changeLogEditing = null;
            updateChangeLogEditorMode();
            return showToast("That change log entry no longer exists.", "info");
          }
          hero.changeLog[changeLogEditing.index] = nextEntry;
          wasEditing = true;
        } else {
          hero.changeLog = [...(hero.changeLog || []), nextEntry];
        }
        hero.changeLog = [...(hero.changeLog || [])].sort((a,b) => parseLooseDate(b.date)-parseLooseDate(a.date));
        saveHeroes(heroes);

        // Fully reset the editor after every successful add/update.
        resetChangeLogEditorForm();
        renderChangeLogPage();
        renderDashboardPage();
        showToast(wasEditing ? "Change log entry updated." : "Change log entry added.", "success");
      }

      function deleteChangeLogEntry(heroId, index) {
        const heroes = getHeroes();
        const hero = heroes.find((item) => item.id === heroId);
        if (!hero || !Array.isArray(hero.changeLog) || !hero.changeLog[index]) return;
        hero.changeLog.splice(index, 1);
        saveHeroes(heroes);
        if (changeLogEditing?.heroId === heroId && changeLogEditing?.index === index) {
          resetChangeLogEditorForm();
        }
        renderChangeLogPage();
        renderDashboardPage();
        showToast("Change log entry removed.", "success");
      }

      function renderChangeLogPage() {
        populateChangeLogControls();
        const feed = document.getElementById("changelog-feed");
        if (!feed) return;
        const q = (document.getElementById("changelog-search")?.value || "").trim().toLowerCase();
        const typeFilter = document.getElementById("changelog-filter-type")?.value || "";
        const entries = getAllHeroChangeEntries().filter(({hero,entry}) => {
          if (typeFilter && entry.type !== typeFilter) return false;
          if (!q) return true;
          return [hero.name, entry.type, entry.date, entry.summary, entry.notes].some((v) => String(v || "").toLowerCase().includes(q));
        });
        feed.innerHTML = entries.length ? entries.map(({hero,entry,index}) => {
          const badge = getHeroBadgeImageSources(hero);
          return `<article class="changelog-entry-card ${changeTypeClass(entry.type)}">
            <button class="changelog-hero-link" type="button" onclick="openModal('hero','${hero.id}')">
              <img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt="">
              <span><strong>${escHtml(hero.name)}</strong><small>${escHtml(formatCompactDate(entry.date))}</small></span>
            </button>
            <div class="changelog-entry-main">
              <div class="changelog-entry-heading"><span class="change-pill ${changeTypeClass(entry.type)}"><span class="material-symbols-outlined">${CHANGE_TYPE_ICONS[entry.type] || "notes"}</span>${escHtml(entry.type || "Other")}</span>${entry.summary ? `<strong>${escHtml(entry.summary)}</strong>` : ""}</div>
              ${entry.notes ? `<p>${escHtml(entry.notes)}</p>` : ""}
            </div>
            <div class="changelog-entry-actions">
              <button type="button" class="icon-button" data-tooltip="Edit change" onclick="editChangeLogEntry('${hero.id}',${index})"><span class="material-symbols-outlined">edit</span></button>
              <button type="button" class="icon-button changelog-delete" data-tooltip="Delete change" onclick="deleteChangeLogEntry('${hero.id}',${index})"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </article>`;
        }).join("") : `<div class="dashboard-empty">No change log entries match these filters.</div>`;
        installCustomTooltipMigration(feed);
      }

      function buildHeroChangeLogHtml(hero) {
        const entries = [...(hero.changeLog || [])].sort(
          (a, b) => parseLooseDate(b.date) - parseLooseDate(a.date),
        );
        if (!entries.length) return "";
        return `<div class="modal-section-header">Change Log <span class="section-count">${entries.length}</span></div>
          <div class="hero-change-timeline">${entries
            .map(
              (entry) => `<div class="hero-change-entry ${changeTypeClass(entry.type)}">
                <div class="hero-change-marker"><span class="material-symbols-outlined">${CHANGE_TYPE_ICONS[entry.type] || "notes"}</span></div>
                <div class="hero-change-copy">
                  <div class="hero-change-heading"><span class="hero-change-kind">${escHtml(entry.type || "Other")}</span><time>${escHtml(formatCompactDate(entry.date))}</time></div>
                  ${entry.summary ? `<strong>${escHtml(entry.summary)}</strong>` : ""}
                  ${entry.notes ? `<p>${escHtml(entry.notes)}</p>` : ""}
                </div>
              </div>`,
            )
            .join("")}</div>`;
      }

      // ---------------- HERO LORE RELATIONSHIPS ----------------
      const HERO_RELATIONSHIP_TYPES = [
        { value: "Companion", icon: "group", inverse: "Companion" },
        { value: "Lover", icon: "favorite", inverse: "Lover" },
        { value: "Friend", icon: "handshake", inverse: "Friend" },
        { value: "Ally", icon: "shield_person", inverse: "Ally" },
        { value: "Partner", icon: "diversity_2", inverse: "Partner" },
        { value: "Family", icon: "family_restroom", inverse: "Family" },
        { value: "Sibling", icon: "family_restroom", inverse: "Sibling" },
        { value: "Parent", icon: "supervisor_account", inverse: "Child" },
        { value: "Child", icon: "child_care", inverse: "Parent" },
        { value: "Mentor", icon: "school", inverse: "Student" },
        { value: "Student", icon: "person_book", inverse: "Mentor" },
        { value: "Rival", icon: "swords", inverse: "Rival" },
        { value: "Enemy", icon: "dangerous", inverse: "Enemy" },
        { value: "Other", icon: "link", inverse: "Other" },
      ];

      function getRelationshipTypeMeta(type) {
        return HERO_RELATIONSHIP_TYPES.find((item) => item.value === type) || {
          value: type || "Other",
          icon: "link",
          inverse: type || "Other",
        };
      }

      function getRelationshipHero(id) {
        return getHeroes().find((hero) => hero.id === id) ||
          getUpcoming().find((item) => item.itemType === "hero" && item.id === id) || null;
      }

      function getHeroLoreRelationships(hero) {
        if (!hero) return [];
        const merged = [];
        const seen = new Set();
        const add = (target, type, note = "", source = "direct") => {
          if (!target || target.id === hero.id) return;
          const key = `${target.id}::${type}`;
          if (seen.has(key)) return;
          seen.add(key);
          merged.push({ hero: target, type, note, source });
        };

        (hero.relationships || []).forEach((rel) => {
          const target = getRelationshipHero(rel.heroId);
          if (target) add(target, rel.type || "Other", rel.note || "", "direct");
        });

        const allHeroes = [
          ...getHeroes(),
          ...getUpcoming().filter((item) => item.itemType === "hero"),
        ];
        allHeroes.forEach((other) => {
          if (!other || other.id === hero.id) return;
          (other.relationships || []).forEach((rel) => {
            if (rel.heroId !== hero.id) return;
            const meta = getRelationshipTypeMeta(rel.type || "Other");
            add(other, meta.inverse || rel.type || "Other", rel.note || "", "inverse");
          });
        });

        return merged.sort((a, b) =>
          a.type.localeCompare(b.type) || a.hero.name.localeCompare(b.hero.name),
        );
      }

      function buildHeroRelationshipsHtml(hero) {
        const relationships = getHeroLoreRelationships(hero);
        if (!relationships.length) return "";
        return `<div class="modal-section-header">Relationships</div>
          <div class="hero-relationship-grid">${relationships
            .map((rel) => {
              const item = rel.hero;
              const badge = getHeroBadgeImageSources(item);
              const meta = getRelationshipTypeMeta(rel.type);
              return `<button type="button" class="hero-relationship-card relationship-${escHtml(rel.type).toLowerCase().replace(/[^a-z0-9]+/g, "-")}" onclick="openModal('hero','${item.id}')">
                <img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt="${escHtml(item.name)}">
                <span class="hero-relationship-copy"><strong>${escHtml(item.name)}</strong><small class="hero-relationship-kind"><span class="material-symbols-outlined">${meta.icon}</span>${escHtml(rel.type)}</small>${rel.note ? `<em>${escHtml(rel.note)}</em>` : ""}</span>
                <span class="material-symbols-outlined">chevron_right</span>
              </button>`;
            })
            .join("")}</div>`;
      }

      function addHeroRelationshipInput(data = { heroId: "", type: "Companion", note: "" }, options = {}) {
        const container = document.getElementById("hero-relationships-container");
        if (!container) return;
        const currentId = document.getElementById("hero-id")?.value || "";
        const mirrored = !!options.mirrored;
        const choices = [
          ...getHeroes(),
          ...getUpcoming().filter((item) => item.itemType === "hero"),
        ]
          .filter((hero) => hero.id !== currentId)
          .sort((a, b) => a.name.localeCompare(b.name));
        const row = document.createElement("div");
        row.className = `hero-relationship-editor-row${mirrored ? " mirrored" : ""}`;
        row.dataset.mirrored = mirrored ? "true" : "false";
        const mirroredHero = mirrored ? getRelationshipHero(data.heroId) : null;
        row.innerHTML = `
          <select class="form-select hero-relationship-hero" aria-label="Related hero"${mirrored ? " disabled" : ""}>
            <option value="">Choose hero...</option>
            ${choices.map((hero) => `<option value="${hero.id}"${hero.id === data.heroId ? " selected" : ""}>${escHtml(hero.name)}</option>`).join("")}
          </select>
          <select class="form-select hero-relationship-type" aria-label="Relationship type"${mirrored ? " disabled" : ""}>
            ${HERO_RELATIONSHIP_TYPES.map((type) => `<option value="${type.value}"${type.value === (data.type || "Companion") ? " selected" : ""}>${type.value}</option>`).join("")}
          </select>
          <input type="text" class="form-input hero-relationship-note" placeholder="Optional context, e.g. childhood friend" value="${escHtml(data.note || "")}"${mirrored ? " readonly" : ""}>
          ${mirrored
            ? `<span class="relationship-mirror-badge" data-tooltip="This inverse relationship comes from ${escHtml(mirroredHero?.name || "the other hero")}'s relationship entry"><span class="material-symbols-outlined">sync_alt</span>Mirrored</span>`
            : `<button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.hero-relationship-editor-row').remove()" title="Remove relationship" aria-label="Remove relationship"><span class="material-symbols-outlined">delete</span></button>`}`;
        container.appendChild(row);
      }

      function collectHeroRelationships() {
        const rows = [...document.querySelectorAll("#hero-relationships-container .hero-relationship-editor-row:not(.mirrored)")];
        const seen = new Set();
        return rows
          .map((row) => ({
            heroId: row.querySelector(".hero-relationship-hero")?.value || "",
            type: row.querySelector(".hero-relationship-type")?.value || "Other",
            note: row.querySelector(".hero-relationship-note")?.value.trim() || "",
          }))
          .filter((rel) => {
            if (!rel.heroId) return false;
            const key = `${rel.heroId}::${rel.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      }

      // ---------------- COMPLETENESS / DATA HEALTH ----------------
      function getRecordCompleteness(item, type = item?.itemType || "hero") {
        if (!item) return { percent: 0, missing: ["Record missing"] };
        const checks = [];
        const add = (ok, label) => checks.push({ ok: !!ok, label });
        add(item.name, "Name");
        add(item.releaseDate, "Release date");
        if (type === "hero") {
          add(item.roles?.length, "Role");
          add(item.lanes?.length, "Lane");
          add(item.nation, "Nation");
          add(item.icon || item.portrait || item.splashArt, "Artwork");
          add(item.skills?.length, "Skills");
        } else {
          add(item.heroId, "Hero");
          add(item.rarity, "Rarity");
          add(item.icon || item.portrait || item.splashArt || item.imageUrl, "Artwork");
        }
        const missing = checks.filter((x) => !x.ok).map((x) => x.label);
        const percent = Math.round(((checks.length - missing.length) / checks.length) * 100);
        return { percent, missing };
      }

      function getDataHealthIssues() {
        const issues = [];
        getHeroes().forEach((hero) => {
          const status = getRecordCompleteness(hero, "hero");
          if (status.missing.length) issues.push({ ...status, item: hero, type: "hero", upcoming: false });
        });
        getSkins()
          .filter((skin) => !skin.isStatue && skin.type !== "statue")
          .forEach((skin) => {
            const status = getRecordCompleteness(skin, "skin");
            if (status.missing.length) issues.push({ ...status, item: skin, type: "skin", upcoming: false });
          });
        getUpcoming().forEach((item) => {
          const type = item.itemType === "skin" ? "skin" : "hero";
          const status = getRecordCompleteness(item, type);
          if (status.missing.length) issues.push({ ...status, item, type, upcoming: true });
        });
        return issues.sort((a, b) => a.percent - b.percent || a.item.name.localeCompare(b.item.name));
      }

      // ---------------- DASHBOARD ----------------
      function renderDashboardPage() {
        const heroes = getHeroes();
        const skins = getSkins().filter((x) => !x.isStatue && x.type !== "statue");
        const upcoming = getUpcoming();
        const revampingCount = Object.keys(getRevamping()).length;
        const kpi = document.getElementById("dashboard-kpis");
        if (kpi) {
          kpi.innerHTML = [
            ["person", "Heroes", heroes.length, "page-heroes"],
            ["style", "Skins", skins.length, "page-skins"],
            ["update", "Upcoming", upcoming.length, "page-upcoming"],
            ["construction", "Revamping", revampingCount, "page-heroes"],
          ]
            .map(
              ([icon, label, value, page]) => `<button class="dashboard-kpi" onclick="showPage('${page}')"><span class="material-symbols-outlined">${icon}</span><div><strong>${value}</strong><small>${label}</small></div></button>`,
            )
            .join("");
        }

        const changes = heroes
          .flatMap((hero) => (hero.changeLog || []).map((entry) => ({ hero, entry })))
          .sort((a, b) => parseLooseDate(b.entry.date) - parseLooseDate(a.entry.date))
          .slice(0, 8);
        const changeEl = document.getElementById("dashboard-changelog");
        if (changeEl) {
          changeEl.innerHTML = changes.length
            ? changes
                .map(({ hero, entry }) => {
                  const badge = getHeroBadgeImageSources(hero);
                  return `<button class="dashboard-feed-item" onclick="openModal('hero','${hero.id}')"><img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt=""><span class="dashboard-feed-copy"><span><strong>${escHtml(hero.name)}</strong><em class="change-pill ${changeTypeClass(entry.type)}">${escHtml(entry.type || "Other")}</em></span><small>${escHtml(entry.summary || entry.notes || "Hero update")} · ${escHtml(formatCompactDate(entry.date))}</small></span></button>`;
                })
                .join("")
            : `<div class="dashboard-empty">No hero changes logged yet. Open Change Log to add one.</div>`;
        }

        const upcomingEl = document.getElementById("dashboard-upcoming");
        if (upcomingEl) {
          const sorted = [...upcoming]
            .sort((a, b) => {
              const da = getItemDateValue(a), db = getItemDateValue(b);
              if (da === -999999 && db === -999999) return 0;
              if (da === -999999) return 1;
              if (db === -999999) return -1;
              return da - db;
            })
            .slice(0, 6);
          upcomingEl.innerHTML = sorted.length
            ? sorted.map((item) => dashboardRecordRow(item, true)).join("")
            : `<div class="dashboard-empty">Nothing in Upcoming.</div>`;
        }

        const newestEl = document.getElementById("dashboard-newest-skins");
        if (newestEl) {
          const newest = skins
            .map((skin, index) => ({ skin, index, ts: Number(skin.collectionAddedAt || skin.firstAddedAt || skin.addedAt || 0) }))
            .sort((a, b) => b.ts - a.ts || b.index - a.index)
            .slice(0, 6)
            .map((x) => x.skin);
          newestEl.innerHTML = newest.length
            ? newest.map((item) => dashboardRecordRow(item, false)).join("")
            : `<div class="dashboard-empty">No released skins yet.</div>`;
        }

        const issues = getDataHealthIssues();
        const healthCount = document.getElementById("dashboard-health-count");
        if (healthCount) healthCount.textContent = issues.length ? `${issues.length} to review` : "All clear";
        const healthEl = document.getElementById("dashboard-data-health");
        if (healthEl) {
          healthEl.innerHTML = issues.length
            ? issues.slice(0, 12).map((issue) => {
                const item = issue.item;
                const open = issue.upcoming
                  ? `openModal('${issue.type}','${item.id}')`
                  : `openModal('${issue.type}','${item.id}')`;
                return `<button class="dashboard-health-item" onclick="${open}"><span class="dashboard-health-score">${issue.percent}%</span><span class="dashboard-health-copy"><strong>${escHtml(item.name)}</strong><small>${issue.upcoming ? "Upcoming · " : ""}Missing: ${escHtml(issue.missing.join(", "))}</small></span><span class="material-symbols-outlined">chevron_right</span></button>`;
              }).join("")
            : `<div class="dashboard-empty dashboard-empty-success"><span class="material-symbols-outlined">check_circle</span> No obvious missing core fields.</div>`;
        }
      }

      function dashboardRecordRow(item, isUpcoming) {
        const type = item.itemType === "hero" ? "hero" : item.itemType === "skin" ? "skin" : item.roles ? "hero" : "skin";
        let badge;
        if (type === "hero") badge = getHeroBadgeImageSources(item);
        else {
          const img = getSkinImageWithFallback(item, "icon");
          badge = { src: img.src || IMAGE_PLACEHOLDER, fallback: IMAGE_PLACEHOLDER, fallback2: IMAGE_PLACEHOLDER };
        }
        const readiness = getRecordCompleteness(item, type);
        return `<button class="dashboard-list-item" onclick="openModal('${type}','${item.id}')"><img src="${badge.src}" data-fallback-src="${badge.fallback}" data-fallback-src2="${badge.fallback2}" alt=""><span class="dashboard-list-copy"><strong>${escHtml(item.name)}</strong><small>${escHtml(item.releaseDate || (isUpcoming ? "Release date missing" : item.rarity || "Skin"))}</small></span>${isUpcoming ? `<span class="readiness-pill ${readiness.percent === 100 ? "ready" : "incomplete"}">${readiness.percent}%</span>` : ""}</button>`;
      }

      // ---------------- SKIN COUNT ANALYTICS ----------------
      function renderSkinCountAnalytics(skins, heroes, attrs) {
        const root = document.getElementById("skin-count-analytics");
        if (!root) return;
        const heroCounts = new Map(heroes.map((h) => [h.id, 0]));
        skins.forEach((skin) => heroCounts.set(skin.heroId, (heroCounts.get(skin.heroId) || 0) + 1));
        const rankedHeroes = heroes
          .map((hero) => ({ hero, count: heroCounts.get(hero.id) || 0 }))
          .sort((a, b) => b.count - a.count || a.hero.name.localeCompare(b.hero.name));
        const most = rankedHeroes[0] || { hero: null, count: 0 };
        const heroesWithSkin = rankedHeroes.filter((x) => x.count > 0).length;
        const avg = heroes.length ? (skins.length / heroes.length).toFixed(1) : "0.0";
        const rarityCounts = {};
        const collCounts = {};
        skins.forEach((skin) => {
          rarityCounts[skin.rarity || "Unknown"] = (rarityCounts[skin.rarity || "Unknown"] || 0) + 1;
          collCounts[skin.collectible || "Standard"] = (collCounts[skin.collectible || "Standard"] || 0) + 1;
        });
        const topEntry = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
        const topRarity = topEntry(rarityCounts);
        const topCollectible = topEntry(collCounts);
        const maxHero = Math.max(1, ...rankedHeroes.slice(0, 5).map((x) => x.count));
        root.innerHTML = `<div class="skin-analytics-kpis">
            ${skinMetric("avg_pace", "Avg / Hero", avg, "released skins")}
            ${skinMetric("military_tech", "Most Skins", most.hero ? most.hero.name : "—", `${most.count} skins`)}
            ${skinMetric("auto_awesome", "Top Rarity", topRarity[0], `${topRarity[1]} skins`)}
            ${skinMetric("workspace_premium", "Top Collectible", topCollectible[0], `${topCollectible[1]} skins`)}
            ${skinMetric("groups", "Hero Coverage", `${heroesWithSkin}/${heroes.length}`, `${heroes.length ? Math.round((heroesWithSkin / heroes.length) * 100) : 0}% have skins`)}
          </div>
          <div class="skin-analytics-panels">
            <section class="skin-analytics-panel"><div class="skin-analytics-title"><span>Top heroes by skins</span><small>Released collection</small></div><div class="skin-analytics-bars">${rankedHeroes.slice(0, 5).map(({ hero, count }) => `<button onclick="openModal('hero','${hero.id}')"><span>${escHtml(hero.name)}</span><i style="--bar:${Math.round((count / maxHero) * 100)}%"></i><strong>${count}</strong></button>`).join("")}</div></section>
            <section class="skin-analytics-panel"><div class="skin-analytics-title"><span>Rarity mix</span><small>Top categories</small></div><div class="skin-analytics-bars">${Object.entries(rarityCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count]) => `<div><span>${escHtml(name)}</span><i style="--bar:${skins.length ? Math.round((count / skins.length) * 100) : 0}%"></i><strong>${count}</strong></div>`).join("")}</div></section>
          </div>`;
      }

      function skinMetric(icon, label, value, sub) {
        return `<div class="skin-analytics-kpi"><span class="material-symbols-outlined">${icon}</span><div><small>${label}</small><strong>${escHtml(value)}</strong><em>${escHtml(sub)}</em></div></div>`;
      }

      // ---------------- GLOBAL SEARCH ----------------
      function setupGlobalSearch() {
        const input = document.getElementById("global-search-input");
        const shell = document.getElementById("global-search-shell");
        const results = document.getElementById("global-search-results");
        if (!input || !results || !shell) return;

        const pages = [
          ["Dashboard", "dashboard", "page-dashboard"],
          ["Change Log", "history", "page-changelog"],
          ["Heroes", "person", "page-heroes"],
          ["Hero Stats", "monitoring", "page-hero-stats"],
          ["Skins", "style", "page-skins"],
          ["Skin Count", "analytics", "page-skin-count"],
          ["Upcoming", "update", "page-upcoming"],
          ["Attributes", "tune", "page-attributes"],
          ["Matrix", "grid_view", "page-matrix"],
          ["Tier List", "leaderboard", "page-tier-list"],
        ];

        const getMatches = (query) => {
          const q = query.trim().toLowerCase();
          const all = [];
          pages.forEach(([name, icon, page]) => all.push({ kind: "Page", name, icon, page }));
          getHeroes().forEach((item) => all.push({ kind: "Hero", name: item.name, item, type: "hero", icon: "person" }));
          getSkins().forEach((item) => all.push({ kind: "Skin", name: item.name, item, type: "skin", icon: "style" }));
          getUpcoming().forEach((item) => all.push({ kind: item.itemType === "hero" ? "Upcoming Hero" : "Upcoming Skin", name: item.name, item, type: item.itemType, icon: "update" }));
          getHeroes().forEach((hero) => (hero.changeLog || []).forEach((entry) => all.push({ kind: "Change Log", name: `${hero.name}: ${entry.summary || entry.type}`, item: hero, type: "hero", icon: CHANGE_TYPE_ICONS[entry.type] || "history" })));
          if (!q) return all.filter((x) => x.kind === "Page").slice(0, 8);
          return all
            .map((entry) => ({ entry, score: globalSearchScore(entry, q) }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
            .slice(0, 12)
            .map((x) => x.entry);
        };

        const render = () => {
          const matches = getMatches(input.value);
          results.innerHTML = matches.length
            ? matches.map((entry, idx) => `<button type="button" class="global-search-result" data-index="${idx}"><span class="material-symbols-outlined">${entry.icon}</span><span><strong>${escHtml(entry.name)}</strong><small>${entry.kind}</small></span><span class="material-symbols-outlined global-search-go">north_west</span></button>`).join("")
            : `<div class="global-search-empty">No results found.</div>`;
          results.hidden = false;
          results._entries = matches;
        };
        input.addEventListener("focus", render);
        input.addEventListener("input", render);
        results.addEventListener("click", (event) => {
          const btn = event.target.closest(".global-search-result");
          if (!btn) return;
          const entry = results._entries?.[Number(btn.dataset.index)];
          if (!entry) return;
          results.hidden = true;
          input.value = "";
          if (entry.page) showPage(entry.page);
          else if (entry.item) openModal(entry.type, entry.item.id);
        });
        document.addEventListener("click", (event) => {
          if (!shell.contains(event.target)) results.hidden = true;
        });
        document.addEventListener("keydown", (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            input.focus();
            input.select();
            render();
          } else if (event.key === "Escape" && document.activeElement === input) {
            results.hidden = true;
            input.blur();
          }
        });
      }

      function globalSearchScore(entry, q) {
        const hay = `${entry.name} ${entry.kind}`.toLowerCase();
        if (hay === q) return 100;
        if (hay.startsWith(q)) return 75;
        if (hay.includes(q)) return 50;
        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.every((t) => hay.includes(t)) ? 25 : 0;
      }

      // ---------------- UPCOMING RELEASE REVIEW ----------------
      function releaseItem(type, id) {
        const item = getUpcoming().find((x) => x.id === id && x.itemType === type);
        if (!item) return;
        const status = getRecordCompleteness(item, type);
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal release-review-modal">
          <div class="release-review-head"><span class="material-symbols-outlined">rocket_launch</span><div><h3>Release ${escHtml(item.name)}</h3><p>${status.percent}% ready</p></div></div>
          ${status.missing.length ? `<div class="release-review-warning"><strong>Missing before release</strong><div>${status.missing.map((x) => `<span>${escHtml(x)}</span>`).join("")}</div></div>` : `<div class="release-review-ready"><span class="material-symbols-outlined">check_circle</span> Core fields look complete.</div>`}
          <div class="confirm-actions"><button class="btn btn-secondary" id="release-review-cancel">Cancel</button>${status.missing.length ? `<button class="btn btn-secondary" id="release-review-edit">Edit First</button>` : ""}<button class="btn btn-primary" id="release-review-confirm">Release${status.missing.length ? " Anyway" : ""}</button></div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector("#release-review-cancel").onclick = () => overlay.remove();
        const edit = overlay.querySelector("#release-review-edit");
        if (edit) edit.onclick = () => {
          overlay.remove();
          type === "hero" ? renderHeroFormPage(id, true) : renderSkinForm(id, true);
        };
        overlay.querySelector("#release-review-confirm").onclick = () => {
          overlay.remove();
          performReleaseItem(type, id);
        };
      }

      function performReleaseItem(type, id) {
        const list = getUpcoming();
        const item = list.find((x) => x.id === id && x.itemType === type);
        if (!item) return;
        saveUpcoming(list.filter((x) => x.id !== id));
        if (type === "hero") {
          const released = { ...item };
          delete released.itemType;
          const heroes = getHeroes();
          const idx = heroes.findIndex((x) => x.id === id);
          if (idx > -1) heroes[idx] = released;
          else heroes.push(released);
          saveHeroes(heroes);
          populateFilters();
        } else {
          const released = { ...item };
          delete released.itemType;
          released.collectionAddedAt = Date.now();
          released.addedAt = released.addedAt || released.collectionAddedAt;
          released.firstAddedAt = released.firstAddedAt || released.collectionAddedAt;
          const skins = getSkins();
          const idx = skins.findIndex((x) => x.id === id);
          if (idx > -1) skins[idx] = released;
          else skins.push(released);
          saveSkins(skins);
        }
        renderUpcomingPage();
        renderDashboardPage();
        showToast("Released!", "success");
      }

      function initV25Features() {
        setupGlobalSearch();
        const search = document.getElementById("changelog-search");
        const type = document.getElementById("changelog-filter-type");
        if (search) search.addEventListener("input", debounce(() => renderChangeLogPage(), 180));
        if (type) type.addEventListener("change", () => renderChangeLogPage());
        renderDashboardPage();
        const activePage = document.querySelector(".page.active")?.id || "page-dashboard";
        currentPageId = activePage;
        document.querySelectorAll(".sidebar-button[data-page]").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === activePage));
      }
