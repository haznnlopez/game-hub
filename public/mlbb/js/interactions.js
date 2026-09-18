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
      // STAR SYSTEM
      // ============================================================
      function getStarred() {
        try {
          return JSON.parse(DB.getItem("mlbb_starred") || "{}");
        } catch (e) {
          return {};
        }
      }
      function saveStarred(d) {
        safeLocalStorageSet("mlbb_starred", JSON.stringify(d));
      }
      function isStarred(id) {
        return !!getStarred()[id];
      }
      function toggleStar(id, renderFn) {
        const s = getStarred();
        if (s[id]) delete s[id];
        else s[id] = true;
        saveStarred(s);
        renderFn();
      }

      function applyStarredSort(arr) {
        const starred = getStarred();
        return [
          ...arr.filter((x) => starred[x.id]),
          ...arr.filter((x) => !starred[x.id]),
        ];
      }

      // ============================================================
      // COLLAPSE / EXPAND ALL (Skin Count)
      // ============================================================
      function collapseAllGroups() {
        const cState = getData(KEYS.SKIN_COUNT_STATE, {});
        document.querySelectorAll(".skin-group-details").forEach((d) => {
          const con = d.querySelector(".skin-group-content");
          const arrow = d.querySelector(
            ".skin-group-summary .group-expand-arrow",
          );
          if (con) con.style.display = "none";
          if (arrow) arrow.style.transform = "rotate(0deg)";
        });
        // Mark all as closed in state
        const keys = Object.keys(cState);
        // Get all current group keys from DOM
        document.querySelectorAll(".skin-group-summary").forEach((s) => {
          const title = s.querySelector(".group-title");
          if (title) {
            // find key from rendered groups
          }
        });
        // Rebuild state: just set all visible groups as closed
        renderSkinCountPage._lastGroupKeys &&
          renderSkinCountPage._lastGroupKeys.forEach((k) => {
            cState[k] = true;
          });
        saveData(KEYS.SKIN_COUNT_STATE, cState);
      }

      function expandAllGroups() {
        const cState = getData(KEYS.SKIN_COUNT_STATE, {});
        document.querySelectorAll(".skin-group-details").forEach((d) => {
          const con = d.querySelector(".skin-group-content");
          const arrow = d.querySelector(
            ".skin-group-summary .group-expand-arrow",
          );
          if (con) con.style.display = "block";
          if (arrow) arrow.style.transform = "rotate(180deg)";
        });
        renderSkinCountPage._lastGroupKeys &&
          renderSkinCountPage._lastGroupKeys.forEach((k) => {
            cState[k] = false;
          });
        saveData(KEYS.SKIN_COUNT_STATE, cState);
      }

      // ============================================================
      // RECENTLY ADDED (Skin Count) - skins added within 7 days
      // ============================================================
      function renderRecentlyAdded() {
        const section = document.getElementById("recently-added-section");
        if (!section) return;
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const skins = getSkins().filter(
          (x) => !x.isStatue && x.type !== "statue",
        );
        // "New" skins: those with addedAt timestamp within a week
        const recent = skins.filter(
          (x) => x.firstAddedAt && now - x.firstAddedAt <= oneWeek,
        );

        if (recent.length === 0) {
          section.innerHTML = "";
          return;
        }

        const isOpen = !getData("mlbb_recently_collapsed", false);

        section.innerHTML = "";
        const dropdown = document.createElement("div");
        dropdown.className = "recently-added-dropdown";

        const summary = document.createElement("div");
        summary.className = "recently-added-summary";
        summary.innerHTML = `<span style="font-weight:700;color:var(--danger);display:flex;align-items:center;gap:0.5rem;"><span class="material-symbols-outlined" style="font-size:18px;">new_releases</span> Recently Added <span style="background:var(--danger);color:white;font-size:0.7rem;padding:2px 7px;border-radius:10px;margin-left:4px;">${recent.length}</span></span><span class="material-symbols-outlined recently-expand-arrow" style="transition:transform 0.3s;transform:${isOpen ? "rotate(180deg)" : "rotate(0deg)"}">expand_more</span>`;

        const contentDiv = document.createElement("div");
        contentDiv.className = "recently-added-content";
        contentDiv.style.display = isOpen ? "flex" : "none";

        recent.forEach((skin) => {
          const wrapper = document.createElement("div");
          wrapper.style.cssText = "position:relative;cursor:pointer;";

          const icon = document.createElement("div");
          const imgData = getSkinImageWithFallback(skin, "icon");
          const raritySlug = (skin.collectible || skin.rarity || "")
            .toLowerCase()
            .replace(/\s+/g, "-");
          icon.className = `icon-item rarity-${raritySlug}`;
          if (imgData.src) {
            icon.style.backgroundImage = `url('${imgData.src}')`;
            if (imgData.isGreyed) {
              icon.style.filter = "grayscale(100%) opacity(0.5)";
            }
          }
          icon.dataset.tooltip = skin.name;

          const badge = document.createElement("span");
          badge.className = "new-badge";
          badge.textContent = "New";

          wrapper.appendChild(icon);
          wrapper.appendChild(badge);

          // Clicking navigates to the hero group in skin count and reveals the skin
          wrapper.onclick = () => {
            const by = document.getElementById("filter-count-sort").value;
            if (by !== "hero")
              document.getElementById("filter-count-sort").value = "hero";
            renderSkinCountPage();
            setTimeout(() => {
              // Find the icon with matching skinId in the rendered list
              const skinIcon = document.querySelector(
                `.icon-item[data-skin-id="${skin.id}"]`,
              );
              if (skinIcon) {
                const groupDetails = skinIcon.closest(".skin-group-details");
                if (groupDetails) {
                  const con = groupDetails.querySelector(".skin-group-content");
                  const arrow = groupDetails.querySelector(
                    ".skin-group-summary .group-expand-arrow",
                  );
                  if (con) con.style.display = "block";
                  if (arrow) arrow.style.transform = "rotate(180deg)";
                  groupDetails.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // Flash highlight the icon
                  skinIcon.style.outline = "3px solid var(--danger)";
                  skinIcon.style.outlineOffset = "3px";
                  setTimeout(() => {
                    skinIcon.style.outline = "";
                    skinIcon.style.outlineOffset = "";
                  }, 1500);
                }
              }
            }, 150);
          };

          contentDiv.appendChild(wrapper);
        });

        summary.onclick = () => {
          const open = contentDiv.style.display !== "none";
          contentDiv.style.display = open ? "none" : "flex";
          summary.querySelector("span:last-child").style.transform = open
            ? "rotate(0deg)"
            : "rotate(180deg)";
          saveData("mlbb_recently_collapsed", open);
        };

        dropdown.appendChild(summary);
        dropdown.appendChild(contentDiv);
        section.appendChild(dropdown);
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
        if (!canvas) return;

        // Filter out zero-count groups, sort by count desc
        const items = data
          .filter((d) => d.count > 0)
          .sort((a, b) => b.count - a.count);
        if (items.length === 0) return;

        // Destroy existing chart + clear any cycling timer
        if (skinCountChartInstance) {
          skinCountChartInstance.destroy();
          skinCountChartInstance = null;
        }
        if (window._chartCycleTimer) {
          clearInterval(window._chartCycleTimer);
          window._chartCycleTimer = null;
        }

        const total = items.reduce((s, d) => s + d.count, 0);

        // Pre-load all splash images as Image objects per group
        const groupImages = items.map((item) => {
          const imgs = (item.splashUrls || []).map((url) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            return img;
          });
          return imgs;
        });

        // State for the center cycling display
        const cycleState = {
          activeIndex: -1, // which group segment is hovered (-1 = none)
          frameIndex: 0, // which image in the group we're showing
          opacity: 0, // for fade transition
          fadingIn: false,
        };

        // Palette
        const basePalette = [
          "#fbbf24",
          "#ef4444",
          "#3b82f6",
          "#22c55e",
          "#a855f7",
          "#f472b6",
          "#06b6d4",
          "#f97316",
          "#84cc16",
          "#8b5cf6",
          "#ec4899",
          "#14b8a6",
          "#eab308",
          "#6366f1",
          "#10b981",
          "#f43f5e",
          "#0ea5e9",
          "#d946ef",
          "#fb923c",
          "#4ade80",
          "#c084fc",
          "#38bdf8",
          "#facc15",
          "#f87171",
        ];
        const palette = items.map((_, i) =>
          i < basePalette.length
            ? basePalette[i]
            : `hsl(${(i * 137.508) % 360},70%,58%)`,
        );

        // ── Custom plugin: draws cycling skin splash art in the doughnut hole ──
        const centerImagePlugin = {
          id: "centerImage",

          // Compute the hole geometry once after layout
          _getHole(chart) {
            const { chartArea, data } = chart;
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || !meta.data[0]) return null;
            const arc = meta.data[0];
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            // innerRadius is the hole edge
            const r = arc.innerRadius * 0.88; // slight inset so we don't overlap the ring
            return { cx, cy, r };
          },

          afterDraw(chart) {
            const { activeIndex, frameIndex, opacity } = cycleState;
            if (activeIndex < 0 || opacity <= 0) return;

            const hole = this._getHole(chart);
            if (!hole) return;
            const { cx, cy, r } = hole;

            const imgs = groupImages[activeIndex];
            if (!imgs || imgs.length === 0) return;
            const img = imgs[frameIndex % imgs.length];
            if (!img.complete || img.naturalWidth === 0) return;

            const ctx = chart.ctx;
            ctx.save();

            // Clip to circle
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();

            // Draw image cover-fit inside circle
            const iw = img.naturalWidth,
              ih = img.naturalHeight;
            const scale = Math.max((r * 2) / iw, (r * 2) / ih);
            const dw = iw * scale,
              dh = ih * scale;
            const dx = cx - dw / 2,
              dy = cy - dh / 2;

            ctx.globalAlpha = Math.min(1, opacity);
            ctx.drawImage(img, dx, dy, dw, dh);

            // Subtle dark vignette around edges so it blends with the ring
            const grad = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
            grad.addColorStop(0, "rgba(15,23,42,0)");
            grad.addColorStop(1, "rgba(15,23,42,0.55)");
            ctx.globalAlpha = Math.min(1, opacity);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          },
        };

        // ── Fade + cycle animation loop ──
        let rafId = null;
        let lastFrame = 0;
        let cycleInterval = 1600; // ms per skin image

        function ensureAnimLoop() {
          if (rafId === null) rafId = requestAnimationFrame(animLoop);
        }

        function animLoop(ts) {
          rafId = null;
          const chart = skinCountChartInstance;
          if (!chart) return;
          let keepAnimating = false;

          if (cycleState.activeIndex >= 0) {
            keepAnimating = true;
            // Fade in
            if (cycleState.opacity < 1) {
              cycleState.opacity = Math.min(1, cycleState.opacity + 0.06);
              chart.render();
            }
            // Cycle image
            if (ts - lastFrame > cycleInterval) {
              const imgs = groupImages[cycleState.activeIndex] || [];
              if (imgs.length > 1) {
                cycleState.frameIndex =
                  (cycleState.frameIndex + 1) % imgs.length;
                cycleState.opacity = 0.15; // brief dip for transition feel
              }
              lastFrame = ts;
              chart.render();
            }
          } else if (cycleState.opacity > 0) {
            // Fade out, then fully stop the RAF while idle.
            cycleState.opacity = Math.max(0, cycleState.opacity - 0.08);
            chart.render();
            keepAnimating = cycleState.opacity > 0;
          }

          if (keepAnimating) rafId = requestAnimationFrame(animLoop);
        }

        skinCountChartInstance = new Chart(canvas, {
          type: "doughnut",
          data: {
            labels: items.map((d) => d.label),
            datasets: [
              {
                data: items.map((d) => d.count),
                backgroundColor: palette,
                borderColor: "rgba(15,23,42,0.8)",
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverBorderColor: "#fff",
                hoverOffset: 12,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: "60%",
            layout: { padding: 16 },
            animation: {
              animateRotate: true,
              duration: 700,
              easing: "easeInOutQuart",
            },
            onHover(event, elements) {
              if (elements && elements.length > 0) {
                const idx = elements[0].index;
                if (cycleState.activeIndex !== idx) {
                  cycleState.activeIndex = idx;
                  cycleState.frameIndex = 0;
                  cycleState.opacity = 0;
                  lastFrame = 0;
                  ensureAnimLoop();
                } else {
                  ensureAnimLoop();
                }
              } else {
                cycleState.activeIndex = -1;
                ensureAnimLoop();
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: false,
                external(context) {
                  let el = document.getElementById("skin-chart-tooltip");
                  if (!el) {
                    el = document.createElement("div");
                    el.id = "skin-chart-tooltip";
                    el.style.cssText =
                      "position:fixed;pointer-events:none;z-index:9999;background:rgba(15,23,42,0.97);border:1px solid rgba(251,191,36,0.35);border-radius:12px;padding:10px 14px;font-family:Montserrat,sans-serif;font-size:12px;color:#f8fafc;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:opacity 0.15s;";
                    document.body.appendChild(el);
                  }
                  const { tooltip } = context;
                  if (tooltip.opacity === 0) {
                    el.style.opacity = "0";
                    return;
                  }
                  const title = tooltip.title?.[0] || "";
                  const body = tooltip.body?.[0]?.lines?.[0] || "";
                  el.innerHTML = `<div style="color:#fbbf24;font-weight:700;font-size:13px;margin-bottom:4px;">${title}</div><div>${body}</div>`;
                  el.style.opacity = "1";
                  // Position to the right of cursor, outside the chart
                  const x =
                    tooltip.caretX +
                    context.chart.canvas.getBoundingClientRect().left +
                    20;
                  const y =
                    tooltip.caretY +
                    context.chart.canvas.getBoundingClientRect().top -
                    el.offsetHeight / 2;
                  const safeX = Math.min(
                    x,
                    window.innerWidth - el.offsetWidth - 16,
                  );
                  const safeY = Math.max(
                    8,
                    Math.min(y, window.innerHeight - el.offsetHeight - 8),
                  );
                  el.style.left = safeX + "px";
                  el.style.top = safeY + "px";
                },
                callbacks: {
                  title(it) {
                    return it[0]?.label || "";
                  },
                  label(it) {
                    const count = it.parsed;
                    const pct =
                      total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                    return `  ${count} skins  (${pct}%)`;
                  },
                },
              },
            },
          },
          plugins: [centerImagePlugin],
        });

        // Cleanup RAF and external tooltip when chart is destroyed
        const origDestroy = skinCountChartInstance.destroy.bind(
          skinCountChartInstance,
        );
        skinCountChartInstance.destroy = () => {
          if (rafId !== null) cancelAnimationFrame(rafId);
          const tt = document.getElementById("skin-chart-tooltip");
          if (tt) tt.remove();
          origDestroy();
        };
      }

      // ============================================================
      // SMART DATE NORMALIZER
      // Target display format: Mon DD, YYYY  (e.g. "Jun 05, 2023")
      // Partial inputs accepted: year only → "2024"
      //                          month + year → "Jun 2023"
      //                          full → "Jun 05, 2023"
      // ============================================================
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
