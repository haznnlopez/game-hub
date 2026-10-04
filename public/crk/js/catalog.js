/* CRK catalog layer — MLBB-style search, filters, sorting and compact cards. */
(function () {
  const state = {
    cookieSearch: "",
    costumeSearch: "",
    powerupSearch: "",
    cookieFilters: { rarity: new Set(), role: new Set(), position: new Set(), element: new Set() },
    costumeFilters: { rarity: new Set(), owner: new Set(), set: new Set() },
    powerupFilters: { type: new Set() },
    cookieSort: "name",
    costumeSort: "name",
    powerupSort: "name",
    timers: {},
  };
  window.crkCatalogState = state;

  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const img = (src, fallback = "https://placehold.co/120x120/193b68/fff?text=?") => src ? `src="${esc(src)}" onerror="this.onerror=null;this.src='${fallback}'"` : `src="${fallback}"`;
  const attr = (cat, name) => window.getAttr ? getAttr(cat, name) : {};

  function debounce(key, fn, delay = 260) {
    clearTimeout(state.timers[key]);
    state.timers[key] = setTimeout(fn, delay);
  }

  function optionNames(cat) {
    return (appData.attributes?.[cat] || []).map((x) => x.name).filter(Boolean);
  }

  function pill(label, active, action, extra = "") {
    return `<button type="button" class="filter-pill ${active ? "active" : ""}" ${extra} onclick="${action}">${esc(label)}</button>`;
  }

  function renderFilterRail(id, groups, filterState, rerender) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = groups.map((g) => {
      const values = g.values;
      const selected = filterState[g.key];
      return `<div class="filter-group"><span class="filter-group-label">${esc(g.label)}</span><div class="filter-group-pills">${pill("All", selected.size === 0, `clearCatalogFilter('${g.key}','${rerender}')`)}${values.map((v) => pill(v, selected.has(v), `toggleCatalogFilter('${g.key}',${JSON.stringify(v)},'${rerender}')`)).join("")}</div></div>`;
    }).join("");
  }

  window.toggleCatalogFilter = function (key, value, target) {
    const map = target === "cookies" ? state.cookieFilters : target === "costumes" ? state.costumeFilters : state.powerupFilters;
    if (!map[key]) map[key] = new Set();
    map[key].has(value) ? map[key].delete(value) : map[key].add(value);
    target === "cookies" ? renderCookies() : target === "costumes" ? renderSkins() : renderAllPowerups();
  };
  window.clearCatalogFilter = function (key, target) {
    const map = target === "cookies" ? state.cookieFilters : target === "costumes" ? state.costumeFilters : state.powerupFilters;
    if (map[key]) map[key].clear();
    target === "cookies" ? renderCookies() : target === "costumes" ? renderSkins() : renderAllPowerups();
  };

  function renderSortPills(id, options, current, target) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = options.map(([value, label]) => `<button type="button" class="sort-pill ${current === value ? "active" : ""}" onclick="setCatalogSort('${target}','${value}')">${esc(label)}</button>`).join("");
  }
  window.setCatalogSort = function (target, value) {
    if (target === "cookies") state.cookieSort = value;
    if (target === "costumes") state.costumeSort = value;
    if (target === "powerups") state.powerupSort = value;
    target === "cookies" ? renderCookies() : target === "costumes" ? renderSkins() : renderAllPowerups();
  };

  function iconFor(cat, name, cls = "tag-icon") {
    const a = attr(cat, name);
    return a?.icon ? `<img class="${cls}" ${img(a.icon)} alt="">` : "";
  }

  function cardActions(type, id) {
    return getCardActions(type, id);
  }

  window.renderCookies = function () {
    clearCycles();
    const container = document.getElementById("cookie-container");
    if (!container) return;
    const q = state.cookieSearch;
    let list = (appData.cookies || []).filter((c) => {
      const hay = [c.name, c.rarity, c.role, c.position, ...(c.elements || [])].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      const f = state.cookieFilters;
      if (f.rarity.size && !f.rarity.has(c.rarity)) return false;
      if (f.role.size && !f.role.has(c.role)) return false;
      if (f.position.size && !f.position.has(c.position)) return false;
      if (f.element.size && !(c.elements || []).some((e) => f.element.has(e))) return false;
      return true;
    });
    const rarityOrder = optionNames("rarity");
    list.sort((a, b) => {
      if (state.cookieSort === "rarity") return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity) || a.name.localeCompare(b.name);
      if (state.cookieSort === "rarity-desc") return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity) || a.name.localeCompare(b.name);
      if (state.cookieSort === "newest") return String(b.id).localeCompare(String(a.id));
      if (state.cookieSort === "name-desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

    renderFilterRail("cookie-filter-pills", [
      { key: "rarity", label: "Rarity", values: optionNames("rarity") },
      { key: "role", label: "Role", values: optionNames("role") },
      { key: "position", label: "Position", values: optionNames("position") },
      { key: "element", label: "Element", values: optionNames("element") },
    ], state.cookieFilters, "cookies");
    renderSortPills("cookie-sort-pills", [["name","Name"],["name-desc","Name Z–A"],["rarity","Rarity"],["rarity-desc","Rarity ↓"],["newest","Newest"]], state.cookieSort, "cookies");

    if (!list.length) { container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">search_off</span><strong>No cookies found</strong><span>Try another search or filter.</span></div>`; return; }
    container.innerHTML = `<div class="card-grid crk-cookie-grid">${list.map((c) => {
      const isGuest = c.rarity === "Guest";
      const tags = isGuest ? "" : `<div class="cookie-card-left-tags">${iconFor("role", c.role)}${iconFor("position", c.position)}${(c.elements || []).map((e) => iconFor("element", e)).join("")}</div>`;
      const wk = "cookie_" + c.id, mf = getCookieMissingFields(c);
      registerWarning(wk, mf, () => renderCookies());
      return `<article class="card crk-cookie-card" onclick="openCookieDetail('${esc(c.id)}')">
        <img class="card-img" ${img(c.images?.card || c.images?.splash || c.images?.head)} alt="${esc(c.name)}">
        ${tags}
        <div class="card-overlay"><div class="card-text-wrapper crk-card-name-pop"><div class="card-name">${esc(c.name)}</div><div class="card-sub">${iconFor("rarity", c.rarity)} ${esc(c.rarity)}</div></div></div>
        ${makeWarningBtn(wk, mf, () => renderCookies())}${cardActions("cookie", c.id)}
      </article>`;
    }).join("")}</div>`;
  };

  window.renderSkins = function () {
    clearCycles();
    const container = document.getElementById("costume-grid");
    if (!container) return;
    const q = state.costumeSearch;
    let list = (appData.costumes || []).filter((s) => {
      const owner = appData.cookies.find((c) => c.id === s.ownerId);
      const hay = [s.name, s.rarity, s.set, owner?.name].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      const f = state.costumeFilters;
      if (f.rarity.size && !f.rarity.has(s.rarity)) return false;
      if (f.owner.size && !f.owner.has(owner?.name)) return false;
      if (f.set.size && !f.set.has(s.set || "No Set")) return false;
      return true;
    });
    const rarityOrder = optionNames("skinRarity");
    list.sort((a,b) => {
      if (state.costumeSort === "rarity") return rarityOrder.indexOf(a.rarity)-rarityOrder.indexOf(b.rarity) || a.name.localeCompare(b.name);
      if (state.costumeSort === "rarity-desc") return rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity) || a.name.localeCompare(b.name);
      if (state.costumeSort === "owner") return (appData.cookies.find(c=>c.id===a.ownerId)?.name||"").localeCompare(appData.cookies.find(c=>c.id===b.ownerId)?.name||"");
      if (state.costumeSort === "newest") return b._addedAt ? a._addedAt ? b._addedAt-a._addedAt : -1 : 0;
      if (state.costumeSort === "name-desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
    const owners = [...new Set(appData.cookies.map(c=>c.name).filter(Boolean))].sort();
    const sets = [...new Set((appData.costumes||[]).map(c=>c.set||"No Set"))].sort();
    renderFilterRail("costume-filter-pills", [
      { key:"rarity", label:"Rarity", values:optionNames("skinRarity") },
      { key:"owner", label:"Cookie", values:owners },
      { key:"set", label:"Set", values:sets },
    ], state.costumeFilters, "costumes");
    renderSortPills("costume-sort-pills", [["name","Name"],["name-desc","Name Z–A"],["rarity","Rarity"],["rarity-desc","Rarity ↓"],["owner","Cookie"],["newest","Newest"]], state.costumeSort, "costumes");
    if (!list.length) { container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">search_off</span><strong>No costumes found</strong><span>Try another search or filter.</span></div>`; return; }
    container.innerHTML = `<div class="card-grid crk-costume-grid">${list.map((s) => {
      const idx = appData.costumes.indexOf(s), owner = appData.cookies.find(c=>c.id===s.ownerId);
      const wk="skin_"+idx,mf=getSkinMissingFields(s); registerWarning(wk,mf,()=>renderSkins());
      return `<article class="card crk-costume-card" onclick="viewSkin(${idx})"><img class="card-img" ${img(s.card||s.splash||s.sprite)} alt="${esc(s.name)}"><div class="costume-card-owner">${owner?.images?.head?`<img ${img(owner.images.head)} alt="">`:""}</div><div class="card-overlay"><div class="card-text-wrapper crk-card-name-pop"><div class="card-name">${esc(s.name)}</div><div class="card-sub">${iconFor("skinRarity",s.rarity)} ${esc(s.rarity)}</div></div></div>${makeWarningBtn(wk,mf,()=>renderSkins())}${cardActions("skin",idx)}</article>`;
    }).join("")}</div>`;
  };

  window.renderAllPowerups = function () {
    clearCycles();
    const container = document.getElementById("all-powerups-grid"); if (!container) return;
    const q=state.powerupSearch; let list=(appData.powerups||[]).filter(p=>{
      const owner=appData.cookies.find(c=>c.id===p.ownerId); const hay=[p.name,p.type,p.desc,owner?.name].join(" ").toLowerCase();
      if(q&&!hay.includes(q)) return false; if(state.powerupFilters.type.size&&!state.powerupFilters.type.has(p.type)) return false; return true;
    });
    list.sort((a,b)=>state.powerupSort==="name-desc"?b.name.localeCompare(a.name):state.powerupSort==="type"?(a.type||"").localeCompare(b.type||""):a.name.localeCompare(b.name));
    renderFilterRail("powerup-filter-pills",[{key:"type",label:"Category",values:optionNames("powerupType")}],state.powerupFilters,"powerups");
    renderSortPills("powerup-sort-pills",[["name","Name"],["name-desc","Name Z–A"],["type","Category"]],state.powerupSort,"powerups");
    if(!list.length){container.innerHTML=`<div class="empty-state"><span class="material-symbols-outlined">search_off</span><strong>No power-ups found</strong></div>`;return;}
    container.innerHTML=`<div class="pu-grid crk-powerup-grid">${list.map(p=>{const idx=appData.powerups.indexOf(p),owner=appData.cookies.find(c=>c.id===p.ownerId),type=attr("powerupType",p.type);const source=[p.url10,p.url20,p.url30].filter(Boolean);const first=source[0]||owner?.images?.head||"";return `<article class="pu-card crk-powerup-card" onclick="viewPowerup(${idx})"><div class="pu-img-container"><img class="pu-cycle-img" ${img(first)} alt="${esc(p.name)}"></div><div class="card-overlay"><div class="card-text-wrapper"><div class="card-name">${esc(p.name)}</div><div class="card-sub">${type?.icon?`<img class="tag-icon" ${img(type.icon)}>`:""}${esc(p.type)}</div></div></div>${cardActions("powerup",idx)}</article>`;}).join("")}</div>`;
  };

  // Non-editable, autocomplete-free custom dropdowns. Selection still stores the same dataset value used by the original forms.
  window.setupDropdown = function (id, options, initialValue) {
    const container=document.getElementById(id); if(!container)return;
    const normalized=(options||[]).map(o=>({name:o.name,value:o.value!==undefined?o.value:o.name,icon:o.icon||""}));
    const selected=normalized.find(o=>String(o.value)===String(initialValue))||normalized[0]||{name:"Select...",value:"",icon:""};
    container.dataset.value=selected.value;
    container.innerHTML=`<button type="button" class="select-box crk-select-button" onclick="toggleCustomDropdown('${esc(id)}')"><span class="crk-selected-value">${selected.icon?`<img class="select-leading-icon" ${img(selected.icon)} alt="">`:""}<span>${esc(selected.name)}</span></span><span class="material-symbols-outlined select-arrow">arrow_drop_down</span></button><div class="options-container" id="${esc(id)}-opts">${normalized.map((o,i)=>`<button type="button" class="option" data-dropdown-id="${esc(id)}" data-idx="${i}">${o.icon?`<img ${img(o.icon)} alt="">`:""}<span>${esc(o.name)}</span></button>`).join("")}</div>`;
    container.querySelectorAll(".option").forEach(el=>el.addEventListener("click",()=>{const o=normalized[+el.dataset.idx];container.dataset.value=o.value;const v=container.querySelector(".crk-selected-value");v.innerHTML=`${o.icon?`<img class="select-leading-icon" ${img(o.icon)} alt="">`:""}<span>${esc(o.name)}</span>`;container.querySelector(".options-container")?.classList.remove("active");container.querySelector(".select-box")?.classList.remove("active");if(id==="cf-rarity")updateGuestFieldVisibility();}));
  };

  function bindSearch(id,key,render){const el=document.getElementById(id);if(!el||el.dataset.crkBound)return;el.dataset.crkBound="1";el.addEventListener("input",()=>{state[key]=el.value.trim().toLowerCase();debounce(id,render,260);});}
  function initCatalog(){
    bindSearch("search-cookie","cookieSearch",renderCookies);bindSearch("search-skins","costumeSearch",renderSkins);bindSearch("search-powerups","powerupSearch",renderAllPowerups);
    // Remove old group-by controls even if a cached/older HTML copy is opened.
    document.querySelectorAll(".group-by-strip,.group-by-bar").forEach(el=>el.remove());
    renderCookies(); renderSkins(); renderAllPowerups();
  }
  window.initCRKCatalog=initCatalog;
  if(document.readyState!=="loading")setTimeout(initCatalog,0);else document.addEventListener("DOMContentLoaded",initCatalog,{once:true});
})();
