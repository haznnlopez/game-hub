      // ============================================================
      // SORT STATE MANAGEMENT (pill-based)
      // ============================================================
      const sortState = {
        heroes: { key: "releaseDate", dir: "asc" },
        skins: { key: "releaseDate", dir: "asc" },
        upcoming: { key: "releaseDate", dir: "asc" },
      };

      function handleSortPill(page, key, btn) {
        const state = sortState[page];
        const pills = btn.closest(".sort-pills");
        const allPills = pills.querySelectorAll(".sort-pill");

        if (state.key === key) {
          // Same pill clicked
          if (state.dir === "asc") {
            state.dir = "desc";
          } else if (state.dir === "desc") {
            // Third click: deactivate (revert to default releaseDate asc)
            state.key = "releaseDate";
            state.dir = "asc";
          }
        } else {
          // Different pill clicked
          state.key = key;
          state.dir = "asc";
        }

        // Update pill UI
        allPills.forEach((p) => {
          p.classList.remove("active", "asc", "desc");
          p.querySelector(".sort-arrow").textContent = "";
        });

        // Find and style active pill
        allPills.forEach((p) => {
          if (p.dataset.sort === state.key) {
            p.classList.add("active", state.dir);
            p.querySelector(".sort-arrow").textContent =
              state.dir === "asc" ? "↑" : "↓";
            if (state.key === "az") {
              const labelNode = p.childNodes[0];
              if (labelNode.nodeType === 3) {
                labelNode.textContent = state.dir === "asc" ? "A–Z " : "Z–A ";
              }
            }
          } else {
            // Reset labels of inactive pills
            if (p.dataset.sort === "az") {
              const ln = p.childNodes[0];
              if (ln && ln.nodeType === 3) ln.textContent = "A–Z ";
            }
            p.querySelector(".sort-arrow").textContent = "";
          }
        });

        if (page === "heroes") renderHeroesPage();
        else if (page === "skins") renderSkinsPage();
        else if (page === "upcoming") renderUpcomingPage();
      }

      function parsePriceValue(item) {
        // For skins: use priceDiamonds. For heroes: use priceBP or priceDiamonds.
        const rawSkin = item.priceDiamonds || "";
        const rawBP = item.priceBP || "";
        const raw = rawSkin || rawBP;
        if (!raw) return { numeric: null, isText: false, raw: "" };
        const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && raw.replace(/[^0-9.]/g, "").length > 0) {
          return { numeric: num, isText: false, raw };
        }
        // Non-numeric (e.g. "Limited Event") — text, goes last sorted alpha
        return { numeric: null, isText: true, raw };
      }

      function applySortPill(data, page) {
        const { key, dir } = sortState[page];
        const arr = [...data];
        if (key === "releaseDate") {
          arr.sort((a, b) => {
            const da = getItemDateValue(a),
              db = getItemDateValue(b);
            if (dir === "asc") {
              if (da === -999999 && db === -999999) return 0;
              if (da === -999999) return 1;
              if (db === -999999) return -1;
              return da - db;
            } else {
              if (da === -999999 && db === -999999) return 0;
              if (da === -999999) return 1;
              if (db === -999999) return -1;
              return db - da;
            }
          });
        } else if (key === "az") {
          arr.sort((a, b) =>
            dir === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name),
          );
        } else if (key === "price") {
          arr.sort((a, b) => {
            const pa = parsePriceValue(a),
              pb = parsePriceValue(b);
            // Both have no price → sort alpha by name
            if (!pa.raw && !pb.raw) return a.name.localeCompare(b.name);
            // No price → goes last
            if (!pa.raw) return 1;
            if (!pb.raw) return -1;
            // Both are text (non-numeric like "Limited Event") → sort alpha, always last
            if (pa.isText && pb.isText) return pa.raw.localeCompare(pb.raw);
            // Text goes after numeric regardless of direction
            if (pa.isText) return 1;
            if (pb.isText) return -1;
            // Both numeric
            return dir === "asc"
              ? pa.numeric - pb.numeric
              : pb.numeric - pa.numeric;
          });
        }
        return arr;
      }

      function getItemDateValue(item) {
        if (item.releaseDate) {
          const s = item.releaseDate.trim();
          const MONTHS = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          // "Mon DD, YYYY"
          const full = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
          if (full) {
            const mi = MONTHS.findIndex((m) =>
              full[1].toLowerCase().startsWith(m.toLowerCase()),
            );
            if (mi !== -1)
              return new Date(
                parseInt(full[3]),
                mi,
                parseInt(full[2]),
              ).getTime();
          }

          // "Mon YYYY"
          const monYear = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
          if (monYear) {
            const mi = MONTHS.findIndex((m) =>
              monYear[1].toLowerCase().startsWith(m.toLowerCase()),
            );
            if (mi !== -1)
              return new Date(parseInt(monYear[2]), mi, 1).getTime();
          }

          // Pure year "YYYY"
          if (/^\d{4}$/.test(s)) return new Date(parseInt(s), 0, 1).getTime();

          // Last resort: native Date parse
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        // Fall back to tagDetails (starlightYear/Month, releaseYear/Month etc.)
        if (item.tagDetails) {
          const v = getSkinDateValue(item);
          if (v !== -999999) return v * 86400000;
        }
        return -999999;
      }

      // ============================================================
      // REVAMPING STATUS
      // ============================================================
      function getRevamping() {
        try {
          const raw = DB.getItem("mlbb_revamping");
          if (raw) return JSON.parse(raw) || {};
          // One-time migration: old Favorites become Revamping marks.
          const legacy = JSON.parse(DB.getItem("mlbb_starred") || "{}");
          if (legacy && Object.keys(legacy).length) {
            safeLocalStorageSet("mlbb_revamping", JSON.stringify(legacy));
            return legacy;
          }
          return {};
        } catch (e) {
          return {};
        }
      }
      function saveRevamping(d) {
        safeLocalStorageSet("mlbb_revamping", JSON.stringify(d));
      }
      function isRevamping(id) {
        return !!getRevamping()[id];
      }
      function toggleRevamping(id, renderFn) {
        const state = getRevamping();
        if (state[id]) delete state[id];
        else state[id] = true;
        saveRevamping(state);
        if (typeof renderFn === "function") renderFn();
      }
      // Revamping is a status, not a priority sort. Keep catalog order unchanged.
      function applyRevampingSort(arr) { return arr; }

      // Compatibility aliases for any older extension code.
      const getStarred = getRevamping;
      const toggleStar = toggleRevamping;
      const applyStarredSort = applyRevampingSort;

      // ============================================================
      // COLLAPSE / EXPAND ALL (Skin Count)
      // ============================================================
      function updateSkinCountGroupControls() {
        const groups = [...document.querySelectorAll("#skin-count-list .skin-group-details")];
        const open = groups.filter((group) => !group.classList.contains("is-collapsed")).length;
        const status = document.getElementById("skin-count-group-status");
        if (status) status.textContent = `${open}/${groups.length} groups open`;
        const collapseBtn = document.getElementById("skin-count-collapse-all");
        const expandBtn = document.getElementById("skin-count-expand-all");
        if (collapseBtn) collapseBtn.disabled = groups.length === 0 || open === 0;
        if (expandBtn) expandBtn.disabled = groups.length === 0 || open === groups.length;
      }

      function setSkinCountGroupOpen(group, open, animate = true) {
        if (!group) return;
        const content = group.querySelector(".skin-group-content");
        const arrow = group.querySelector(".group-expand-arrow");
        if (!content) return;
        const currentlyOpen = !group.classList.contains("is-collapsed");
        if (currentlyOpen === open) return;
        group.classList.toggle("is-collapsed", !open);
        if (arrow) arrow.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
        if (!animate || !content.animate) {
          content.hidden = !open;
          updateSkinCountGroupControls();
          return;
        }
        content.hidden = false;
        const full = content.scrollHeight;
        const animation = content.animate(
          open
            ? [{ height: "0px", opacity: 0 }, { height: `${full}px`, opacity: 1 }]
            : [{ height: `${full}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
        animation.onfinish = () => {
          content.hidden = !open;
          content.style.height = "";
          content.style.opacity = "";
          updateSkinCountGroupControls();
        };
      }

      function collapseAllGroups() {
        const cState = getData(KEYS.SKIN_COUNT_STATE, {});
        document.querySelectorAll("#skin-count-list .skin-group-details").forEach((group) => {
          setSkinCountGroupOpen(group, false, true);
          if (group.dataset.groupKey) cState[group.dataset.groupKey] = true;
        });
        saveData(KEYS.SKIN_COUNT_STATE, cState);
        setTimeout(updateSkinCountGroupControls, 240);
      }

      function expandAllGroups() {
        const cState = getData(KEYS.SKIN_COUNT_STATE, {});
        document.querySelectorAll("#skin-count-list .skin-group-details").forEach((group) => {
          setSkinCountGroupOpen(group, true, true);
          if (group.dataset.groupKey) cState[group.dataset.groupKey] = false;
        });
        saveData(KEYS.SKIN_COUNT_STATE, cState);
        setTimeout(updateSkinCountGroupControls, 240);
      }

      // ============================================================
      // RECENTLY ADDED (Skin Count) - skins added within 7 days
      // ============================================================
      function getSkinCollectionAddedAt(skin) {
        // V2.4 uses a dedicated immutable collection-add timestamp. Editing no
        // longer changes it. Older records fall back to array insertion order.
        return Number(skin?.collectionAddedAt || 0);
      }

      function getNewestSkinAddition() {
        const released = getSkins().filter((skin) => !skin.isStatue && skin.type !== "statue");
        const timestamped = released.filter((skin) => getSkinCollectionAddedAt(skin) > 0);
        if (timestamped.length) {
          return timestamped.reduce((latest, skin) =>
            getSkinCollectionAddedAt(skin) > getSkinCollectionAddedAt(latest) ? skin : latest
          );
        }
        // Legacy data had no stable add timestamp because edits rewrote addedAt.
        // The collection array itself preserves insertion order, so use its last
        // released skin instead of accidentally calling a recently edited skin new.
        return released[released.length - 1] || null;
      }

      function renderRecentlyAdded() {
        const section = document.getElementById("recently-added-section");
        if (!section) return;
        const skin = getNewestSkinAddition();
        if (!skin) { section.innerHTML = ""; return; }

        const imgData = getSkinImageWithFallback(skin, "icon");
        section.innerHTML = `<button type="button" class="newest-skin-card" onclick="openModal('skin','${skin.id}')">
          <span class="newest-skin-kicker"><span class="material-symbols-outlined">new_releases</span>Newest Addition</span>
          <span class="newest-skin-main"><img src="${imgData.src || IMAGE_PLACEHOLDER}" data-fallback-src="${IMAGE_PLACEHOLDER}" alt=""><span><strong>${skin.name}</strong><small>${skin.rarity || skin.collectible || "Skin"}</small></span></span>
          <span class="new-badge">New</span>
        </button>`;
      }

      // ============================================================
      // PAINTED SKIN POPUP SYSTEM
      // ============================================================
      let paintedPopupState = { timer: null, idx: 0, skins: [], el: null };

      function showPaintedPopup(e, skins, pill) {
        e.stopPropagation();
        // Disable default tooltip for this area
        let popup = document.getElementById("painted-popup-global");
        if (!popup) {
          popup = document.createElement("div");
          popup.id = "painted-popup-global";
          popup.className = "painted-popup";
          popup.innerHTML = `<img class="painted-popup-img" alt="Painted skin preview" /><div class="painted-popup-name"></div><div class="painted-popup-dots"></div>`;
          document.body.appendChild(popup);
        }
        paintedPopupState.skins = skins;
        paintedPopupState.idx = 0;
        paintedPopupState.el = pill;
        updatePaintedPopup(popup, skins, 0);
        positionPaintedPopup(popup, e);
        popup.classList.add("visible");
        popup.style.display = "block";

        // Cycle every 1.5s
        clearInterval(paintedPopupState.timer);
        if (skins.length > 1) {
          paintedPopupState.timer = setInterval(() => {
            paintedPopupState.idx = (paintedPopupState.idx + 1) % skins.length;
            updatePaintedPopup(popup, skins, paintedPopupState.idx);
          }, 1500);
        }
      }

      function hidePaintedPopup() {
        clearInterval(paintedPopupState.timer);
        const popup = document.getElementById("painted-popup-global");
        if (popup) {
          popup.classList.remove("visible");
          popup.style.display = "none";
        }
      }

      function updatePaintedPopup(popup, skins, idx) {
        const skin = skins[idx];
        const img = popup.querySelector(".painted-popup-img");
        img.src = skin.splashArt || skin.splash || IMAGE_PLACEHOLDER;
        img.style.filter = skin.isGreyed
          ? "grayscale(100%) opacity(0.6)"
          : "none";
        popup.querySelector(".painted-popup-name").textContent =
          skin.name || "";
        const dotsEl = popup.querySelector(".painted-popup-dots");
        dotsEl.innerHTML = skins
          .map(
            (_, i) =>
              `<div class="painted-popup-dot ${i === idx ? "active" : ""}"></div>`,
          )
          .join("");
      }

      function positionPaintedPopup(popup, e) {
        let x = e.clientX + 15,
          y = e.clientY + 15;
        popup.style.left = x + "px";
        popup.style.top = y + "px";
        popup.style.display = "block";
        const rect = popup.getBoundingClientRect();
        if (rect.right > window.innerWidth) x = e.clientX - rect.width - 15;
        if (rect.bottom > window.innerHeight) y = e.clientY - rect.height - 15;
        popup.style.left = x + "px";
        popup.style.top = y + "px";
      }

      document.addEventListener("mousemove", (e) => {
        const popup = document.getElementById("painted-popup-global");
        if (popup && popup.style.display === "block") {
          let x = e.clientX + 15,
            y = e.clientY + 15;
          const rect = popup.getBoundingClientRect();
          if (x + popup.offsetWidth > window.innerWidth)
            x = e.clientX - popup.offsetWidth - 15;
          if (y + popup.offsetHeight > window.innerHeight)
            y = e.clientY - popup.offsetHeight - 15;
          popup.style.left = x + "px";
          popup.style.top = y + "px";
        }
      });

      // ============================================================
      // SKIN COUNT PIE CHART
      // ============================================================
      let skinCountChartInstance = null;

      function toggleSkinCountChart() {
        const container = document.getElementById("skin-count-chart-container");
        const label = document.getElementById("view-stats-label");
        const btn = document.getElementById("view-stats-btn");
        const isVisible = container.style.display !== "none";

        if (isVisible) {
          container.style.display = "none";
          label.textContent = "View Stats";
          btn.querySelector(".material-symbols-outlined").textContent =
            "pie_chart";
          if (skinCountChartInstance) {
            skinCountChartInstance.destroy();
            skinCountChartInstance = null;
          }
        } else {
          container.style.display = "block";
          label.textContent = "Hide Stats";
          btn.querySelector(".material-symbols-outlined").textContent = "close";
          const data = renderSkinCountPage._chartData || [];
          drawSkinCountChart(data);
        }
      }

      function drawSkinCountChart(data) {
        const canvas = document.getElementById("skin-count-chart");
        const legend = document.getElementById("skin-count-chart-legend");
        if (!canvas) return;
        const items = data.filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
        if (!items.length) {
          if (legend) legend.innerHTML = '<div class="chart-empty">No data to chart.</div>';
          return;
        }
        if (skinCountChartInstance) skinCountChartInstance.destroy();
        const total = items.reduce((sum, item) => sum + item.count, 0);
        const palette = [
          "#fbbf24", "#60a5fa", "#34d399", "#c084fc", "#fb7185", "#22d3ee",
          "#fb923c", "#a3e635", "#818cf8", "#f472b6", "#2dd4bf", "#facc15"
        ];
        const colors = items.map((_, i) => palette[i % palette.length]);
        const state = { activeIndex: -1 };

        if (legend) {
          legend.innerHTML = items.map((item, index) => {
            const pct = total ? ((item.count / total) * 100).toFixed(1) : "0.0";
            return `<button type="button" class="skin-chart-legend-item" data-chart-index="${index}">
              <span class="skin-chart-swatch" style="background:${colors[index]}"></span>
              <span class="skin-chart-legend-copy"><strong>${item.label}</strong><small>${item.count} skins · ${pct}%</small></span>
            </button>`;
          }).join("");
        }

        const centerPlugin = {
          id: "skinCountCenter",
          afterDraw(chart) {
            const meta = chart.getDatasetMeta(0);
            if (!meta?.data?.[0]) return;
            const { x, y } = meta.data[0];
            const ctx = chart.ctx;
            const idx = state.activeIndex;
            const main = idx >= 0 ? String(items[idx].count) : String(total);
            const sub = idx >= 0 ? items[idx].label : "Total skins";
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#f8fafc";
            ctx.font = '800 28px Montserrat, sans-serif';
            ctx.fillText(main, x, y - 7);
            ctx.fillStyle = "#94a3b8";
            ctx.font = '600 11px Montserrat, sans-serif';
            const label = sub.length > 22 ? sub.slice(0, 21) + "…" : sub;
            ctx.fillText(label, x, y + 20);
            ctx.restore();
          }
        };

        skinCountChartInstance = new Chart(canvas, {
          type: "doughnut",
          data: { labels: items.map((d) => d.label), datasets: [{
            data: items.map((d) => d.count),
            backgroundColor: colors,
            borderColor: "#111827",
            borderWidth: 4,
            hoverBorderColor: "#f8fafc",
            hoverBorderWidth: 3,
            hoverOffset: 8,
            borderRadius: 5,
            spacing: 2
          }]},
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            layout: { padding: 10 },
            animation: { duration: 520, easing: "easeOutQuart" },
            onHover(event, elements) {
              state.activeIndex = elements?.length ? elements[0].index : -1;
              if (event.native?.target) event.native.target.style.cursor = elements?.length ? "pointer" : "default";
              skinCountChartInstance?.draw();
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(15,23,42,.97)",
                borderColor: "rgba(251,191,36,.28)",
                borderWidth: 1,
                padding: 11,
                cornerRadius: 10,
                displayColors: true,
                callbacks: {
                  label(context) {
                    const count = context.parsed;
                    const pct = total ? ((count / total) * 100).toFixed(1) : "0.0";
                    return `${count} skins (${pct}%)`;
                  }
                }
              }
            }
          },
          plugins: [centerPlugin]
        });

        if (legend) {
          legend.querySelectorAll(".skin-chart-legend-item").forEach((button) => {
            const idx = Number(button.dataset.chartIndex);
            button.addEventListener("mouseenter", () => {
              state.activeIndex = idx;
              skinCountChartInstance.setActiveElements([{ datasetIndex: 0, index: idx }]);
              skinCountChartInstance.update("none");
            });
            button.addEventListener("mouseleave", () => {
              state.activeIndex = -1;
              skinCountChartInstance.setActiveElements([]);
              skinCountChartInstance.update("none");
            });
          });
        }
      }

      function normalizeReleaseDate(raw) {
        if (!raw || !raw.trim()) return "";
        const s = raw.trim();

        const MONTHS = [
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
        const ABBR = MONTHS.map((m) => m.slice(0, 3));

        // Helper: get month index (0-based) from a string token
        function parseMonth(tok) {
          const t = tok.toLowerCase();
          const full = MONTHS.findIndex((m) => m.toLowerCase() === t);
          if (full !== -1) return full;
          const abbr = ABBR.findIndex((a) => a.toLowerCase() === t);
          if (abbr !== -1) return abbr;
          // numeric month
          const n = parseInt(tok);
          if (!isNaN(n) && n >= 1 && n <= 12) return n - 1;
          return -1;
        }

        // Helper: format month index to 3-letter abbr
        function fmt(mi) {
          return ABBR[mi];
        }

        // ── Pattern matching ──

        // Already looks like "Mon DD, YYYY" or "Mon YYYY" — pass through if valid
        const alreadyFull = s.match(
          /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
        );
        if (alreadyFull) {
          const mi = parseMonth(alreadyFull[1]);
          if (mi !== -1) {
            const day = parseInt(alreadyFull[2]);
            return `${fmt(mi)} ${String(day).padStart(2, "0")}, ${alreadyFull[3]}`;
          }
        }

        const alreadyMonthYear = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
        if (alreadyMonthYear) {
          const mi = parseMonth(alreadyMonthYear[1]);
          if (mi !== -1) return `${fmt(mi)} ${alreadyMonthYear[2]}`;
        }

        // Pure 4-digit year
        if (/^\d{4}$/.test(s)) return s;

        // YYYY-MM-DD  or  YYYY/MM/DD
        const isoFull = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (isoFull) {
          const mi = parseInt(isoFull[2]) - 1;
          const day = parseInt(isoFull[3]);
          if (mi >= 0 && mi < 12)
            return `${fmt(mi)} ${String(day).padStart(2, "0")}, ${isoFull[1]}`;
        }

        // YYYY-MM  or  YYYY/MM
        const isoMonthYear = s.match(/^(\d{4})[-\/](\d{1,2})$/);
        if (isoMonthYear) {
          const mi = parseInt(isoMonthYear[2]) - 1;
          if (mi >= 0 && mi < 12) return `${fmt(mi)} ${isoMonthYear[1]}`;
        }

        // MM/DD/YYYY  or  MM-DD-YYYY
        const usDate = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (usDate) {
          const mi = parseInt(usDate[1]) - 1;
          const day = parseInt(usDate[2]);
          if (mi >= 0 && mi < 12)
            return `${fmt(mi)} ${String(day).padStart(2, "0")}, ${usDate[3]}`;
        }

        // DD Month YYYY  (e.g. "5 June 2023", "05 Jun 2023")
        const dayMonthYear = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
        if (dayMonthYear) {
          const mi = parseMonth(dayMonthYear[2]);
          const day = parseInt(dayMonthYear[1]);
          if (mi !== -1)
            return `${fmt(mi)} ${String(day).padStart(2, "0")}, ${dayMonthYear[3]}`;
        }

        // Month DD YYYY  (no comma, e.g. "June 5 2023")
        const monthDayYear = s.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/);
        if (monthDayYear) {
          const mi = parseMonth(monthDayYear[1]);
          const day = parseInt(monthDayYear[2]);
          if (mi !== -1)
            return `${fmt(mi)} ${String(day).padStart(2, "0")}, ${monthDayYear[3]}`;
        }

        // Month YYYY (numeric month, e.g. "6 2023" or "06/2023")
        const numMonthYear = s.match(/^(\d{1,2})[\/\s](\d{4})$/);
        if (numMonthYear) {
          const mi = parseInt(numMonthYear[1]) - 1;
          if (mi >= 0 && mi < 12) return `${fmt(mi)} ${numMonthYear[2]}`;
        }

        // Just a month name alone → keep as-is (e.g. "June")
        const justMonth =
          MONTHS.find((m) => m.toLowerCase() === s.toLowerCase()) ||
          ABBR.find((a) => a.toLowerCase() === s.toLowerCase());
        if (justMonth) return justMonth.slice(0, 3);

        // Can't parse — return the original trimmed
        return s;
      }

      // ============================================================
      // SKILL CYCLING — hover only (no background timers)
      // ============================================================
      const _skillCycleTimers = new Map();

      function startSkillCycle(wrapper) {
        if (_skillCycleTimers.has(wrapper)) return;
        try {
          const variants = JSON.parse(
            decodeURIComponent(wrapper.dataset.skillVariants || "%5B%5D"),
          );
          if (variants.length <= 1) return;
          const img = wrapper.querySelector("img");
          if (!img) return;
          const parentIcon = variants[0].icon || "";
          let idx = 0;
          const interval = setInterval(() => {
            idx = (idx + 1) % variants.length;
            const v = variants[idx];
            img.src = v.icon || "";
            img.style.filter = v.greyed ? "grayscale(100%) opacity(0.45)" : "";
            wrapper.dataset.skillName = v.name || "";
            // Live-update the floating tooltip if it's tracking this wrapper
            const tip = document.getElementById("skill-strip-tip");
            if (tip && tip._forWrapper === wrapper) {
              tip.textContent = wrapper.dataset.skillName;
            }
          }, 800);
          _skillCycleTimers.set(wrapper, interval);
        } catch (e) {}
      }

      function stopSkillCycle(wrapper) {
        const t = _skillCycleTimers.get(wrapper);
        if (t) clearInterval(t);
        _skillCycleTimers.delete(wrapper);
        try {
          const variants = JSON.parse(
            decodeURIComponent(wrapper.dataset.skillVariants || "%5B%5D"),
          );
          if (variants.length > 0) {
            const img = wrapper.querySelector("img");
            if (img) {
              img.src = variants[0].icon || "";
              img.style.filter = variants[0].greyed
                ? "grayscale(100%) opacity(0.45)"
                : "";
            }
            wrapper.dataset.skillName = variants[0].name || "";
          }
        } catch (e) {}
      }

      function initAllSkillCycles() {
        /* no-op — hover driven */
      }
      function startAutoSkillCycle() {
        /* no-op */
      }

      // ============================================================
      // SKILL STRIP CURSOR TOOLTIP
      // ============================================================
      (function () {
        let skillTip = null;
        function getOrCreateTip() {
          if (!skillTip) {
            skillTip = document.createElement("div");
            skillTip.id = "skill-strip-tip";
            skillTip.style.cssText =
              'position:fixed;z-index:9999;background:rgba(2,6,23,0.96);color:#f8fafc;font-family:"Montserrat",sans-serif;font-size:0.65rem;font-weight:700;padding:4px 9px;border-radius:8px;white-space:nowrap;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.6);border:1px solid rgba(251,191,36,0.25);display:none;';
            document.body.appendChild(skillTip);
          }
          return skillTip;
        }
        document.addEventListener("mouseover", (e) => {
          const w = e.target.closest(".card-skill-strip-wrapper");
          if (w && w.dataset.skillName) {
            const tip = getOrCreateTip();
            tip.textContent = w.dataset.skillName;
            tip._forWrapper = w;
            tip.style.display = "block";
          }
        });
        document.addEventListener("mousemove", (e) => {
          if (!skillTip || skillTip.style.display === "none") return;
          if (skillTip._forWrapper)
            skillTip.textContent = skillTip._forWrapper.dataset.skillName || "";
          let x = e.clientX + 14,
            y = e.clientY - 32;
          if (x + skillTip.offsetWidth > window.innerWidth)
            x = e.clientX - skillTip.offsetWidth - 14;
          if (y < 8) y = e.clientY + 14;
          skillTip.style.left = x + "px";
          skillTip.style.top = y + "px";
        });
        document.addEventListener("mouseout", (e) => {
          if (
            e.target.closest(".card-skill-strip-wrapper") &&
            !e.relatedTarget?.closest(".card-skill-strip-wrapper")
          ) {
            if (skillTip) {
              skillTip.style.display = "none";
              skillTip._forWrapper = null;
            }
          }
        });
      })();

      function toggleSkinSkillDisplay() {
        const checked = document.getElementById("skin-show-skills").checked;
        document.getElementById("skin-skill-override-panel").style.display =
          checked ? "block" : "none";
      }

      // Modal skill cycling (hover)
      const _modalSkillTimers = new Map();
      function startModalSkillCycle(el) {
        if (_modalSkillTimers.has(el)) return;
        try {
          const variants = JSON.parse(
            decodeURIComponent(el.dataset.skillVariants || "%5B%5D"),
          );
          if (variants.length <= 1) return;
          const img = el.querySelector(".skill-icon");
          const nameEl = el.querySelector(".skill-name");
          const dots = el.querySelectorAll(".modal-skill-dot");
          let idx = 0;
          const tick = () => {
            idx = (idx + 1) % variants.length;
            const v = variants[idx];
            // Icon: use variant icon, or greyed parent icon if empty
            if (v.icon) {
              img.src = v.icon;
              img.style.filter = v.greyed
                ? "grayscale(100%) opacity(0.45)"
                : "";
            } else {
              // fallback to parent (idx=0)
              img.src = variants[0].icon || "";
              img.style.filter = "grayscale(100%) opacity(0.45)";
            }
            if (nameEl) nameEl.textContent = v.name || variants[0].name;
            dots.forEach((d, i) => {
              d.style.background =
                i === idx ? "var(--accent)" : "rgba(255,255,255,0.25)";
            });
          };
          const timer = setInterval(tick, 800);
          _modalSkillTimers.set(el, timer);
        } catch (e) {}
      }
      function stopModalSkillCycle(el) {
        const t = _modalSkillTimers.get(el);
        if (t) clearInterval(t);
        _modalSkillTimers.delete(el);
        try {
          const variants = JSON.parse(
            decodeURIComponent(el.dataset.skillVariants || "%5B%5D"),
          );
          const v = variants[0];
          const img = el.querySelector(".skill-icon");
          const nameEl = el.querySelector(".skill-name");
          const dots = el.querySelectorAll(".modal-skill-dot");
          if (img) {
            img.src = v?.icon || "";
            img.style.filter = v?.greyed ? "grayscale(100%) opacity(0.45)" : "";
          }
          if (nameEl) nameEl.textContent = v?.name || "";
          dots.forEach((d, i) => {
            d.style.background =
              i === 0 ? "var(--accent)" : "rgba(255,255,255,0.25)";
          });
        } catch (e) {}
      }

      // Global cleanup for drag indicators (handles Escape / cancelled drags)
      document.addEventListener("dragend", () => {
        document
          .querySelectorAll(".tier-drop-indicator")
          .forEach((el) => el.remove());
        document
          .querySelectorAll(".tier-content")
          .forEach((el) => el.classList.remove("drag-over"));
        document
          .querySelectorAll(".drag-over-pool")
          .forEach((el) => el.classList.remove("drag-over-pool"));
      });
