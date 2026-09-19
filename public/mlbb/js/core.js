      const APP_VERSION = "2.11.2";

      const KEYS = {
        HEROES: "game_hub_mlbb_heroes",
        SKINS: "game_hub_mlbb_skins",
        ATTRIBUTES: "game_hub_mlbb_attributes",
        ATTRIBUTES_BACKUP: "game_hub_mlbb_attributes_backup",
        TIER_LIST: "game_hub_mlbb_tier_list",
        TIER_SNAPSHOTS: "game_hub_mlbb_tier_snapshots",
        SIDEBAR: "game_hub_mlbb_sidebar_collapsed",
        UPCOMING: "game_hub_mlbb_upcoming",
        SKIN_COUNT_STATE: "game_hub_mlbb_skin_count_state",
      };

      // ============================================================
      // DB — server-backed replacement for localStorage.
      // All app data (heroes, skins, attributes, tier list, etc.) now
      // lives in a PostgreSQL database on the server instead of the
      // browser, so it's shared, persistent, and not capped by the
      // browser's ~5-10MB localStorage quota. Reads are public; writes
      // require an admin login (see ADMIN below).
      //
      // The interface intentionally mirrors localStorage.getItem /
      // setItem so the rest of the app (getData/saveData and a handful
      // of direct call sites) barely had to change.
      // ============================================================
      const DB = {
        _cache: {},
        _loaded: false,
        _token: null,
        async init() {
          this._token = window.localStorage.getItem("mlbb_admin_token") || null;
          try {
            const res = await fetch("/api/data");
            if (res.ok) this._cache = await res.json();
          } catch (e) {
            console.error("Failed to load data from server:", e);
          }
          this._loaded = true;
        },
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._cache, key)
            ? this._cache[key]
            : null;
        },
        setItem(key, value) {
          if (!this._token) {
            showToast("Sign in as admin to save changes", "info");
            openAdminLoginModal();
            return false;
          }
          const prev = this._cache[key];
          this._cache[key] = value;
          fetch("/api/data/" + encodeURIComponent(key), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + this._token,
            },
            body: JSON.stringify({ value }),
          })
            .then(async (res) => {
              if (!res.ok) {
                this._cache[key] = prev; // revert optimistic update
                if (res.status === 401) {
                  showToast("Session expired — please log in again", "info");
                  this._token = null;
                  window.localStorage.removeItem("mlbb_admin_token");
                  updateAdminUI();
                } else if (res.status === 413) {
                  showToast(
                    `"${key}" is too large for the server to accept (HTTP 413) — increase the backend's request body size limit`,
                    "info",
                  );
                  console.error("Save failed (413, too large):", key);
                } else {
                  showToast("Save failed — see console for details", "info");
                  console.error(
                    "Save failed:",
                    key,
                    res.status,
                    await res.text(),
                  );
                }
              }
            })
            .catch((e) => {
              this._cache[key] = prev;
              console.error("Network error saving:", key, e);
              showToast("Network error — change was not saved", "info");
            });
          return true;
        },
        // Awaits the real server response instead of the fire-and-forget
        // path above. Use for bulk ops (like backup restore) where you need
        // to know which keys truly failed before doing anything else (e.g.
        // reloading the page).
        async setItemAwaited(key, value) {
          if (!this._token) {
            showToast("Sign in as admin to save changes", "info");
            openAdminLoginModal();
            return false;
          }
          const prev = this._cache[key];
          this._cache[key] = value;
          try {
            const res = await fetch("/api/data/" + encodeURIComponent(key), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + this._token,
              },
              body: JSON.stringify({ value }),
            });
            if (!res.ok) {
              this._cache[key] = prev;
              const bodyText = await res.text().catch(() => "");
              console.error(
                "Save failed for key",
                key,
                "status",
                res.status,
                bodyText,
              );
              if (res.status === 401) {
                showToast("Session expired — please log in again", "info");
                this._token = null;
                window.localStorage.removeItem("mlbb_admin_token");
                updateAdminUI();
              } else if (res.status === 413) {
                showToast(
                  `"${key}" is too large for the server to accept (HTTP 413) — increase the backend's request body size limit`,
                  "info",
                );
              }
              return false;
            }
            return true;
          } catch (e) {
            this._cache[key] = prev;
            console.error("Network error saving:", key, e);
            return false;
          }
        },
        removeItem(key) {
          return this.setItem(key, null);
        },
        get length() {
          return Object.keys(this._cache).length;
        },
        key(i) {
          return Object.keys(this._cache)[i];
        },
      };

      const ADMIN = {
        get isAdmin() {
          return !!DB._token;
        },
        async login(password) {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Login failed");
          }
          const { token } = await res.json();
          DB._token = token;
          window.localStorage.setItem("mlbb_admin_token", token);
          updateAdminUI();
        },
        logout() {
          DB._token = null;
          window.localStorage.removeItem("mlbb_admin_token");
          updateAdminUI();
          showToast("Signed out", "success");
        },
      };

      function updateAdminUI() {
        document.body.classList.toggle("is-admin", ADMIN.isAdmin);
        const btn = document.getElementById("admin-auth-btn");
        if (btn) {
          btn.querySelector(".admin-auth-label").textContent = ADMIN.isAdmin
            ? "Sign Out"
            : "Admin Sign In";
          btn.querySelector(".material-symbols-outlined").textContent =
            ADMIN.isAdmin ? "lock_open" : "lock";
        }
        const badge = document.getElementById("readonly-badge");
        if (badge) badge.style.display = ADMIN.isAdmin ? "none" : "flex";
      }

      function openAdminLoginModal() {
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">Admin Sign In</h3><p style="color:var(--text-med);font-size:0.85rem;">Visitors can browse everything. Signing in lets you add, edit, and delete entries — changes save for everyone.</p><input type="password" id="admin-password-input" class="form-input" placeholder="Admin password" style="margin-bottom:0.75rem;"><div id="admin-login-error" style="color:#f87171;font-size:0.8rem;display:none;margin-bottom:0.5rem;"></div><div class="confirm-actions"><button class="btn btn-secondary" id="admin-login-cancel">Cancel</button><button class="btn btn-primary" id="admin-login-submit">Sign In</button></div></div>`;
        document.body.appendChild(overlay);
        const input = document.getElementById("admin-password-input");
        const errEl = document.getElementById("admin-login-error");
        input.focus();
        const submit = async () => {
          const pw = input.value;
          if (!pw) return;
          try {
            await ADMIN.login(pw);
            overlay.remove();
            showToast("Signed in as admin", "success");
          } catch (e) {
            errEl.textContent = e.message || "Login failed";
            errEl.style.display = "block";
          }
        };
        document.getElementById("admin-login-cancel").onclick = () =>
          overlay.remove();
        document.getElementById("admin-login-submit").onclick = submit;
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
      }

      function toggleAdminAuth() {
        if (ADMIN.isAdmin) {
          showConfirm("Sign out of admin mode?", () => ADMIN.logout());
        } else {
          openAdminLoginModal();
        }
      }

      function changeGame(event) {
        if (event) event.preventDefault();
        const fallback =
          event?.currentTarget?.getAttribute("href") || "../index.html";

        // Prefer the page that actually opened MLBB (the game selector/hub).
        // This keeps Change Game working even if the hub is not exactly ../index.html.
        try {
          if (document.referrer) {
            const ref = new URL(document.referrer, window.location.href);
            const here = new URL(window.location.href);
            const isSameOrigin = ref.origin === here.origin;
            const isDifferentPage =
              ref.pathname !== here.pathname || ref.search !== here.search;
            if (isSameOrigin && isDifferentPage) {
              window.location.assign(ref.href);
              return;
            }
          }
        } catch (error) {
          console.warn("Could not resolve game selector referrer:", error);
        }

        window.location.assign(fallback);
      }
      let currentModalData = null,
        modalHistory = [],
        draggedHeroId = null,
        draggedAttribute = null,
        toastDebounce = null,
        currentUpcomingView = "heroes",
        currentPageId = "page-dashboard";
      let _heroesData = null,
        _skinsData = null,
        _attributesData = null,
        _tierListData = null,
        _tierSnapshotsData = null,
        _upcomingData = null,
        _heroById = null,
        _skinById = null,
        _attributeImagesData = null,
        _attributeBackgroundsData = null,
        _attributeColorsData = null,
        _attributeMetaData = null,
        _skillCatGroupsData = null,
        _tagGroupMapData = null;
      const formTags = {
        "hero-roles": [],
        "hero-specialties": [],
        "hero-lanes": [],
        "hero-nations": [],
      };

      const IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
          <defs>
            <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#1e293b"/>
              <stop offset="1" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#g)"/>
          <g fill="none" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".72">
            <rect x="310" y="132" width="180" height="145" rx="18"/>
            <circle cx="365" cy="184" r="18"/>
            <path d="M330 250l52-48 38 34 26-24 25 38"/>
          </g>
          <text x="400" y="330" text-anchor="middle" fill="#94a3b8" font-family="Montserrat,Arial,sans-serif" font-size="26" font-weight="600">Image unavailable</text>
        </svg>
      `)}`;

      function applyImageFallback(img) {
        if (!img || img.tagName !== "IMG") return;
        if (img.dataset?.attrGridImage === "true") {
          img.classList.add("attr-grid-image-failed");
          img.style.display = "none";
          img.closest(".attr-grid-visual")?.classList.add("image-failed");
          return;
        }
        if (img.classList.contains("filter-pill-icon-wide")) {
          img.style.display = "none";
          const fallbackLabel = img
            .closest(".filter-pill")
            ?.querySelector(".filter-pill-fallback-label");
          if (fallbackLabel) fallbackLabel.hidden = false;
          return;
        }

        // Try every supplied fallback in order before giving up on the image.
        // Hero badges use this for icon → portrait → splash → placeholder.
        const chain = [
          img.dataset?.fallbackSrc || "",
          img.dataset?.fallbackSrc2 || "",
          IMAGE_PLACEHOLDER,
        ].filter(Boolean);
        let index = Number(img.dataset?.fallbackIndex || 0);
        while (index < chain.length) {
          const candidate = chain[index++];
          img.dataset.fallbackIndex = String(index);
          if (!candidate || img.src === candidate) continue;
          img.removeAttribute("srcset");
          img.src = candidate;
          img.classList.toggle("image-fallback", candidate === IMAGE_PLACEHOLDER);
          img.classList.toggle("image-fallback-secondary", candidate !== IMAGE_PLACEHOLDER);
          return;
        }
      }

      function installImageFallbacks() {
        const normalize = (img) => {
          if (!img || img.tagName !== "IMG") return;
          const raw = img.getAttribute("src");
          if (!raw || !raw.trim()) applyImageFallback(img);
        };

        // Capture image errors before legacy inline handlers can leave a broken-image icon.
        document.addEventListener(
          "error",
          (event) => {
            const img = event.target;
            if (!img || img.tagName !== "IMG") return;
            event.stopImmediatePropagation();
            applyImageFallback(img);
          },
          true,
        );

        document.querySelectorAll("img").forEach(normalize);
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              if (node.tagName === "IMG") normalize(node);
              node.querySelectorAll?.("img").forEach(normalize);
            });
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      function installAutocompleteGuard() {
        const normalize = (node) => {
          if (!node || node.nodeType !== 1) return;
          if (node.tagName === "FORM") node.setAttribute("autocomplete", "off");
          if (node.matches?.("input, textarea")) {
            const type = String(node.getAttribute("type") || "text").toLowerCase();
            if (type !== "hidden" && type !== "checkbox" && type !== "radio" && type !== "file") {
              node.setAttribute("autocomplete", type === "password" ? "new-password" : "off");
              node.setAttribute("aria-autocomplete", "none");
            }
          }
          node.querySelectorAll?.("form").forEach((form) => form.setAttribute("autocomplete", "off"));
          node.querySelectorAll?.("input, textarea").forEach((field) => {
            const type = String(field.getAttribute("type") || "text").toLowerCase();
            if (type === "hidden" || type === "checkbox" || type === "radio" || type === "file") return;
            field.setAttribute("autocomplete", type === "password" ? "new-password" : "off");
            field.setAttribute("aria-autocomplete", "none");
          });
        };

        normalize(document.body);
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(normalize);
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      function updateFilterPanelSummary(panelOrId) {
        const panel =
          typeof panelOrId === "string"
            ? document.getElementById(panelOrId)
            : panelOrId;
        if (!panel) return;
        const ids = (panel.dataset.filterIds || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        const count = ids.reduce((total, id) => {
          const input = document.getElementById(id);
          if (!input) return total;
          if (input.tagName === "SELECT" && input.multiple) {
            return (
              total +
              Array.from(input.selectedOptions).filter((o) => o.value).length
            );
          }
          return total + (String(input.value || "").trim() ? 1 : 0);
        }, 0);
        const badge = panel.querySelector(".filter-active-count");
        const button = panel.querySelector(".filter-panel-toggle");
        if (badge) {
          badge.textContent = String(count);
          badge.dataset.count = String(count);
        }
        if (button) button.classList.toggle("has-active-filters", count > 0);
      }

      function toggleFilterPanel(panelId, forceOpen = null) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const shouldOpen =
          forceOpen === null ? panel.classList.contains("collapsed") : !!forceOpen;
        panel.classList.toggle("collapsed", !shouldOpen);
        const button = panel.querySelector(".filter-panel-toggle");
        if (button) button.setAttribute("aria-expanded", String(shouldOpen));
        try {
          sessionStorage.setItem(
            `mlbb_filter_panel_${panelId}`,
            shouldOpen ? "open" : "closed",
          );
        } catch (_) {}
      }

      function setupCollapsibleFilters() {
        document.querySelectorAll(".filter-panel").forEach((panel) => {
          try {
            const saved = sessionStorage.getItem(
              `mlbb_filter_panel_${panel.id}`,
            );
            if (saved === "open") panel.classList.remove("collapsed");
            if (saved === "closed") panel.classList.add("collapsed");
          } catch (_) {}

          const button = panel.querySelector(".filter-panel-toggle");
          if (button) {
            button.setAttribute(
              "aria-expanded",
              String(!panel.classList.contains("collapsed")),
            );
          }

          const ids = (panel.dataset.filterIds || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
          ids.forEach((id) => {
            const input = document.getElementById(id);
            if (!input || input.dataset.filterSummaryBound) return;
            input.dataset.filterSummaryBound = "true";
            input.addEventListener("change", () => updateFilterPanelSummary(panel));
          });
          updateFilterPanelSummary(panel);
        });
      }

      function syncFilterPanelSummaries() {
        document
          .querySelectorAll(".filter-panel")
          .forEach((panel) => updateFilterPanelSummary(panel));
      }

      function debounce(func, wait) {
        let timeout;
        return function (...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      function levenshteinDistance(a, b) {
        const lenA = a.length,
          lenB = b.length;
        const dp = Array.from({ length: lenA + 1 }, () =>
          Array(lenB + 1).fill(0),
        );
        for (let i = 0; i <= lenA; i++) dp[i][0] = i;
        for (let j = 0; j <= lenB; j++) dp[0][j] = j;
        for (let i = 1; i <= lenA; i++) {
          for (let j = 1; j <= lenB; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + cost,
            );
          }
        }
        return dp[lenA][lenB];
      }

      function getSearchSuggestions(searchTerm, items, maxDistance = 2) {
        if (!searchTerm || searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        const suggestions = items
          .map((item) => ({
            item,
            distance: levenshteinDistance(term, item.toLowerCase()),
          }))
          .filter((s) => s.distance <= maxDistance && s.distance > 0)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3)
          .map((s) => s.item);
        return [...new Set(suggestions)];
      }

      function showSearchSuggestions(
        searchValue,
        suggestions,
        callback,
        containerId,
      ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!suggestions.length || !searchValue.trim()) {
          container.innerHTML = "";
          container.style.display = "none";
          return;
        }

        container.innerHTML = "";
        container.style.display = "block";

        const title = document.createElement("div");
        title.style.cssText =
          "padding: 8px 12px; font-size: 11px; color: #888; border-bottom: 1px solid #3a3a4a; font-weight: bold; background: #1f1f2b;";
        title.textContent = "Did you mean?";
        container.appendChild(title);

        suggestions.forEach((sug, idx) => {
          const item = document.createElement("div");
          item.style.cssText =
            "padding: 10px 12px; cursor: pointer; color: #aaa; font-size: 14px; border-bottom: 1px solid #3a3a4a; transition: background 0.2s;";
          item.textContent = sug;
          item.onmouseover = () => (item.style.background = "#3a3a4a");
          item.onmouseout = () => (item.style.background = "transparent");
          item.onmousedown = (e) => {
            e.preventDefault();
            callback(sug);
            container.style.display = "none";
            container.innerHTML = "";
          };
          container.appendChild(item);
        });
      }

      function setupSearchDebounce() {
        const heroSearch = document.getElementById("filter-hero-search"),
          skinSearch = document.getElementById("skin-search"),
          countSearch = document.getElementById("filter-count-search"),
          upcomingSearch = document.getElementById("filter-upcoming-search");
        if (heroSearch) {
          heroSearch.oninput = debounce(() => {
            const val = heroSearch.value.toLowerCase();
            if (val.length > 1 && heroSearch.value.length < 20) {
              const heroes = getHeroes().map((h) => h.name);
              const suggestions = getSearchSuggestions(val, heroes);
              const exactMatch = getHeroes().find(
                (h) => h.name.toLowerCase() === val,
              );
              if (exactMatch) {
                const container = document.getElementById(
                  "hero-search-suggestions",
                );
                if (container) {
                  container.style.display = "none";
                  container.innerHTML = "";
                }
              } else {
                showSearchSuggestions(
                  val,
                  suggestions,
                  (selected) => {
                    heroSearch.value = selected;
                    renderHeroesPage();
                  },
                  "hero-search-suggestions",
                );
              }
            } else {
              const container = document.getElementById(
                "hero-search-suggestions",
              );
              if (container) {
                container.style.display = "none";
                container.innerHTML = "";
              }
            }
            renderHeroesPage();
          }, 300);

          heroSearch.onfocus = () => {
            const val = heroSearch.value.toLowerCase();
            if (val.length > 1) {
              const heroes = getHeroes().map((h) => h.name);
              const suggestions = getSearchSuggestions(val, heroes);
              const exactMatch = getHeroes().find(
                (h) => h.name.toLowerCase() === val,
              );
              if (!exactMatch) {
                showSearchSuggestions(
                  val,
                  suggestions,
                  (selected) => {
                    heroSearch.value = selected;
                    renderHeroesPage();
                  },
                  "hero-search-suggestions",
                );
              }
            }
          };

          heroSearch.onblur = () => {
            setTimeout(() => {
              const container = document.getElementById(
                "hero-search-suggestions",
              );
              if (container) {
                container.style.display = "none";
                container.innerHTML = "";
              }
            }, 200);
          };
        }

        if (skinSearch) {
          skinSearch.oninput = debounce(() => {
            const val = skinSearch.value.toLowerCase();
            if (val.length > 1 && skinSearch.value.length < 20) {
              const skins = getSkins().map((s) => s.name);
              const suggestions = getSearchSuggestions(val, skins);
              const exactMatch = getSkins().find(
                (s) => s.name.toLowerCase() === val,
              );
              if (exactMatch) {
                const container = document.getElementById(
                  "skin-search-suggestions",
                );
                if (container) {
                  container.style.display = "none";
                  container.innerHTML = "";
                }
              } else {
                showSearchSuggestions(
                  val,
                  suggestions,
                  (selected) => {
                    skinSearch.value = selected;
                    renderSkinsPage();
                  },
                  "skin-search-suggestions",
                );
              }
            } else {
              const container = document.getElementById(
                "skin-search-suggestions",
              );
              if (container) {
                container.style.display = "none";
                container.innerHTML = "";
              }
            }
            renderSkinsPage();
          }, 300);

          skinSearch.onfocus = () => {
            const val = skinSearch.value.toLowerCase();
            if (val.length > 1) {
              const skins = getSkins().map((s) => s.name);
              const suggestions = getSearchSuggestions(val, skins);
              const exactMatch = getSkins().find(
                (s) => s.name.toLowerCase() === val,
              );
              if (!exactMatch) {
                showSearchSuggestions(
                  val,
                  suggestions,
                  (selected) => {
                    skinSearch.value = selected;
                    renderSkinsPage();
                  },
                  "skin-search-suggestions",
                );
              }
            }
          };

          skinSearch.onblur = () => {
            setTimeout(() => {
              const container = document.getElementById(
                "skin-search-suggestions",
              );
              if (container) {
                container.style.display = "none";
                container.innerHTML = "";
              }
            }, 200);
          };
        }

        if (upcomingSearch) {
          upcomingSearch.oninput = debounce(() => renderUpcomingPage(), 300);
        }

        if (countSearch)
          countSearch.oninput = debounce(() => renderSkinCountPage(), 300);
      }

      function migrateNativeTitles(root = document) {
        const nodes = [];
        if (root.nodeType === 1 && root.hasAttribute?.("title")) nodes.push(root);
        root.querySelectorAll?.("[title]").forEach((el) => nodes.push(el));
        nodes.forEach((el) => {
          const value = el.getAttribute("title");
          if (!value) return;
          if (!el.dataset.tooltip) el.dataset.tooltip = value;
          if (!el.getAttribute("aria-label") && !el.textContent.trim()) {
            el.setAttribute("aria-label", value);
          }
          el.removeAttribute("title");
        });
      }

      function installCustomTooltipMigration() {
        migrateNativeTitles(document);
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) migrateNativeTitles(node);
            });
            if (mutation.type === "attributes" && mutation.target?.hasAttribute?.("title")) {
              migrateNativeTitles(mutation.target);
            }
          });
        });
        observer.observe(document.body, {
          childList: true, subtree: true, attributes: true, attributeFilter: ["title"]
        });
      }

      function setupTooltips() {
        const tooltip = document.getElementById("custom-tooltip");
        document.addEventListener("mousemove", (e) => {
          // Suppress tooltip when painted popup is visible or hovering painted pill
          const paintedPopup = document.getElementById("painted-popup-global");
          const isPaintedActive =
            paintedPopup && paintedPopup.style.display === "block";
          if (isPaintedActive || e.target.closest(".painted-pill")) {
            tooltip.style.display = "none";
            return;
          }
          // Suppress global tooltip on skill strip — skill name tooltip handles it
          if (e.target.closest(".card-skill-strip-wrapper")) {
            tooltip.style.display = "none";
            return;
          }
          const catTarget = e.target.closest("[data-cat-tooltip]");
          const target = e.target.closest("[data-tooltip]");
          if (catTarget && catTarget.dataset.catTooltip) {
            let cats = [];
            try {
              cats = JSON.parse(catTarget.dataset.catTooltip);
            } catch (err) {
              cats = [];
            }
            if (cats.length) {
              tooltip.style.display = "flex";
              tooltip.classList.add("tag-mode");
              tooltip.innerHTML = cats
                .map((c) => {
                  const color = getAttrColor("skillCategories", c);
                  return `<span class="cat-tooltip-tag" style="background:${color || "var(--bg-light)"};">${c}</span>`;
                })
                .join("");
            } else {
              tooltip.style.display = "none";
              tooltip.classList.remove("tag-mode");
            }
          } else if (target && target.dataset.tooltip) {
            tooltip.classList.remove("tag-mode");
            tooltip.style.display = "block";
            tooltip.textContent = target.dataset.tooltip;
          } else {
            tooltip.style.display = "none";
            tooltip.classList.remove("tag-mode");
          }
          if (tooltip.style.display !== "none") {
            let left = e.clientX + 15,
              top = e.clientY + 15;
            if (left + tooltip.offsetWidth > window.innerWidth)
              left = e.clientX - tooltip.offsetWidth - 15;
            if (top + tooltip.offsetHeight > window.innerHeight)
              top = e.clientY - tooltip.offsetHeight - 15;
            tooltip.style.left = left + "px";
            tooltip.style.top = top + "px";
          }
        });
      }

      function initImagePreview() {
        const tooltip = document.getElementById("img-preview-tooltip");
        const tooltipImg = tooltip.querySelector("img");

        const isImageUrl = (url) => {
          return (
            url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)/i) ||
            url.includes("wikia.nocookie.net") ||
            url.includes("images.contentstack.io") ||
            url.includes("ddragon.leagueoflegends.com")
          );
        };

        document.addEventListener("mouseover", function (e) {
          if (
            e.target.tagName === "INPUT" &&
            (e.target.type === "url" ||
              e.target.id.includes("img") ||
              e.target.id.includes("url") ||
              e.target.id.includes("splash") ||
              e.target.id.includes("portrait") ||
              e.target.id.includes("icon") ||
              e.target.id.includes("skin-"))
          ) {
            const val = e.target.value.trim();
            if (val && isImageUrl(val)) {
              tooltipImg.src = cleanImageUrl(val);
              tooltip.style.display = "block";
            }
          }
        });

        document.addEventListener("mousemove", function (e) {
          if (tooltip.style.display === "block") {
            let top = e.clientY + 20;
            let left = e.clientX + 20;

            if (left + 300 > window.innerWidth) {
              left = e.clientX - 320;
            }
            if (top + 200 > window.innerHeight) {
              top = e.clientY - 220;
            }

            tooltip.style.top = top + "px";
            tooltip.style.left = left + "px";
          }
        });

        document.addEventListener("mouseout", function (e) {
          if (e.target.tagName === "INPUT") {
            tooltip.style.display = "none";
            tooltipImg.removeAttribute("src");
          }
        });

        document.addEventListener("input", function (e) {
          if (
            e.target.tagName === "INPUT" &&
            tooltip.style.display === "block"
          ) {
            const val = e.target.value.trim();
            if (val && isImageUrl(val)) {
              tooltipImg.src = cleanImageUrl(val);
            } else {
              tooltip.style.display = "none";
            }
          }
        });
      }

      document.addEventListener("DOMContentLoaded", async () => {
        const loadingEl = document.getElementById("db-loading-screen");
        await DB.init();
        updateAdminUI();
        document.querySelectorAll("[data-app-version]").forEach((el) => {
          el.textContent = `v${APP_VERSION}`;
        });
        const versionLabel = document.getElementById("app-version-label");
        if (versionLabel) versionLabel.textContent = `v${APP_VERSION}`;
        document.documentElement.dataset.appVersion = APP_VERSION;
        if (loadingEl) loadingEl.remove();

        loadDefaults();
        migrateLegacySkinFamiliesToSeries();
        setupSidebar();
        setupNavigation();
        installImageFallbacks();
        installAutocompleteGuard();
        populateFilters();
        setupCollapsibleFilters();
        renderHeroesPage();
        installCustomTooltipMigration();
        setupTooltips();
        setupSearchDebounce();
        initImagePreview();
        // Initialize sort pills UI to match default state
        ["heroes", "skins", "upcoming"].forEach((page) => {
          const pillsEl = document.getElementById(`sort-pills-${page}`);
          if (!pillsEl) return;
          const state = sortState[page];
          pillsEl.querySelectorAll(".sort-pill").forEach((p) => {
            p.classList.remove("active", "asc", "desc");
            p.querySelector(".sort-arrow").textContent = "";
            if (p.dataset.sort === state.key) {
              p.classList.add("active", state.dir);
              p.querySelector(".sort-arrow").textContent =
                state.dir === "asc" ? "↑" : "↓";
            }
          });
        });
        if (typeof initV25Features === "function") initV25Features();
      });

      function showConfirm(msg, onConfirm) {
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">Confirm Action</h3><p>${msg}</p><div class="confirm-actions"><button class="btn btn-secondary" id="confirm-cancel">Cancel</button><button class="btn btn-danger" id="confirm-ok">Confirm</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("confirm-cancel").onclick = () =>
          overlay.remove();
        document.getElementById("confirm-ok").onclick = () => {
          onConfirm();
          overlay.remove();
        };
      }
      function promptEdit(title, val, onSave) {
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">${title}</h3><input type="text" id="prompt-input" class="form-input" value="${val.replace(/"/g, "&quot;")}" style="margin-bottom:1rem;"><div class="confirm-actions"><button class="btn btn-secondary" id="prompt-cancel">Cancel</button><button class="btn btn-primary" id="prompt-ok">Save</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("prompt-cancel").onclick = () =>
          overlay.remove();
        document.getElementById("prompt-ok").onclick = () => {
          const v = document.getElementById("prompt-input").value.trim();
          if (v) onSave(v);
          overlay.remove();
        };
      }

      function safeLocalStorageSet(key, value) {
        // Now backed by the server database (see DB above) instead of the
        // browser's localStorage, so there's no practical quota to hit here.
        return DB.setItem(key, value);
      }
      function showStorageFullModal() {
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">Storage Full</h3><p>Your browser's local storage for this file is full, so this change couldn't be saved. Export a backup now, then free up space by removing or shrinking large entries (an image link that's actually a huge pasted image is the usual culprit).</p><div class="confirm-actions"><button class="btn btn-secondary" id="storage-full-close">Close</button><button class="btn btn-primary" id="storage-full-open">Open Backup &amp; Storage</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("storage-full-close").onclick = () =>
          overlay.remove();
        document.getElementById("storage-full-open").onclick = () => {
          overlay.remove();
          openStorageManager();
        };
      }
      function formatBytes(n) {
        if (n < 1024) return n + " B";
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
        return (n / (1024 * 1024)).toFixed(2) + " MB";
      }
      const STORAGE_REPORT_KEYS = [
        { key: "game_hub_mlbb_heroes", label: "Heroes" },
        { key: "game_hub_mlbb_skins", label: "Skins" },
        { key: "game_hub_mlbb_attributes", label: "Attributes" },
        { key: "game_hub_mlbb_tier_list", label: "Tier List" },
        { key: "game_hub_mlbb_tier_snapshots", label: "Tier List Versions" },
        { key: "game_hub_mlbb_upcoming", label: "Upcoming" },
        { key: "game_hub_mlbb_skin_count_state", label: "Skin Count State" },
        { key: "game_hub_mlbb_sidebar_collapsed", label: "Sidebar State" },
        { key: "mlbb_attr_images", label: "Attribute Images" },
        { key: "mlbb_attr_bgs", label: "Attribute Backgrounds" },
        { key: "mlbb_attr_colors", label: "Attribute Colors" },
        { key: "mlbb_skillcat_groups", label: "Skill Category Groups" },
        { key: "mlbb_skillcat_tag_groups", label: "Skill Category Tag Map" },
        { key: "mlbb_tier_config", label: "Tier Config" },
        { key: "mlbb_revamping", label: "Revamping Status" },
        { key: "mlbb_starred", label: "Legacy Favorites (migration)" },
      ];
      function getStorageReport() {
        let total = 0;
        const known = new Set(STORAGE_REPORT_KEYS.map((k) => k.key));
        const rows = STORAGE_REPORT_KEYS.map((k) => {
          const v = DB.getItem(k.key) || "";
          const bytes = new Blob([v]).size;
          total += bytes;
          return { ...k, bytes };
        });
        let otherBytes = 0;
        for (let i = 0; i < DB.length; i++) {
          const k = DB.key(i);
          if (!known.has(k)) {
            otherBytes += new Blob([DB.getItem(k) || ""]).size;
          }
        }
        if (otherBytes > 0) {
          rows.push({ key: "__other__", label: "Other", bytes: otherBytes });
          total += otherBytes;
        }
        rows.sort((a, b) => b.bytes - a.bytes);
        return { rows, total };
      }
      function findOversizedFields(thresholdBytes = 3000) {
        const results = [];
        const scan = (obj, name, source) => {
          if (!obj || typeof obj !== "object") return;
          Object.keys(obj).forEach((k) => {
            const v = obj[k];
            if (typeof v === "string") {
              const bytes = new Blob([v]).size;
              if (bytes > thresholdBytes) {
                results.push({
                  source,
                  name: name || "(unnamed)",
                  field: k,
                  bytes,
                });
              }
            } else if (Array.isArray(v)) {
              v.forEach((item, idx) =>
                scan(item, name, `${source} > ${k}[${idx}]`),
              );
            } else if (v && typeof v === "object") {
              scan(v, name, `${source} > ${k}`);
            }
          });
        };
        try {
          (getHeroes() || []).forEach((h) => scan(h, h.name, "Hero"));
        } catch (e) {}
        try {
          (getSkins() || []).forEach((s) => scan(s, s.name, "Skin"));
        } catch (e) {}
        try {
          (getData(KEYS.UPCOMING, []) || []).forEach((u) =>
            scan(u, u.name, "Upcoming"),
          );
        } catch (e) {}
        results.sort((a, b) => b.bytes - a.bytes);
        return results;
      }
      function exportAllData() {
        const data = {};
        STORAGE_REPORT_KEYS.forEach((r) => {
          const v = DB.getItem(r.key);
          if (v !== null) data[r.key] = v;
        });
        for (let i = 0; i < DB.length; i++) {
          const k = DB.key(i);
          if (!(k in data)) data[k] = DB.getItem(k);
        }
        const payload = {
          app: "mlbb-hero-skin-db",
          exportedAt: new Date().toISOString(),
          data,
        };
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `mlbb-backup-${ts}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("Backup downloaded", "success");
      }
      function importAllDataFromFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
          let payload;
          try {
            payload = JSON.parse(reader.result);
          } catch (e) {
            showToast("Invalid backup file", "info");
            return;
          }
          const data = payload && payload.data ? payload.data : payload;
          if (!data || typeof data !== "object") {
            showToast("Invalid backup file", "info");
            return;
          }
          if (!ADMIN.isAdmin) {
            showToast("Sign in as admin to restore a backup", "info");
            openAdminLoginModal();
            return;
          }
          showConfirm(
            "This will overwrite the live database (for everyone) with this backup file. Continue?",
            async () => {
              showToast("Restoring backup...", "info");
              const keys = Object.keys(data);
              const failed = [];
              // Sequential + awaited on purpose: large keys (e.g. the skins
              // list) can be several hundred KB, and firing every PUT at
              // once in parallel with no wait was the original bug — the
              // page reloaded before slow/rejected saves ever finished, so
              // failures (like a body-size-limit 413) were silently lost.
              for (const k of keys) {
                const ok = await DB.setItemAwaited(k, data[k]);
                if (!ok) failed.push(k);
              }
              if (failed.length) {
                showToast(
                  "Import partially failed for: " +
                    failed.join(", ") +
                    " — see console for details. NOT reloading so you can check.",
                  "info",
                );
                console.error("Backup restore failed for keys:", failed);
              } else {
                showToast("Backup restored. Reloading...", "success");
                setTimeout(() => location.reload(), 800);
              }
            },
          );
        };
        reader.readAsText(file);
      }
      function openStorageManager() {
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const { rows, total } = getStorageReport();
        const oversized = findOversizedFields();
        const rowsHtml =
          rows
            .filter((r) => r.bytes > 0)
            .map(
              (r) =>
                `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.85rem;"><span>${r.label}</span><span style="color:var(--text-med);">${formatBytes(r.bytes)}</span></div>`,
            )
            .join("") ||
          `<div style="color:var(--text-med);font-size:0.85rem;">No data stored yet.</div>`;
        const oversizedHtml = oversized.length
          ? `<div style="margin-top:1rem;"><div class="form-label" style="color:#f87171;">Unusually large fields (likely a pasted image instead of a link)</div>${oversized
              .slice(0, 8)
              .map(
                (o) =>
                  `<div style="font-size:0.78rem;color:var(--text-med);padding:0.2rem 0;">${o.source} "${o.name}" → ${o.field} (${formatBytes(o.bytes)})</div>`,
              )
              .join("")}</div>`
          : "";
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal" style="min-width:380px;text-align:left;"><h3 style="margin-top:0;text-align:center;">Backup &amp; Database</h3><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;"><span class="form-label" style="margin:0;">Total stored</span><span style="font-weight:700;">${formatBytes(total)}</span></div><div style="max-height:220px;overflow-y:auto;margin-bottom:0.5rem;">${rowsHtml}</div>${oversizedHtml}<p style="color:var(--text-med);font-size:0.8rem;margin:1rem 0 0.5rem;">Data now lives in the server's database and is shared by everyone who visits this site. Exporting a backup is still a good idea before big changes; importing will overwrite the live database for everyone (admin only).</p><input type="file" id="import-file-input" accept="application/json" style="display:none;"><div class="confirm-actions" style="flex-wrap:wrap;"><button class="btn btn-secondary" id="storage-close">Close</button><button class="btn btn-secondary" id="storage-import">Import Backup</button><button class="btn btn-primary" id="storage-export">Export Backup</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("storage-close").onclick = () =>
          overlay.remove();
        document.getElementById("storage-export").onclick = () =>
          exportAllData();
        document.getElementById("storage-import").onclick = () =>
          document.getElementById("import-file-input").click();
        document.getElementById("import-file-input").onchange = (e) => {
          const file = e.target.files[0];
          if (file) importAllDataFromFile(file);
        };
      }

      function parseStoredJson(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        if (typeof value === "object") return value;
        if (typeof value !== "string") return fallback;
        try {
          const parsed = JSON.parse(value);
          return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (e) {
          return fallback;
        }
      }
      function getData(key, def = []) {
        return parseStoredJson(DB.getItem(key), def);
      }
      function saveData(key, data) {
        const ok = safeLocalStorageSet(key, JSON.stringify(data));
        if (ok) {
          if (key === KEYS.HEROES) {
            _heroesData = data;
            _heroById = null;
          }
          if (key === KEYS.SKINS) {
            _skinsData = data;
            _skinById = null;
          }
          if (key === KEYS.ATTRIBUTES) _attributesData = data;
          if (key === KEYS.TIER_LIST) _tierListData = data;
          if (key === KEYS.TIER_SNAPSHOTS) _tierSnapshotsData = data;
          if (key === KEYS.UPCOMING) _upcomingData = data;
        }
        return ok;
      }
      function getHeroes() {
        if (!_heroesData) _heroesData = getData(KEYS.HEROES, []);
        return _heroesData;
      }
      function saveHeroes(d) {
        saveData(KEYS.HEROES, d);
      }
      function getSkins() {
        if (!_skinsData) _skinsData = getData(KEYS.SKINS, []);
        return _skinsData;
      }
      function saveSkins(d) {
        saveData(KEYS.SKINS, d);
      }
      function getHeroById(id) {
        if (!_heroById) {
          _heroById = new Map(getHeroes().map((hero) => [hero.id, hero]));
        }
        return _heroById.get(id);
      }
      function getSkinById(id) {
        if (!_skinById) {
          _skinById = new Map(getSkins().map((skin) => [skin.id, skin]));
        }
        return _skinById.get(id);
      }
      const ATTRIBUTE_SCHEMA_KEYS = [
        "roles",
        "specialties",
        "lanes",
        "nations",
        "skinRarities",
        "collectibleRarities",
        "skillCategories",
        "skinFamilies",
        "items",
        "emblems",
        "emblemTalents",
      ];
      function getAttributes() {
        if (!_attributesData) {
          const def = Object.fromEntries(ATTRIBUTE_SCHEMA_KEYS.map((key) => [key, []]));
          const stored = getData(KEYS.ATTRIBUTES, def) || {};
          _attributesData = { ...def };
          ATTRIBUTE_SCHEMA_KEYS.forEach((key) => {
            _attributesData[key] = Array.isArray(stored[key]) ? stored[key] : [];
          });
        }
        return _attributesData;
      }
      function normalizeAttributesPayload(input, base = getAttributes()) {
        const next = {};
        ATTRIBUTE_SCHEMA_KEYS.forEach((key) => {
          const source = Array.isArray(input?.[key]) ? input[key] : base?.[key];
          const seen = new Set();
          next[key] = (Array.isArray(source) ? source : [])
            .map((value) => String(value ?? "").trim())
            .filter((value) => value && !seen.has(value) && seen.add(value));
        });
        return next;
      }
      function resolveAttributeSectionKey(key, value = "") {
        if (ATTRIBUTE_SCHEMA_KEYS.includes(key)) return key;
        const attrs = getAttributes();
        if (value) {
          const matches = ATTRIBUTE_SCHEMA_KEYS.filter((candidate) =>
            Array.isArray(attrs[candidate]) && attrs[candidate].includes(value),
          );
          if (matches.length === 1) return matches[0];
        }
        return "";
      }
      function ensureAttributeSection(key, value = "") {
        const resolvedKey = resolveAttributeSectionKey(key, value);
        if (!resolvedKey) return { key: "", attrs: getAttributes(), values: null };
        const attrs = getAttributes();
        if (!Array.isArray(attrs[resolvedKey])) attrs[resolvedKey] = [];
        return { key: resolvedKey, attrs, values: attrs[resolvedKey] };
      }
      function saveAttributes(d) {
        const storedCurrent = normalizeAttributesPayload(getData(KEYS.ATTRIBUTES, {}), {});
        const runtimeCurrent = normalizeAttributesPayload(getAttributes(), storedCurrent);
        const next = normalizeAttributesPayload(d, runtimeCurrent);
        return saveData(KEYS.ATTRIBUTES, next);
      }
      function getHeroNations(hero) {
        const values = Array.isArray(hero?.nations) && hero.nations.length
          ? hero.nations
          : hero?.nation
            ? [hero.nation]
            : [];
        return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
      }
      function repairAttributesFromRecords(persist = false) {
        const attrs = getAttributes();
        let changed = false;
        const add = (key, value) => {
          const clean = String(value ?? "").trim();
          if (!clean) return;
          if (!Array.isArray(attrs[key])) attrs[key] = [];
          if (!attrs[key].includes(clean)) {
            attrs[key].push(clean);
            changed = true;
          }
        };
        const scanHero = (hero) => {
          (hero?.roles || []).forEach((value) => add("roles", value));
          (hero?.specialties || []).forEach((value) => add("specialties", value));
          (hero?.lanes || []).forEach((value) => add("lanes", value));
          getHeroNations(hero).forEach((value) => add("nations", value));
          (hero?.skills || []).forEach((skill) => {
            (skill?.categories || []).forEach((value) => add("skillCategories", value));
          });
        };
        const scanSkin = (skin) => {
          add("skinRarities", skin?.rarity);
          add("collectibleRarities", skin?.collectible);
          // Skin series are now represented by Skin Rarity metadata. Legacy family names are migrated separately.
        };
        const scanBuilds = (hero) => {
          (hero?.builds || []).forEach((build) => {
            (build?.items || []).forEach((value) => add("items", value));
            (build?.substituteItems || []).forEach((value) => add("items", value));
            add("emblems", build?.emblem);
            (build?.talents || []).forEach((value) => add("emblemTalents", value));
          });
        };
        getHeroes().forEach((hero) => { scanHero(hero); scanBuilds(hero); });
        getSkins().forEach(scanSkin);
        getUpcoming().forEach((item) => {
          if (item?.itemType === "hero") { scanHero(item); scanBuilds(item); }
          else scanSkin(item);
        });
        const imageMaps = getAttributeImages();
        const bgMaps = getAttributeBackgrounds();
        const colorMaps = getAttributeColors();
        ATTRIBUTE_SCHEMA_KEYS.forEach((key) => {
          Object.keys(imageMaps?.[key] || {}).forEach((value) => add(key, value));
          Object.keys(bgMaps?.[key] || {}).forEach((value) => add(key, value));
          Object.keys(colorMaps?.[key] || {}).forEach((value) => add(key, value));
        });
        try {
          Object.keys(getTagGroupMap() || {}).forEach((value) => add("skillCategories", value));
        } catch (e) {}
        if (persist) {
          const stored = normalizeAttributesPayload(getData(KEYS.ATTRIBUTES, {}), {});
          const runtime = normalizeAttributesPayload(attrs, {});
          const needsPersist = JSON.stringify(stored) !== JSON.stringify(runtime);
          if (needsPersist) {
            if (!ADMIN.isAdmin) {
              showToast("Sign in as admin to save repaired attributes.", "info");
            } else {
              saveAttributes(runtime);
              populateFilters();
              if (typeof renderAttributesPage === "function") renderAttributesPage();
              showToast("Recovered missing attributes from existing records and metadata.", "success");
            }
          } else if (ADMIN.isAdmin) {
            showToast("No missing attributes were found in existing records.", "success");
          }
        }
        return changed;
      }
      function migrateLegacySkinFamiliesToSeries() {
        const attrs = getAttributes();
        const legacy = Array.isArray(attrs.skinFamilies) ? attrs.skinFamilies.filter(Boolean) : [];
        if (!legacy.length) return false;
        let changedAttrs = false;
        let changedMeta = false;
        const meta = getAttributeMeta();
        if (!meta.skinRaritySeries) meta.skinRaritySeries = {};
        legacy.forEach((value) => {
          if (!attrs.skinRarities.includes(value)) {
            attrs.skinRarities.push(value);
            changedAttrs = true;
          }
          if (!meta.skinRaritySeries[value]) {
            meta.skinRaritySeries[value] = true;
            changedMeta = true;
          }
          const legacyImg = getAttrImage("skinFamilies", value);
          if (legacyImg && !getAttrImage("skinRarities", value) && ADMIN.isAdmin) setAttrImage("skinRarities", value, legacyImg);
        });
        if (changedMeta) {
          _attributeMetaData = meta;
          if (ADMIN.isAdmin) saveAttributeMeta(meta);
        }
        if (changedAttrs && ADMIN.isAdmin) saveAttributes(attrs);
        return changedAttrs || changedMeta;
      }
      function getSkinSeriesName(skin) {
        if (!skin) return "";
        if (isSkinSeriesRarity(skin.rarity)) return skin.rarity || "";
        // Legacy V2.9 records remain readable until they are edited into the new rarity-only model.
        if (skin.family && isSkinSeriesRarity(skin.family)) return skin.family;
        return "";
      }

      function restoreAttributeBackup() {
        const backup = getData(KEYS.ATTRIBUTES_BACKUP, null);
        if (!backup || typeof backup !== "object") {
          showToast("No attribute backup is available yet.", "info");
          return;
        }
        showConfirm("Restore the last automatic attribute backup? This will replace the current attribute lists.", () => {
          saveAttributes(backup);
          _attributesData = normalizeAttributesPayload(backup, {});
          const metaBackup = getData("mlbb_attr_meta_backup", null);
          if (metaBackup && typeof metaBackup === "object") {
            _attributeMetaData = metaBackup;
            safeLocalStorageSet("mlbb_attr_meta", JSON.stringify(metaBackup));
          }
          populateFilters();
          renderAttributesPage();
          showToast("Attribute backup restored.", "success");
        });
      }
      const ATTR_IMAGES_KEY = "mlbb_attr_images";
      function parseAttributeImageStore(value) {
        let current = value;
        for (let depth = 0; depth < 5; depth++) {
          if (current === null || current === undefined || current === "") return {};
          if (typeof current === "string") {
            const text = current.trim();
            if (!text) return {};
            try {
              const parsed = JSON.parse(text);
              if (parsed === current) break;
              current = parsed;
              continue;
            } catch (e) {
              return {};
            }
          }
          break;
        }
        return current && typeof current === "object" && !Array.isArray(current) ? current : {};
      }
      function getAttributeImages() {
        if (_attributeImagesData && typeof _attributeImagesData === "object") return _attributeImagesData;
        _attributeImagesData = parseAttributeImageStore(DB.getItem(ATTR_IMAGES_KEY));
        return _attributeImagesData;
      }
      let _attributeImageWriteQueue = Promise.resolve();
      function cloneAttributeImageMap(d) {
        const clean = d && typeof d === "object" && !Array.isArray(d) ? d : {};
        try {
          return typeof structuredClone === "function" ? structuredClone(clean) : JSON.parse(JSON.stringify(clean));
        } catch (e) {
          return clean;
        }
      }
      function saveAttributeImages(d) {
        const snapshot = cloneAttributeImageMap(d);
        const payload = JSON.stringify(snapshot);
        _attributeImagesData = snapshot;
        // Keep the in-memory DB view aligned with what the grid is showing immediately.
        DB._cache[ATTR_IMAGES_KEY] = payload;
        if (!ADMIN.isAdmin) {
          showToast("Sign in as admin to save changes", "info");
          openAdminLoginModal();
          return false;
        }
        // Attribute artwork edits are deliberately serialized. This guarantees that
        // clear → save → paste again → save cannot land on the server out of order.
        _attributeImageWriteQueue = _attributeImageWriteQueue
          .then(() => DB.setItemAwaited(ATTR_IMAGES_KEY, payload))
          .catch((e) => {
            console.error("Attribute image save failed:", e);
            return false;
          });
        return true;
      }
      function normalizeAttributeImageValue(value) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          value = [value.url, value.src, value.imageUrl, value.image, value.href].find(
            (candidate) => typeof candidate === "string" && candidate.trim(),
          ) || "";
        }
        if (typeof value !== "string") return "";
        let text = value.trim();
        if (!text) return "";
        // Keep old double-serialized values readable, but never rewrite a valid URL.
        for (let depth = 0; depth < 3; depth++) {
          if (!(text.startsWith('"') && text.endsWith('"'))) break;
          try {
            const parsed = JSON.parse(text);
            if (typeof parsed !== "string" || parsed === text) break;
            text = parsed.trim();
          } catch (e) { break; }
        }
        return text;
      }
      function normalizedAttrGroupKey(value) {
        return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      const ATTR_IMAGE_GROUP_ALIASES = {
        roles: ["roles", "heroRoles", "hero_roles", "Hero Roles"],
        specialties: ["specialties", "heroSpecialties", "hero_specialties", "Hero Specialty", "Hero Specialties"],
        lanes: ["lanes", "heroLanes", "hero_lanes", "Hero Lanes"],
        nations: ["nations", "heroNations", "hero_nations", "Nation", "Nations"],
        skinRarities: ["skinRarities", "skin_rarities", "Skin Rarity", "Skin Rarities"],
        collectibleRarities: ["collectibleRarities", "collectible_rarities", "Collectible Rarity", "Skin Collectible Rarity"],
        skillCategories: ["skillCategories", "skill_categories", "Skill Category", "Skill Categories"],
        items: ["items", "buildItems", "build_items", "Build Items"],
        emblems: ["emblems", "mainEmblems", "main_emblems", "Main Emblems"],
        emblemTalents: ["emblemTalents", "emblem_talents", "Talents", "Emblem Talents"],
        skinFamilies: ["skinFamilies", "skin_families", "Skin Families"],
      };
      function getAttributeImageGroups(map, key) {
        if (!map || typeof map !== "object" || Array.isArray(map)) return [];
        const aliases = new Set((ATTR_IMAGE_GROUP_ALIASES[key] || [key]).map(normalizedAttrGroupKey));
        return Object.entries(map)
          .filter(([groupKey, group]) => aliases.has(normalizedAttrGroupKey(groupKey)) && group && typeof group === "object" && !Array.isArray(group))
          .map(([, group]) => group);
      }
      function collectAttributeImagesFromMap(map, key, val) {
        const rawName = String(val ?? "");
        const trimmed = rawName.trim();
        const folded = trimmed.toLocaleLowerCase();
        const out = [];
        const push = (value) => {
          const url = normalizeAttributeImageValue(value);
          if (url && !out.includes(url)) out.push(url);
        };
        getAttributeImageGroups(map, key).forEach((group) => {
          push(group[rawName]);
          if (trimmed !== rawName) push(group[trimmed]);
          Object.keys(group)
            .filter((candidate) => String(candidate).trim().toLocaleLowerCase() === folded)
            .forEach((candidate) => push(group[candidate]));
        });
        return out;
      }
      function getAttrImageCandidates(key, val) {
        // Deliberately simple: only the current live image map is used.
        // Clearing and re-saving an image now has one predictable source of truth.
        return collectAttributeImagesFromMap(getAttributeImages(), key, val);
      }
      function getAttrImage(key, val) {
        return getAttrImageCandidates(key, val)[0] || "";
      }
      function setAttrImage(key, val, url) {
        const imgs = getAttributeImages();
        if (!imgs[key] || typeof imgs[key] !== "object" || Array.isArray(imgs[key])) imgs[key] = {};
        const cleanUrl = normalizeAttributeImageValue(url);
        if (cleanUrl) imgs[key][val] = cleanUrl;
        else delete imgs[key][val];
        saveAttributeImages(imgs);
      }
      function getAttributeBackgrounds() {
        if (_attributeBackgroundsData) return _attributeBackgroundsData;
        const current = parseStoredJson(DB.getItem("mlbb_attr_bgs"), {});
        _attributeBackgroundsData = current && typeof current === "object" && !Array.isArray(current) ? current : {};
        return _attributeBackgroundsData;
      }
      function saveAttributeBackgrounds(d) {
        _attributeBackgroundsData = d;
        safeLocalStorageSet("mlbb_attr_bgs", JSON.stringify(d));
      }
      function getAttrBg(key, val) {
        const bgs = getAttributeBackgrounds();
        return (bgs[key] && bgs[key][val]) || "";
      }
      function setAttrBg(key, val, url) {
        const bgs = getAttributeBackgrounds();
        if (!bgs[key]) bgs[key] = {};
        if (url) bgs[key][val] = url;
        else delete bgs[key][val];
        saveAttributeBackgrounds(bgs);
      }
      function getAttributeColors() {
        if (_attributeColorsData) return _attributeColorsData;
        const current = parseStoredJson(DB.getItem("mlbb_attr_colors"), {});
        _attributeColorsData = current && typeof current === "object" && !Array.isArray(current) ? current : {};
        return _attributeColorsData;
      }
      function saveAttributeColors(d) {
        _attributeColorsData = d;
        safeLocalStorageSet("mlbb_attr_colors", JSON.stringify(d));
      }
      function getAttrColor(key, val) {
        const cols = getAttributeColors();
        return (cols[key] && cols[key][val]) || "";
      }
      function setAttrColor(key, val, color) {
        const cols = getAttributeColors();
        if (!cols[key]) cols[key] = {};
        if (color) cols[key][val] = color;
        else delete cols[key][val];
        saveAttributeColors(cols);
      }
      const BUILD_ITEM_CATEGORIES = ["Physical", "Magic", "Defense", "Movement", "Jungle", "Roam"];
      function getAttributeMeta() {
        if (_attributeMetaData) return _attributeMetaData;
        const raw = parseStoredJson(DB.getItem("mlbb_attr_meta"), {});
        _attributeMetaData = {
          skinRaritySeries: raw?.skinRaritySeries && typeof raw.skinRaritySeries === "object" ? raw.skinRaritySeries : {},
          itemCategories: raw?.itemCategories && typeof raw.itemCategories === "object" ? raw.itemCategories : {},
        };
        return _attributeMetaData;
      }
      function saveAttributeMeta(meta) {
        _attributeMetaData = meta;
        safeLocalStorageSet("mlbb_attr_meta", JSON.stringify(meta || {}));
      }
      function isSkinSeriesRarity(value) {
        return !!getAttributeMeta().skinRaritySeries?.[value];
      }
      function setSkinSeriesRarity(value, enabled) {
        const meta = getAttributeMeta();
        if (!meta.skinRaritySeries) meta.skinRaritySeries = {};
        if (enabled) meta.skinRaritySeries[value] = true;
        else delete meta.skinRaritySeries[value];
        saveAttributeMeta(meta);
      }
      function getItemCategories(value) {
        const raw = getAttributeMeta().itemCategories?.[value];
        return Array.isArray(raw) ? raw.filter((cat) => BUILD_ITEM_CATEGORIES.includes(cat)) : [];
      }
      function setItemCategories(value, categories) {
        const meta = getAttributeMeta();
        if (!meta.itemCategories) meta.itemCategories = {};
        const clean = [...new Set((categories || []).filter((cat) => BUILD_ITEM_CATEGORIES.includes(cat)))];
        if (clean.length) meta.itemCategories[value] = clean;
        else delete meta.itemCategories[value];
        saveAttributeMeta(meta);
      }
      function renameAttributeMetaReference(key, oldVal, newVal) {
        const meta = getAttributeMeta();
        let changed = false;
        if (key === "skinRarities" && Object.prototype.hasOwnProperty.call(meta.skinRaritySeries || {}, oldVal)) {
          meta.skinRaritySeries[newVal] = !!meta.skinRaritySeries[oldVal];
          delete meta.skinRaritySeries[oldVal];
          changed = true;
        }
        if (key === "items" && Object.prototype.hasOwnProperty.call(meta.itemCategories || {}, oldVal)) {
          meta.itemCategories[newVal] = meta.itemCategories[oldVal];
          delete meta.itemCategories[oldVal];
          changed = true;
        }
        if (changed) saveAttributeMeta(meta);
      }
      function deleteAttributeMetaReference(key, value) {
        const meta = getAttributeMeta();
        let changed = false;
        if (key === "skinRarities" && meta.skinRaritySeries?.[value] !== undefined) {
          delete meta.skinRaritySeries[value];
          changed = true;
        }
        if (key === "items" && meta.itemCategories?.[value] !== undefined) {
          delete meta.itemCategories[value];
          changed = true;
        }
        if (changed) saveAttributeMeta(meta);
      }

      // Skill Category color groups: a named group has one color; every tag
      // assigned to that group shares the exact same RGB value.
      function getSkillCatGroups() {
        if (_skillCatGroupsData) return _skillCatGroupsData;
        try {
          _skillCatGroupsData = JSON.parse(DB.getItem("mlbb_skillcat_groups") || "[]");
        } catch (e) {
          _skillCatGroupsData = [];
        }
        return _skillCatGroupsData;
      }
      function saveSkillCatGroups(d) {
        _skillCatGroupsData = d;
        safeLocalStorageSet("mlbb_skillcat_groups", JSON.stringify(d));
      }
      function getTagGroupMap() {
        if (_tagGroupMapData) return _tagGroupMapData;
        try {
          _tagGroupMapData = JSON.parse(DB.getItem("mlbb_skillcat_tag_groups") || "{}");
        } catch (e) {
          _tagGroupMapData = {};
        }
        return _tagGroupMapData;
      }
      function saveTagGroupMap(d) {
        _tagGroupMapData = d;
        safeLocalStorageSet("mlbb_skillcat_tag_groups", JSON.stringify(d));
      }
      function getTagGroupId(tag) {
        return getTagGroupMap()[tag] || "";
      }
      function setTagGroupId(tag, groupId) {
        const m = getTagGroupMap();
        if (groupId) m[tag] = groupId;
        else delete m[tag];
        saveTagGroupMap(m);
      }
      function findSkillCatGroup(groupId) {
        return getSkillCatGroups().find((g) => g.id === groupId);
      }
      function addSkillCatGroup(name, color) {
        const groups = getSkillCatGroups();
        const id = "g" + Date.now();
        groups.push({ id, name, color });
        saveSkillCatGroups(groups);
        return id;
      }
      function renameOrRecolorGroup(id, name, color) {
        const groups = getSkillCatGroups();
        const g = groups.find((x) => x.id === id);
        if (!g) return;
        g.name = name;
        g.color = color;
        saveSkillCatGroups(groups);
        // Every tag in this group shares the group color
        const map = getTagGroupMap();
        const cols = getAttributeColors();
        if (!cols.skillCategories) cols.skillCategories = {};
        Object.keys(map).forEach((tag) => {
          if (map[tag] === id) cols.skillCategories[tag] = color;
        });
        saveAttributeColors(cols);
      }
      function deleteSkillCatGroup(id) {
        saveSkillCatGroups(getSkillCatGroups().filter((g) => g.id !== id));
        const map = getTagGroupMap();
        Object.keys(map).forEach((tag) => {
          if (map[tag] === id) delete map[tag];
        });
        saveTagGroupMap(map);
      }
      function manageSkillCatGroups() {
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const groups = getSkillCatGroups();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        const rowsHtml = () =>
          groups
            .map(
              (g) =>
                `<div class="skillcat-group-chip"><span class="swatch" style="background:${g.color};"></span>${g.name}<span class="material-symbols-outlined" title="Rename/Recolor" onclick="editSkillCatGroupPrompt('${g.id}')">edit</span><span class="material-symbols-outlined" title="Delete" onclick="deleteSkillCatGroupPrompt('${g.id}')">delete</span></div>`,
            )
            .join("") ||
          `<div style="color:var(--text-med);font-size:0.85rem;">No groups yet.</div>`;
        overlay.innerHTML = `<div class="confirm-modal" style="min-width:360px;"><h3 style="margin-top:0;">Color Groups</h3><div id="skillcat-group-list" style="margin-bottom:1rem;">${rowsHtml()}</div><div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;"><input type="text" id="new-group-name" class="form-input" placeholder="Group name..." style="flex:1"><input type="color" id="new-group-color" class="form-input" value="#fbbf24" style="width:52px;padding:2px;flex-shrink:0;"><button class="btn btn-primary btn-sm" id="new-group-add">Add</button></div><div class="confirm-actions"><button class="btn btn-secondary" id="group-modal-close">Close</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("group-modal-close").onclick = () => {
          overlay.remove();
          renderAttributesPage();
        };
        document.getElementById("new-group-add").onclick = () => {
          const name = document.getElementById("new-group-name").value.trim();
          if (!name) return;
          const color = document.getElementById("new-group-color").value;
          addSkillCatGroup(name, color);
          overlay.remove();
          manageSkillCatGroups();
        };
      }
      function editSkillCatGroupPrompt(id) {
        const g = findSkillCatGroup(id);
        if (!g) return;
        const existingOverlay = document.querySelector(
          ".confirm-modal-overlay",
        );
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">Edit Group</h3><input type="text" id="edit-group-name" class="form-input" value="${g.name.replace(/"/g, "&quot;")}" style="margin-bottom:0.75rem;"><input type="color" id="edit-group-color" class="form-input" value="${g.color}" style="width:52px;padding:2px;margin-bottom:1rem;"><div class="confirm-actions"><button class="btn btn-secondary" id="edit-group-cancel">Cancel</button><button class="btn btn-primary" id="edit-group-save">Save</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById("edit-group-cancel").onclick = () => {
          overlay.remove();
          manageSkillCatGroups();
        };
        document.getElementById("edit-group-save").onclick = () => {
          const name = document.getElementById("edit-group-name").value.trim();
          const color = document.getElementById("edit-group-color").value;
          if (name) renameOrRecolorGroup(id, name, color);
          overlay.remove();
          manageSkillCatGroups();
          renderAttributesPage();
        };
      }
      function deleteSkillCatGroupPrompt(id) {
        showConfirm("Delete this group? Tags keep their current color.", () => {
          deleteSkillCatGroup(id);
          manageSkillCatGroups();
          renderAttributesPage();
        });
      }
      const TIER_CONFIG_KEY = "mlbb_tier_config";
      const DEFAULT_TIERS = [
        { id: "S", label: "S", color: "#ff7f7f" },
        { id: "A", label: "A", color: "#ffbf7f" },
        { id: "B", label: "B", color: "#ffff7f" },
        { id: "C", label: "C", color: "#7fff7f" },
        { id: "D", label: "D", color: "#7fbfff" },
      ];

      function getTierConfig() {
        try {
          const d = JSON.parse(DB.getItem(TIER_CONFIG_KEY));
          return d && d.length ? d : JSON.parse(JSON.stringify(DEFAULT_TIERS));
        } catch (e) {
          return JSON.parse(JSON.stringify(DEFAULT_TIERS));
        }
      }
      function saveTierConfig(d) {
        safeLocalStorageSet(TIER_CONFIG_KEY, JSON.stringify(d));
      }

      function getTierList() {
        if (!_tierListData) _tierListData = getData(KEYS.TIER_LIST, {});
        return _tierListData;
      }
      function saveTierList(d) {
        saveData(KEYS.TIER_LIST, d);
      }
      function getTierSnapshots() {
        if (!_tierSnapshotsData)
          _tierSnapshotsData = getData(KEYS.TIER_SNAPSHOTS, []);
        return _tierSnapshotsData;
      }
      function saveTierSnapshots(d) {
        saveData(KEYS.TIER_SNAPSHOTS, d);
      }
      function getUpcoming() {
        if (!_upcomingData) _upcomingData = getData(KEYS.UPCOMING, []);
        return _upcomingData;
      }
      function saveUpcoming(d) {
        saveData(KEYS.UPCOMING, d);
      }

      function loadDefaults() {
        const attrs = getAttributes();
        const defaults = {
          roles: ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"],
          collectibleRarities: [
            "Common",
            "Exceptional",
            "Deluxe",
            "Exquisite",
            "Grand",
            "Supreme",
          ],
          skinRarities: [
            "Basic",
            "Elite",
            "Special",
            "Epic",
            "Legend",
            "Collector",
          ],
          lanes: ["EXP Lane", "Gold Lane", "Mid Lane", "Roam", "Jungle"],
          specialties: [
            "Burst",
            "Crowd Control",
            "Regen",
            "Push",
            "Poke",
            "Guard",
            "Charge",
            "Support",
            "Initiator",
            "Damage",
          ],
          skillCategories: [
            "Damage",
            "Crowd Control",
            "Mobility",
            "Buff",
            "Debuff",
            "Heal/Shield",
            "Passive",
          ],
        };
        let changed = false;
        for (let k in defaults) {
          if (!attrs[k] || !Array.isArray(attrs[k]) || attrs[k].length === 0) {
            attrs[k] = defaults[k];
            changed = true;
          }
        }
        if (changed) saveAttributes(attrs);
      }

      // Keys that support an icon image
      const ATTR_IMAGE_KEYS = [
        "roles",
        "specialties",
        "lanes",
        "nations",
        "skinRarities",
        "collectibleRarities",
        "skillCategories",
        "skinFamilies",
        "items",
        "emblems",
        "emblemTalents",
      ];
      // Keys that support a custom tag color
      const ATTR_COLOR_KEYS = ["skillCategories"];
      // Keys that support a modal background image (shown behind hero modal)
      const ATTR_BG_KEYS = ["nations"];
      const ATTR_TAB_ICONS = {
        roles: "shield_person",
        specialties: "military_tech",
        lanes: "signpost",
        nations: "public",
        skinRarities: "auto_awesome",
        collectibleRarities: "workspace_premium",
        skillCategories: "bolt",
        skinFamilies: "collections",
        items: "shopping_bag",
        emblems: "verified",
        emblemTalents: "stars",
      };
      let currentAttrTab = "roles";

      function renderAttributesPage() {
        const tabsEl = document.getElementById("attr-tabs");
        const container = document.getElementById("attributes-container");
        const attrs = getAttributes();
        const titles = {
          roles: "Hero Roles",
          specialties: "Hero Specialty",
          lanes: "Hero Lanes",
          nations: "Nation",
          skinRarities: "Skin Rarity",
          collectibleRarities: "Skin Collectible Rarity",
          skillCategories: "Skill Category",
          items: "Build Items",
          emblems: "Emblems & Talents",
        };
        const keys = Object.keys(titles);
        if (!keys.includes(currentAttrTab)) currentAttrTab = keys[0];

        // Tab bar
        tabsEl.innerHTML = keys
          .map((key) => {
            const count = key === "emblems"
              ? (attrs.emblems || []).length + (attrs.emblemTalents || []).length
              : (attrs[key] || []).length;
            return `<button class="attr-tab${key === currentAttrTab ? " active" : ""}" onclick="switchAttrTab('${key}')">
              <span class="material-symbols-outlined" style="font-size:18px;">${ATTR_TAB_ICONS[key] || "label"}</span>
              ${titles[key]}
              <span class="attr-tab-count">${count}</span>
            </button>`;
          })
          .join("");

        // Active panel
        const key = currentAttrTab;
        if (!Array.isArray(attrs[key])) attrs[key] = [];
        if (key === "emblems" && !Array.isArray(attrs.emblemTalents)) attrs.emblemTalents = [];
        const hasColor = (k) => ATTR_COLOR_KEYS.includes(k);
        const colMap = getAttributeColors()[key] || {};
        const tagGroupMap = getTagGroupMap();
        const groups = getSkillCatGroups();

        const attrDataEscape = (value) => String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const renderSquare = (v, renderKeyOverride = null) => {
          // IMPORTANT: Array.prototype.map passes (value, index, array).
          // Only treat the second argument as an attribute key when it is explicitly
          // a string. Otherwise standard `.map(renderSquare)` calls would use 0/1/2
          // as the attribute key and lose every image/color in the grid.
          const renderKey = typeof renderKeyOverride === "string" ? renderKeyOverride : key;
          const safeValue = attrDataEscape(v);
          const safeKey = attrDataEscape(renderKey);
          const renderColMap = getAttributeColors()[renderKey] || {};
          const imgUrl = getAttrImage(renderKey, v);
          const color = renderColMap[v] || "";
          const renderHasColor = ATTR_COLOR_KEYS.includes(renderKey);
          const safeImgUrl = attrDataEscape(imgUrl);
          const safeColor = color ? attrDataEscape(color) : "";
          const visualClass = `attr-grid-visual${imgUrl ? " has-image" : ""}${renderHasColor && color ? " has-color" : ""}`;
          const visualStyle = color ? ` style="--attr-peek-color:${safeColor};"` : "";
          const thumbHtml = `<div class="${visualClass}"${visualStyle}>
            ${imgUrl ? `<img class="attr-grid-image" data-attr-grid-image="true" src="${safeImgUrl}" alt="${safeValue}">` : ""}
            ${!imgUrl && renderHasColor && color ? `<span class="attr-grid-color-core" aria-hidden="true"></span>` : ""}
            ${!imgUrl && !(renderHasColor && color) ? `<span class="material-symbols-outlined attr-grid-empty-icon" aria-hidden="true">image</span>` : ""}
          </div>`;
          return `<div class="attr-square-item attr-reorderable" draggable="true" data-attr-key="${safeKey}" data-attr-value="${safeValue}" ondragstart="startAttributeDragFromCard(event,this)" ondragend="endAttributeDrag(event)" ondragover="attributeDragOver(event)" ondragleave="attributeDragLeave(event)" ondrop="dropAttributeFromCard(event,this)">
              <div class="attr-reorder-controls">
                <button type="button" class="attr-order-btn" title="Move earlier" onclick="event.stopPropagation();moveAttributeFromCard(this,-1)"><span class="material-symbols-outlined">chevron_left</span></button>
                <span class="attr-drag-handle material-symbols-outlined" title="Drag to rearrange">drag_indicator</span>
                <button type="button" class="attr-order-btn" title="Move later" onclick="event.stopPropagation();moveAttributeFromCard(this,1)"><span class="material-symbols-outlined">chevron_right</span></button>
              </div>
              <div class="card-overlay-actions">
                <button type="button" class="overlay-btn" title="Edit" onclick="event.stopPropagation();editAttributeFromCard(this)"><span class="material-symbols-outlined">edit</span></button>
                <button type="button" class="overlay-btn delete" title="Delete" onclick="event.stopPropagation();deleteAttributeFromCard(this)"><span class="material-symbols-outlined">delete</span></button>
              </div>
              <div class="attr-square-thumb">${thumbHtml}</div>
              <div class="attr-square-label" title="${safeValue}">${renderHasColor && color ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:5px;"></span>` : ""}${v}</div>${renderKey === "skinRarities" && isSkinSeriesRarity(v) ? `<div class="attr-meta-badges"><span class="attr-meta-badge series"><span class="material-symbols-outlined">collections</span>Series</span></div>` : ""}${renderKey === "items" && getItemCategories(v).length ? `<div class="attr-meta-badges">${getItemCategories(v).map((cat) => `<span class="attr-meta-badge">${cat}</span>`).join("")}</div>` : ""}
            </div>`;
        };

        let squareItems;
        let groupsBox = "";
        if (key === "skillCategories") {
          groupsBox = `<div class="skillcat-groups-box"><h4>Color Groups</h4>${
            groups
              .map(
                (g) =>
                  `<span class="skillcat-group-chip"><span class="swatch" style="background:${g.color};"></span>${g.name}</span>`,
              )
              .join("") ||
            `<div style="color:var(--text-med);font-size:0.85rem;margin-bottom:0.5rem;">No groups yet — group same-colored categories under a shared name.</div>`
          }<div><button class="btn btn-secondary btn-sm" onclick="manageSkillCatGroups()"><span class="material-symbols-outlined" style="font-size:15px;">palette</span> Manage Groups</button></div></div>`;

          const items = attrs[key] || [];
          const byGroup = {};
          const ungrouped = [];
          items.forEach((v) => {
            const gid = tagGroupMap[v];
            if (gid && findSkillCatGroup(gid)) {
              if (!byGroup[gid]) byGroup[gid] = [];
              byGroup[gid].push(v);
            } else {
              ungrouped.push(v);
            }
          });
          let html = "";
          groups.forEach((g) => {
            if (!byGroup[g.id] || !byGroup[g.id].length) return;
            html += `<div class="skillcat-group-heading"><span class="swatch" style="background:${g.color};"></span>${g.name}</div><div class="attr-square-grid">${byGroup[g.id].map(renderSquare).join("")}</div>`;
          });
          if (ungrouped.length) {
            html += `<div class="skillcat-group-heading"><span class="material-symbols-outlined" style="font-size:14px;">label_off</span>Ungrouped</div><div class="attr-square-grid">${ungrouped.map(renderSquare).join("")}</div>`;
          }
          squareItems = html;
        } else {
          squareItems = `<div class="attr-square-grid">${(attrs[key] || []).map(renderSquare).join("")}</div>`;
        }

        const groupOptions = groups
          .map((g) => `<option value="${g.id}">${g.name}</option>`)
          .join("");
        const standardImageAddRow = (addKey, label = "Name") => `<div class="attr-add-row"><input type="text" id="input-${addKey}" class="form-input" placeholder="${label}..." style="flex:2"><input type="url" id="input-img-${addKey}" class="form-input" placeholder="Image URL (optional)" aria-label="Image URL" style="flex:3"><button class="btn btn-primary btn-sm" onclick="addAttribute('${addKey}')">Add</button></div>`;
        // V2.10.5: every attribute type supports an optional image.
        // Do not gate the image input behind ATTR_IMAGE_KEYS; this keeps Add/Edit consistent.
        let addRow = hasColor(key)
          ? `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;"><input type="text" id="input-${key}" class="form-input" placeholder="Add..." style="flex:1;min-width:120px;"><input type="url" id="input-img-${key}" class="form-input" placeholder="Image URL (optional)" aria-label="Image URL" style="flex:1.4;min-width:180px;"><select id="input-group-${key}" class="form-select" style="width:170px;" onchange="onGroupSelectChange('${key}')"><option value="">Custom color</option>${groupOptions}</select><input type="color" id="input-color-${key}" class="form-input" value="#fbbf24" title="Tag color" style="width:52px;padding:2px;flex-shrink:0;"><button class="btn btn-primary btn-sm" onclick="addAttribute('${key}')">Add</button></div>`
          : standardImageAddRow(key);

        if (key === "skinRarities") {
          addRow = `<div class="attr-special-add"><div class="attr-add-row"><input type="text" id="input-skinRarities" class="form-input" placeholder="Rarity / series name..." style="flex:2"><input type="url" id="input-img-skinRarities" class="form-input" placeholder="Image URL (optional)" aria-label="Image URL" style="flex:3"><button class="btn btn-primary btn-sm" onclick="addAttribute('skinRarities')">Add</button></div><label class="attr-inline-check"><input type="checkbox" id="input-series-skinRarities"><span><strong>Skin Series</strong><small>Mark this rarity as a named series/collection so it appears in Skin Series.</small></span></label></div>`;
        } else if (key === "items") {
          addRow = `<div class="attr-special-add">${standardImageAddRow("items", "Equipment name")}<div class="attr-category-editor"><span class="form-label">Equipment Categories <span class="form-label-note">Choose all that apply</span></span><div class="attr-category-pills">${BUILD_ITEM_CATEGORIES.map((cat) => `<label class="attr-category-pill"><input type="checkbox" name="input-item-category" value="${cat}"><span>${cat}</span></label>`).join("")}</div></div></div>`;
        } else if (key === "emblems") {
          const mainGrid = `<div class="attr-square-grid">${(attrs.emblems || []).map((v) => renderSquare(v, "emblems")).join("")}</div>`;
          const talentGrid = `<div class="attr-square-grid">${(attrs.emblemTalents || []).map((v) => renderSquare(v, "emblemTalents")).join("")}</div>`;
          container.innerHTML = `<h3>Emblems &amp; Talents</h3><p class="form-section-help">Main Emblems and Talents live together here. A recommended build chooses exactly one Main Emblem and exactly three Talents.</p><section class="attr-combined-section"><div class="attr-combined-head"><span><span class="material-symbols-outlined">verified</span><strong>Main Emblems</strong></span><small>${(attrs.emblems || []).length}</small></div>${standardImageAddRow("emblems", "Emblem name")}${mainGrid || `<div class="attr-empty">No emblems yet.</div>`}</section><section class="attr-combined-section"><div class="attr-combined-head"><span><span class="material-symbols-outlined">stars</span><strong>Talents</strong></span><small>${(attrs.emblemTalents || []).length}</small></div>${standardImageAddRow("emblemTalents", "Talent name")}${talentGrid || `<div class="attr-empty">No talents yet.</div>`}</section>`;
          return;
        }

        container.innerHTML = `<h3>${titles[key]}</h3>${groupsBox}${addRow}${squareItems || `<div style="color:var(--text-med);font-size:0.85rem;">No items yet.</div>`}`;
      }


      function getAttributeCardContext(el) {
        const card = el?.closest?.(".attr-square-item");
        return card ? { key: card.dataset.attrKey || "", value: card.dataset.attrValue || "" } : { key: "", value: "" };
      }
      function editAttributeFromCard(el) {
        const { key, value } = getAttributeCardContext(el);
        if (key && value) editAttributeFull(key, value);
      }
      function deleteAttributeFromCard(el) {
        const { key, value } = getAttributeCardContext(el);
        if (key && value) deleteAttribute(key, value);
      }
      function moveAttributeFromCard(el, direction) {
        const { key, value } = getAttributeCardContext(el);
        if (key && value) moveAttribute(key, value, direction);
      }
      function startAttributeDragFromCard(event, card) {
        const key = card?.dataset?.attrKey || "";
        const value = card?.dataset?.attrValue || "";
        if (key && value) startAttributeDrag(event, key, value);
      }
      function dropAttributeFromCard(event, card) {
        const key = card?.dataset?.attrKey || "";
        const value = card?.dataset?.attrValue || "";
        if (key && value) dropAttribute(event, key, value);
      }

      function onGroupSelectChange(key) {
        const gid = document.getElementById(`input-group-${key}`).value;
        const colorInp = document.getElementById(`input-color-${key}`);
        if (gid) {
          const g = findSkillCatGroup(gid);
          if (g) {
            colorInp.value = g.color;
            colorInp.disabled = true;
          }
        } else {
          colorInp.disabled = false;
        }
      }

      function switchAttrTab(key) {
        currentAttrTab = key;
        renderAttributesPage();
      }

      function getAttributeReorderPeers(key, value) {
        const values = getAttributes()[key] || [];
        if (key !== "skillCategories") return values;
        const groupMap = getTagGroupMap();
        const groupId = groupMap[value] || "";
        return values.filter((item) => (groupMap[item] || "") === groupId);
      }

      function moveAttribute(key, value, direction) {
        const attrs = getAttributes();
        const values = attrs[key] || [];
        const peers = getAttributeReorderPeers(key, value);
        const peerIndex = peers.indexOf(value);
        const targetValue = peers[peerIndex + direction];
        if (peerIndex < 0 || !targetValue) return;
        const from = values.indexOf(value);
        const to = values.indexOf(targetValue);
        [values[from], values[to]] = [values[to], values[from]];
        saveAttributes(attrs);
        renderAttributesPage();
        populateFilters();
      }

      function startAttributeDrag(event, key, value) {
        draggedAttribute = { key, value };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", value);
        event.currentTarget.classList.add("dragging");
      }

      function endAttributeDrag(event) {
        event.currentTarget?.classList.remove("dragging");
        document.querySelectorAll(".attr-square-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
        draggedAttribute = null;
      }

      function attributeDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add("drag-over");
      }

      function attributeDragLeave(event) {
        event.currentTarget.classList.remove("drag-over");
      }

      function dropAttribute(event, key, targetValue) {
        event.preventDefault();
        document.querySelectorAll(".attr-square-item.dragging,.attr-square-item.drag-over").forEach((el) => el.classList.remove("dragging", "drag-over"));
        if (!draggedAttribute || draggedAttribute.key !== key || draggedAttribute.value === targetValue) {
          draggedAttribute = null;
          return;
        }
        if (key === "skillCategories") {
          const groupMap = getTagGroupMap();
          if ((groupMap[draggedAttribute.value] || "") !== (groupMap[targetValue] || "")) {
            showToast("Reorder skill categories within the same color group.", "info");
            draggedAttribute = null;
            return;
          }
        }
        const attrs = getAttributes();
        const values = attrs[key] || [];
        const from = values.indexOf(draggedAttribute.value);
        let to = values.indexOf(targetValue);
        if (from < 0 || to < 0) return;
        const [moved] = values.splice(from, 1);
        to = values.indexOf(targetValue);
        values.splice(to, 0, moved);
        saveAttributes(attrs);
        draggedAttribute = null;
        renderAttributesPage();
        populateFilters();
      }
