// --- Data & State ---
      const STORAGE_KEY = "crk_wiki_data";
      const DefaultData = {
        cookies: [
          {
            id: "c1",
            name: "GingerBrave",
            rarity: "Common",
            role: "Charge",
            position: "Front",
            elements: [],
            images: {
              head: "https://static.wikia.nocookie.net/cookierunkingdom/images/3/34/GingerBrave_Icon.png/revision/latest?cb=20201217144949",
            },
            skill: {},
          },
          {
            id: "c4",
            name: "Pure Vanilla",
            rarity: "Ancient",
            role: "Healing",
            position: "Rear",
            elements: ["Light"],
            images: {
              head: "https://static.wikia.nocookie.net/cookierunkingdom/images/d/d7/Pure_Vanilla_Cookie_Icon.png/revision/latest?cb=20210408151859",
            },
            skill: {},
          },
        ],
        attributes: {
          rarity: [
            {
              name: "Common",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/4/4b/Common.png",
            },
            {
              name: "Rare",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/5/52/Rare.png",
            },
            {
              name: "Epic",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/a/a2/Epic.png",
            },
            {
              name: "Super Epic",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/8/86/Super_Epic.png",
            },
            {
              name: "Legendary",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/5/58/Legendary.png",
            },
            {
              name: "Ancient",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/4/45/Ancient.png",
            },
            {
              name: "Beast",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/e/ed/Beast.png",
            },
            {
              name: "Dragon",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/c/c2/Dragon.png",
            },
            {
              name: "Special",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/9/9f/Special.png",
            },
          ],
          role: [
            {
              name: "Charge",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/0/00/Charge.png",
            },
            {
              name: "Defense",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/1/1b/Defense.png",
            },
            {
              name: "Magic",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/0/01/Magic.png",
            },
            {
              name: "Ambush",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/5/50/Ambush.png",
            },
            {
              name: "Ranged",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/a/a6/Ranged.png",
            },
            {
              name: "Bomber",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/7/77/Bomber.png",
            },
            {
              name: "Support",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/9/9b/Support.png",
            },
            {
              name: "Healing",
              icon: "https://static.wikia.nocookie.net/cookierunkingdom/images/f/f3/Healing.png",
            },
          ],
          position: ["Front", "Middle", "Rear"].map((n) => ({ name: n })),
          element: [
            "Fire",
            "Ice",
            "Electric",
            "Poison",
            "Earth",
            "Light",
            "Dark",
            "Water",
          ].map((n) => ({ name: n })),
          skinRarity: [
            "Common",
            "Rare",
            "Epic",
            "Super Epic",
            "Legendary",
            "Special",
          ].map((n) => ({ name: n })),
          powerupType: ["Magic Candy", "Crystal Jam"].map((n) => ({ name: n })),
        },
        costumes: [],
        powerups: [],
        tierList: { S: [], A: [], B: [], C: [], D: [] },
        tierMeta: [
          { id: "S", label: "S", color: "#FFCDD2" },
          { id: "A", label: "A", color: "#F8BBD0" },
          { id: "B", label: "B", color: "#E1BEE7" },
          { id: "C", label: "C", color: "#D1C4E9" },
          { id: "D", label: "D", color: "#C5CAE9" },
        ],
      };

      // ============================================================
      // DB — server-backed replacement for localStorage.
      // All app data (cookies, costumes, powerups, attributes, tier
      // list, etc.) lives in a database on the server instead of the
      // browser, so it's shared, persistent, and not capped by the
      // browser's ~5-10MB localStorage quota. Reads are public; writes
      // require an admin login (see ADMIN below).
      //
      // The interface intentionally mirrors localStorage.getItem /
      // setItem so the rest of the app barely had to change.
      // ============================================================
      const DB = {
        _cache: {},
        _loaded: false,
        _token: null,
        async init() {
          this._token = window.localStorage.getItem("crk_admin_token") || null;
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
                  window.localStorage.removeItem("crk_admin_token");
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
                window.localStorage.removeItem("crk_admin_token");
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
          window.localStorage.setItem("crk_admin_token", token);
          updateAdminUI();
        },
        logout() {
          DB._token = null;
          window.localStorage.removeItem("crk_admin_token");
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

      // persistAppData — the single write path for the whole appData blob.
      // Gated by DB.setItem: non-admins get prompted to sign in instead.
      function persistAppData() {
        return DB.setItem(STORAGE_KEY, JSON.stringify(appData));
      }

      function promptEdit(title, val, onSave) {
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal"><h3 style="margin-top:0;">${title}</h3><input type="text" id="prompt-input" class="form-input" value="${String(val).replace(/"/g, "&quot;")}" style="margin-bottom:1rem;"><div class="confirm-actions"><button class="btn btn-secondary" id="prompt-cancel">Cancel</button><button class="btn btn-primary" id="prompt-ok">Save</button></div></div>`;
        document.body.appendChild(overlay);
        const input = document.getElementById("prompt-input");
        input.focus();
        input.select();
        document.getElementById("prompt-cancel").onclick = () =>
          overlay.remove();
        const submit = () => {
          const v = input.value.trim();
          if (v) onSave(v);
          overlay.remove();
        };
        document.getElementById("prompt-ok").onclick = submit;
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
      }

      // ============================================================
      // Backup & Database manager — export/import the whole appData
      // blob as a JSON file, and a small storage report. crk keeps all
      // its data under one key (STORAGE_KEY), unlike mlbb's many keys,
      // so this is a simpler single-entry version of the same idea.
      // ============================================================
      function formatBytes(n) {
        if (n < 1024) return n + " B";
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
        return (n / (1024 * 1024)).toFixed(2) + " MB";
      }
      function getStorageReport() {
        const v = DB.getItem(STORAGE_KEY) || "";
        const bytes = new Blob([v]).size;
        const rows = [{ key: STORAGE_KEY, label: "App Data", bytes }];
        let otherBytes = 0;
        for (let i = 0; i < DB.length; i++) {
          const k = DB.key(i);
          if (k !== STORAGE_KEY)
            otherBytes += new Blob([DB.getItem(k) || ""]).size;
        }
        if (otherBytes > 0) {
          rows.push({ key: "__other__", label: "Other", bytes: otherBytes });
        }
        return { rows, total: bytes + otherBytes };
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
          (appData.cookies || []).forEach((c) => scan(c, c.name, "Cookie"));
        } catch (e) {}
        try {
          (appData.costumes || []).forEach((c) => scan(c, c.name, "Costume"));
        } catch (e) {}
        try {
          (appData.powerups || []).forEach((p) => scan(p, p.name, "Power-up"));
        } catch (e) {}
        results.sort((a, b) => b.bytes - a.bytes);
        return results;
      }
      function exportAllData() {
        const data = {};
        for (let i = 0; i < DB.length; i++) {
          const k = DB.key(i);
          data[k] = DB.getItem(k);
        }
        const payload = {
          app: "crk-cookie-database",
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
        a.download = `crk-backup-${ts}.json`;
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
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            showToast("Invalid backup file", "info");
            return;
          }
          const keys = Object.keys(data);
          if (!keys.length) {
            showToast("Backup contains no stored data", "info");
            return;
          }
          // Restoring shared/server data is intentionally admin-only.
          // A backup can still be exported by everyone, but only an
          // authenticated admin may overwrite the live database.
          if (!ADMIN.isAdmin) {
            showToast("Sign in as admin to restore the shared database", "info");
            openAdminLoginModal();
            return;
          }
          showConfirm(
            "This will overwrite the live database (for everyone) with this backup file. Continue?",
            async () => {
              showToast("Restoring backup...", "info");
              const failed = [];
              // Sequential + awaited on purpose: a partially-applied
              // backup (some keys saved, some not) is worse than a slow
              // restore, so we wait for each PUT before moving on and
              // only reload once every key has actually landed.
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
        const existing = document.querySelector(".confirm-modal-overlay");
        if (existing) existing.remove();
        const { rows, total } = getStorageReport();
        const oversized = findOversizedFields();
        const rowsHtml =
          rows
            .filter((r) => r.bytes > 0)
            .map(
              (r) =>
                `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.85rem;"><span>${r.label}</span><span style="color:var(--text-muted);">${formatBytes(r.bytes)}</span></div>`,
            )
            .join("") ||
          `<div style="color:var(--text-muted);font-size:0.85rem;">No data stored yet.</div>`;
        const oversizedHtml = oversized.length
          ? `<div style="margin-top:1rem;"><div class="form-label" style="color:#f87171;">Unusually large fields (likely a pasted image instead of a link)</div>${oversized
              .slice(0, 8)
              .map(
                (o) =>
                  `<div style="font-size:0.78rem;color:var(--text-muted);padding:0.2rem 0;">${o.source} "${o.name}" → ${o.field} (${formatBytes(o.bytes)})</div>`,
              )
              .join("")}</div>`
          : "";
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.innerHTML = `<div class="confirm-modal" style="min-width:380px;text-align:left;"><h3 style="margin-top:0;text-align:center;">Backup &amp; Database</h3><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;"><span class="form-label" style="margin:0;">Total stored</span><span style="font-weight:700;">${formatBytes(total)}</span></div><div style="max-height:220px;overflow-y:auto;margin-bottom:0.5rem;">${rowsHtml}</div>${oversizedHtml}<p style="color:var(--text-muted);font-size:0.8rem;margin:1rem 0 0.5rem;">Data lives in the server database and is shared by everyone. Exporting works for all visitors; importing a backup overwrites the shared database and requires Admin Sign In.</p><input type="file" id="import-file-input" accept="application/json" style="display:none;"><div class="confirm-actions" style="flex-wrap:wrap;"><button class="btn btn-secondary" id="storage-close">Close</button><button class="btn btn-secondary" id="storage-import">Import Backup</button><button class="btn btn-primary" id="storage-export">Export Backup</button></div></div>`;
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

      let appData = DefaultData;

      // Sidebar State Persistence
      const savedSidebarState = localStorage.getItem("sidebar_collapsed");
      if (savedSidebarState === "true") {
        const sb = document.getElementById("sidebar");
        const btn = document.getElementById("toggle-sidebar");
        sb.classList.add("collapsed");
        btn.innerHTML = `<span class="material-symbols-outlined">menu</span>`;
      }

      // Helper to capitalize first letter
      const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

      function getActivePage() {
        const p = document.querySelector(".page.active");
        return p ? p.id : "unknown";
      }

      // Toggle section collapse and remember state
      function toggleSection(el) {
        const section = el.closest(".category-section");
        section.classList.toggle("collapsed");

        // Save collapse state with page prefix to avoid cross-page conflicts
        const title = getActivePage() + ":" + el.textContent.trim();
        const collapsedSections = JSON.parse(
          localStorage.getItem("collapsedSections") || "{}",
        );
        if (section.classList.contains("collapsed")) {
          collapsedSections[title] = true;
        } else {
          delete collapsedSections[title];
        }
        localStorage.setItem(
          "collapsedSections",
          JSON.stringify(collapsedSections),
        );
      }

      // Restore collapsed sections from memory
      function restoreCollapsedSections() {
        const collapsedSections = JSON.parse(
          localStorage.getItem("collapsedSections") || "{}",
        );
        const prefix = getActivePage() + ":";
        document.querySelectorAll(".category-section").forEach((section) => {
          const rawTitle = section
            .querySelector(".category-title")
            .textContent.trim();
          if (collapsedSections[prefix + rawTitle]) {
            section.classList.add("collapsed");
          }
        });
      }

      // Helper to get attribute object safely without collision
      function getAttr(cat, name) {
        if (!appData.attributes[cat]) return {};
        return appData.attributes[cat].find((x) => x.name === name) || {};
      }

      // --- Cycle Management ---
      const ActiveCycles = [];

      function registerCycle(id, items, callback) {
        if (!items || items.length <= 1) return;
        let idx = 0;
        const int = setInterval(() => {
          idx = (idx + 1) % items.length;
          const el = document.getElementById(id);
          if (el) {
            callback(el, items[idx]);
          } else {
            clearInterval(int);
          }
        }, 2000);
        ActiveCycles.push({ id, int });
      }

      function clearCycles() {
        ActiveCycles.forEach((c) => clearInterval(c.int));
        ActiveCycles.length = 0;
      }


