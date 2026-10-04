// --- Attributes ---
      function switchAttrTab(btn, cat) {
        document
          .querySelectorAll(".attr-tab")
          .forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("attr-cat").value = cat;
        // Show BG field only on powerupType tab
        document.getElementById("attr-bg-group").style.display =
          cat === "powerupType" ? "" : "none";
        // Reset edit state on tab switch
        document.getElementById("attr-edit-idx").value = "";
        document.getElementById("btn-add-attr").innerText = "Add";
        document.getElementById("btn-add-attr").className = "btn btn-secondary";
        document.getElementById("attr-name").value = "";
        document.getElementById("attr-icon").value = "";
        document.getElementById("attr-bg").value = "";
        renderAttributes();
      }

      function renderAttributes() {
        const cat = document.getElementById("attr-cat").value;
        const list = document.getElementById("attr-list");
        list.innerHTML = appData.attributes[cat]
          .map(
            (a, i) => `
            <div class="attr-square-card">
              ${a.icon ? `<img src="${a.icon}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined" style="font-size:32px;color:rgba(255,255,255,0.2)">category</span>`}
              <div class="attr-name">${a.name}</div>
              ${a.background ? `<div style="font-size:0.6rem;color:#888;position:absolute;bottom:4px;left:0;right:0;text-align:center;">Has BG</div>` : ""}
              <div class="attr-card-actions">
                <button class="action-btn" onclick="editAttr('${cat}', ${i})" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button class="action-btn delete" onclick="deleteAttr('${cat}', ${i})" title="Delete"><span class="material-symbols-outlined">delete</span></button>
              </div>
            </div>
          `,
          )
          .join("");

        if (!document.getElementById("attr-edit-idx").value) {
          document.getElementById("btn-add-attr").innerText = "Add";
          document.getElementById("btn-add-attr").className =
            "btn btn-secondary";
        }
      }

      function editAttr(cat, idx) {
        const item = appData.attributes[cat][idx];
        if (!item) return;
        document.getElementById("attr-name").value = item.name;
        document.getElementById("attr-icon").value = item.icon || "";
        document.getElementById("attr-bg").value = item.background || "";
        // Show BG field only for powerupType
        document.getElementById("attr-bg-group").style.display =
          cat === "powerupType" ? "" : "none";

        document.getElementById("attr-edit-idx").value = idx;
        const btn = document.getElementById("btn-add-attr");
        btn.innerText = "Update";
        btn.className = "btn btn-primary";
      }

      function addAttribute() {
        const cat = document.getElementById("attr-cat").value;
        const name = document.getElementById("attr-name").value;
        const icon = cleanUrl(document.getElementById("attr-icon").value);
        const bg = cleanUrl(document.getElementById("attr-bg").value);
        const editIdx = document.getElementById("attr-edit-idx").value;

        if (name) {
          const newAttr = { name, icon, background: bg };

          if (editIdx !== "") {
            // Update existing
            appData.attributes[cat][parseInt(editIdx)] = newAttr;
            document.getElementById("attr-edit-idx").value = ""; // Reset
            showToast("Attribute Updated");
          } else {
            // Add new
            appData.attributes[cat].push(newAttr);
            showToast("Attribute Added");
          }

          // Clear inputs
          document.getElementById("attr-name").value = "";
          document.getElementById("attr-icon").value = "";
          document.getElementById("attr-bg").value = "";

          renderAttributes();
          persistAppData();
        }
      }
      function deleteAttr(cat, i) {
        showConfirm("Delete Attribute?", () => {
          appData.attributes[cat].splice(i, 1);
          persistAppData();
          renderAttributes();
        });
      }

      function updateGuestFieldVisibility() {
        const rarity = getDropdownValue("cf-rarity");
        const isGuest = rarity === "Guest";
        [
          "cf-role-group",
          "cf-pos-group",
          "cf-elements-group",
          "cf-skill-section",
        ].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = isGuest ? "none" : "";
        });
      }

      function setCookieGroup(btn, val) {
        document
          .querySelectorAll('.group-pill[onclick*="setCookieGroup"]')
          .forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("sort-cookie").value = val;
        const initial = getUiSettings?.().defaultPage || "dashboard";
        switchTab(initial);
      }
      function setSkinsGroup(btn, val) {
        document
          .querySelectorAll('.group-pill[onclick*="setSkinsGroup"]')
          .forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("sort-skins").value = val;
        renderSkins();
      }
      function setPowerupsGroup(btn, val) {
        document
          .querySelectorAll('.group-pill[onclick*="setPowerupsGroup"]')
          .forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("sort-powerups").value = val;
        renderAllPowerups();
      }

      // Init
      async function bootApp() {
        const loadingEl = document.getElementById("db-loading-screen");
        await DB.init();
        try {
          const stored = DB.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            appData = {
              ...DefaultData,
              ...parsed,
              attributes: {
                ...DefaultData.attributes,
                ...(parsed.attributes || {}),
              },
              tierMeta: parsed.tierMeta || DefaultData.tierMeta,
              tierList: { ...DefaultData.tierList, ...(parsed.tierList || {}) },
              tierLists: parsed.tierLists || null,
              tierVersions: parsed.tierVersions || { pve: [], pvp: [] },
            };
          }
        } catch (e) {
          console.error("Error parsing server data, resetting to defaults:", e);
        }
        updateAdminUI();
        if (loadingEl) loadingEl.remove();
        initUrlPreviews(); // Global hook
        setupBackToTop(); // Initialize back-to-top button
        const initial=getUiSettings?.().defaultPage||"dashboard";
        switchTab(initial);
      }
    
