window.APP_VERSION="v1.2.8"; /* single place to bump the version shown in the top bar */
/* Safe single-quoted JS string literal for inline handlers inside double-quoted HTML attributes. */
window.jsq=function(v){return "'"+String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+"'";};
/* Shared helpers used across files (single source of truth). */
window.crk=(function(){
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const NO_IMG="https://placehold.co/900x650/193b68/fff?text=No+Image";
  const attrOf=(cat,name)=>(appData?.attributes?.[cat]||[]).find(x=>x.name===name);
  const attrIco=(cat,v,cls="attr-ico")=>{const a=attrOf(cat,v);return a?.icon?`<img class="${cls}" src="${esc(a.icon)}" alt="">`:"";};
  const pic=(u,cls="")=>`<img class="${cls}" src="${esc(u||NO_IMG)}" alt="" onerror="this.onerror=null;this.src='${NO_IMG}'">`;
  const ownerOf=id=>(appData.cookies||[]).find(c=>c.id===id);
  const headOf=(c,fb)=>c?.images?.head||fb||"";
  const glyph=(n,cls="")=>`<span class="material-symbols-outlined ${cls}">${n}</span>`;
  const headImg=(c,fb,cls="mini-head")=>{const u=headOf(c,fb);return u?pic(u,cls):`<span class="${cls} mini-head-empty material-symbols-outlined">cookie</span>`;};
  const isGlyph=s=>/^[a-z][a-z0-9_]*$/.test(s||"");
  const clean=u=>typeof cleanUrl==="function"?cleanUrl(u||""):String(u||"").trim();
  return {esc,NO_IMG,attrOf,attrIco,pic,ownerOf,headOf,headImg,glyph,isGlyph,clean};
})();
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
        const modal=document.getElementById("modal-admin-login");
        if(!modal){return;}
        openModal("modal-admin-login");
        const input=document.getElementById("admin-password-input");
        const errEl=document.getElementById("admin-login-error");
        if(errEl){errEl.hidden=true;errEl.textContent="";}
        if(input){input.value="";setTimeout(()=>{input.focus();input.select();},40);}
        const submit=document.getElementById("admin-login-submit");
        if(submit && !submit.dataset.bound){
          submit.dataset.bound="1";
          submit.addEventListener("click",async()=>{
            const pw=input?.value||""; if(!pw)return;
            try{await ADMIN.login(pw);closeModal("modal-admin-login");if(input)input.value="";showToast("Signed in as admin","success");}
            catch(e){if(errEl){errEl.textContent=e.message||"Login failed";errEl.hidden=false;}input?.focus();}
          });
        }
        if(input && !input.dataset.bound){input.dataset.bound="1";input.addEventListener("keydown",e=>{if(e.key==="Enter")submit?.click();if(e.key==="Escape")closeModal("modal-admin-login");});}
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
        const raw=DB.getItem(STORAGE_KEY)||JSON.stringify(appData);
        const payload={app:"crk-cookie-database",version:1,exportedAt:new Date().toISOString(),data:{[STORAGE_KEY]:raw}};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=`crk-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
        document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
        showToast("JSON backup exported","success");
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
          let data = payload && payload.data ? payload.data : payload;
          if (data && data.cookies && !data[STORAGE_KEY]) data = {[STORAGE_KEY]: JSON.stringify(data)};
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
      
      let appData = DefaultData;

      // Sidebar State Persistence
      const savedSidebarState = localStorage.getItem("sidebar_collapsed");
      if (savedSidebarState === "true") {
        const sb = document.getElementById("sidebar");
        const btn = document.getElementById("toggle-sidebar");
        sb.classList.add("collapsed");
        btn.innerHTML = `<span class="material-symbols-outlined">chevron_right</span>`;
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



/* ---------- Admin login close + backup/database dialog ---------- */
(function(){
  const {esc,NO_IMG,attrOf,attrIco,pic,ownerOf,headOf,headImg,glyph,isGlyph,clean}=window.crk;
  window.closeAdminLoginModal=function(){closeModal('modal-admin-login');const i=document.getElementById('admin-password-input');if(i)i.value='';};

  const closeDialog = () => document.querySelector(".confirm-modal-overlay")?.remove();
  window.openStorageManager = function () {
    closeDialog();
    const { rows, total } = getStorageReport();
    const fmtB = typeof formatBytes === "function" ? formatBytes : n => n + " B";
    const rowsHtml = rows.filter(r => r.bytes > 0).map(r => `<div class="bk-row"><span>${esc(r.label)}</span><b>${fmtB(r.bytes)}</b></div>`).join("") || `<div class="empty-inline">No data stored yet.</div>`;
    const ov = document.createElement("div");
    ov.className = "confirm-modal-overlay";
    ov.innerHTML = `<div class="confirm-modal bk-dialog" role="dialog" aria-modal="true"><div class="bk-head">${glyph("database")}<h3>Backup &amp; database</h3><button type="button" class="bk-x" id="bk-close" aria-label="Close">${glyph("close")}</button></div>
      <div class="bk-body" id="bk-body"><div class="bk-section"><div class="bk-label">Stored data</div>${rowsHtml}<div class="bk-row bk-total"><span>Total</span><b>${fmtB(total)}</b></div></div>
      <div class="bk-actions"><button type="button" class="btn btn-secondary" id="bk-export">${glyph("download")}Export JSON</button><button type="button" class="btn btn-primary" id="bk-import">${glyph("upload")}Import JSON</button></div>
      <input type="file" id="bk-file" accept=".json,application/json" hidden></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov) closeDialog(); });
    document.getElementById("bk-close").onclick = closeDialog;
    document.getElementById("bk-export").onclick = () => exportAllData();
    const file = document.getElementById("bk-file");
    document.getElementById("bk-import").onclick = () => file.click();
    file.onchange = () => { const f = file.files[0]; if (f) previewImport(f); file.value = ""; };
  };
  function previewImport(f) {
    const rd = new FileReader();
    rd.onerror = () => showToast("Couldn't read that file", "error");
    rd.onload = () => {
      let payload; try { payload = JSON.parse(rd.result); } catch (_) { showToast("That isn't valid JSON", "error"); return; }
      let data = payload && payload.data ? payload.data : payload;
      if (data && data.cookies && !data[STORAGE_KEY]) data = { [STORAGE_KEY]: JSON.stringify(data) };
      if (!data || typeof data !== "object" || Array.isArray(data) || !Object.keys(data).length) { showToast("No backup data found in that file", "error"); return; }
      const keys = Object.keys(data);
      const info = k => { try { const o = typeof data[k] === "string" ? JSON.parse(data[k]) : data[k]; return o && o.cookies ? `${(o.cookies || []).length} cookies, ${(o.costumes || []).length} costumes, ${(o.powerups || []).length} power-ups` : "data"; } catch (_) { return "data"; } };
      const body = document.getElementById("bk-body"); if (!body) return;
      body.innerHTML = `<div class="bk-section"><div class="bk-label">Ready to restore from ${esc(f.name)}</div>${keys.map(k => `<div class="bk-row" data-key="${esc(k)}"><span>${esc(k)}<small>${esc(info(k))}</small></span><b class="bk-status">Waiting</b></div>`).join("")}<p class="bk-warn">${glyph("warning")}This replaces the live database for everyone. Export a backup first if unsure.</p></div>
        <div class="bk-actions"><button type="button" class="btn btn-secondary" id="bk-cancel">Cancel</button><button type="button" class="btn btn-primary" id="bk-restore">${glyph("restore")}Restore</button></div>`;
      document.getElementById("bk-cancel").onclick = () => openStorageManager();
      document.getElementById("bk-restore").onclick = async () => {
        if (!ADMIN.isAdmin) { showToast("Sign in as admin to restore", "info"); closeDialog(); openAdminLoginModal(); return; }
        document.getElementById("bk-restore").disabled = true; document.getElementById("bk-cancel").disabled = true;
        let failed = 0;
        for (const k of keys) { // one key at a time, waiting for each save
          const row = body.querySelector(`[data-key="${CSS.escape(k)}"] .bk-status`); if (row) row.textContent = "Saving…";
          const ok = await DB.setItemAwaited(k, data[k]); if (!ok) failed++;
          if (row) { row.textContent = ok ? "Done" : "Failed"; row.className = "bk-status " + (ok ? "ok" : "bad"); }
        }
        if (failed) { showToast(`${failed} item(s) failed to save`, "error"); document.getElementById("bk-cancel").disabled = false; }
        else { showToast("Backup restored", "success"); setTimeout(() => location.reload(), 900); }
      };
    };
    rd.readAsText(f);
  }


})();
