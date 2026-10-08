/* CRK layout v2 — loaded after v8-overrides.js, boots the app at the end.
   Toast, dropdown glyphs, detail modals, MLBB-style count pages, matrix, backup dialog. */
(function () {
  const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const NO_IMG = "https://placehold.co/900x650/193b68/fff?text=No+Image";
  const attrOf = (cat, name) => (appData.attributes?.[cat] || []).find(x => x.name === name);
  const attrIco = (cat, v, cls = "attr-ico") => { const a = attrOf(cat, v); return a?.icon ? `<img class="${cls}" src="${esc(a.icon)}" alt="">` : ""; };
  const pic = (u, cls = "") => `<img class="${cls}" src="${esc(u || NO_IMG)}" alt="" onerror="this.onerror=null;this.src='${NO_IMG}'">`;
  const ownerOf = id => (appData.cookies || []).find(c => c.id === id);
  const headOf = (c, fb) => c?.images?.head || fb || "";
  const headImg = (c, fb, cls = "mini-head") => { const u = headOf(c, fb); return u ? pic(u, cls) : `<span class="${cls} mini-head-empty material-symbols-outlined">cookie</span>`; };
  const glyph = (n, cls = "") => `<span class="material-symbols-outlined ${cls}">${n}</span>`;
  const isGlyph = s => /^[a-z][a-z0-9_]*$/.test(s || "");

  /* ---------- Toast: small, simple, filled icon ---------- */
  window.showToast = function (msg, type = "success") {
    const host = document.getElementById("toast-container"); if (!host) return;
    const ic = { success: "check_circle", error: "cancel", info: "info" }[type] || "info";
    const t = document.createElement("div");
    t.className = `toast toast-simple ${type}`;
    t.innerHTML = `${glyph(ic, "toast-icon")}<span>${esc(msg)}</span>`;
    host.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 220); }, 2300);
  };

  /* ---------- Dropdowns: image URLs, Material glyph names, and cycling icons ---------- */
  const optIcon = o => {
    if (!o.icon) return "";
    if (isGlyph(o.icon)) return glyph(o.icon, "opt-glyph");
    const cyc = o.cycle && o.cycle.length > 1 ? ` data-cycle='${esc(JSON.stringify(o.cycle))}' data-ci="0"` : "";
    return `<img class="select-leading-icon" src="${esc(o.icon)}" alt=""${cyc}>`;
  };
  setInterval(() => {
    document.querySelectorAll("img[data-cycle]").forEach(im => {
      try { const l = JSON.parse(im.dataset.cycle); im.dataset.ci = (+im.dataset.ci + 1) % l.length; im.src = l[im.dataset.ci]; } catch (_) {}
    });
  }, 1400);
  window.setupDropdown = function (id, options, initialValue) {
    const c = document.getElementById(id); if (!c) return;
    const list = (options || []).map(o => ({ name: o.name, value: o.value !== undefined ? o.value : o.name, icon: o.icon || "", cycle: o.cycle }));
    const sel = list.find(o => String(o.value) === String(initialValue)) || list[0] || { name: "Select...", value: "", icon: "" };
    c.dataset.value = sel.value;
    c.innerHTML = `<button type="button" class="select-box crk-select-button" aria-haspopup="listbox" aria-expanded="false"><span class="crk-selected-value">${optIcon(sel)}<span>${esc(sel.name)}</span></span>${glyph("expand_more", "select-arrow")}</button><div class="options-container crk-options" role="listbox">${list.map((o, i) => `<button type="button" class="option crk-option" data-idx="${i}" role="option">${optIcon(o)}<span>${esc(o.name)}</span></button>`).join("")}</div>`;
    const btn = c.querySelector(".crk-select-button"), opts = c.querySelector(".crk-options");
    btn.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".crk-options.active").forEach(x => { if (x !== opts) x.classList.remove("active"); });
      opts.classList.toggle("active"); btn.classList.toggle("active", opts.classList.contains("active"));
      btn.setAttribute("aria-expanded", opts.classList.contains("active"));
    });
    c.querySelectorAll(".crk-option").forEach(o => o.addEventListener("click", e => {
      e.stopPropagation();
      const x = list[+o.dataset.idx]; c.dataset.value = x.value;
      c.querySelector(".crk-selected-value").innerHTML = `${optIcon(x)}<span>${esc(x.name)}</span>`;
      opts.classList.remove("active"); btn.classList.remove("active"); btn.setAttribute("aria-expanded", "false");
      if (id === "cf-rarity" && typeof updateGuestFieldVisibility === "function") updateGuestFieldVisibility();
    }));
  };

  /* ---------- Costume / power-up forms: set icons, preselected owner ---------- */
  const baseSkinForm = window.openSkinForm;
  window.openSkinForm = function (idx = null, ownerId = null) {
    baseSkinForm(idx);
    const s = idx !== null ? appData.costumes[idx] : null;
    const sets = {};
    (appData.costumes || []).forEach(x => {
      if (!x.set) return;
      const h = headOf(ownerOf(x.ownerId), x.card || x.sprite);
      (sets[x.set] ??= []); if (h && !sets[x.set].includes(h)) sets[x.set].push(h);
    });
    setupDropdown("sf-set", [{ name: "No Set", value: "", icon: "block" }, ...Object.keys(sets).map(n => ({ name: n, value: n, icon: sets[n][0] || "collections_bookmark", cycle: sets[n] }))], s?.set || "");
    if (ownerId && idx === null) setupDropdown("sf-owner", appData.cookies.map(c => ({ name: c.name, value: c.id, icon: c.images?.head })), ownerId);
  };
  const basePuForm = window.openPowerupForm;
  window.openPowerupForm = function (idx = null, ownerId = null) {
    basePuForm(idx);
    if (ownerId && idx === null) setupDropdown("puf-owner", appData.cookies.map(c => ({ name: c.name, value: c.id, icon: c.images?.head })), ownerId);
  };

  /* ---------- Detail modals ---------- */
  const tierFor = (id, mode) => {
    const d = appData.tierLists?.[mode]; if (!d) return "Unranked";
    const k = Object.keys(d.data || {}).find(t => (d.data[t] || []).includes(id));
    return d.meta?.find(x => x.id === k)?.label || "Unranked";
  };
  const splashBlock = (splash, gif, name, modalId) => `<button type="button" class="detail-splash${gif ? " has-gif" : ""}" onclick="openImageViewer(${jsq(name + " — Splash")},${jsq(splash || "")},'${modalId}')">${pic(splash, "detail-splash-static")}${gif ? `<img class="detail-splash-gif" src="${esc(gif)}" alt="" onerror="this.remove()"><span class="splash-gif-hint">Hover to animate</span>` : ""}</button>`;
  const thumb = (label, url, name, modalId) => `<figure class="detail-thumb"><button type="button" class="detail-thumb-img" onclick="openImageViewer(${jsq(name + " — " + label)},${jsq(url || "")},'${modalId}')">${pic(url)}</button><figcaption>${esc(label)}</figcaption></figure>`;
  const fact = (label, value, ico = "") => value ? `<div class="fact"><dt>${label}</dt><dd>${ico}<span>${esc(value)}</span></dd></div>` : "";
  const section = (title, badge, body) => `<section class="detail-section"><div class="detail-section-head"><h3>${title}${badge !== null ? ` <span class="count-badge">${badge}</span>` : ""}</h3></div>${body}</section>`;
  const relCostume = s => { const i = appData.costumes.indexOf(s); return `<article class="related-square-card" onclick="viewSkin(${i})">${pic(s.card || s.splash || s.sprite, "related-square-image")}<div class="related-hover"><strong>${esc(s.name)}</strong><small>${attrIco("skinRarity", s.rarity)}${esc(s.rarity || "")}</small></div></article>`; };
  const relPower = p => { const i = appData.powerups.indexOf(p), o = ownerOf(p.ownerId); return `<article class="related-square-card" onclick="viewPowerup(${i})">${pic(p.url10 || p.url20 || p.url30 || o?.images?.head, "related-square-image")}<div class="related-hover"><strong>${esc(p.name)}</strong><small>${attrIco("powerupType", p.type)}${esc(p.type || "")}</small></div></article>`; };
  const addTile = onclick => `<button type="button" class="related-add" onclick="${onclick}"><span class="material-symbols-outlined">add</span><span>Add</span></button>`;
  const bgFor = (box, bg) => { box.style.backgroundImage = bg ? `linear-gradient(rgba(5,17,32,.88),rgba(5,17,32,.97)),url('${String(bg).replace(/'/g, "%27")}')` : "none"; };

  window.openCookieDetail = function (id) {
    const c = appData.cookies.find(x => x.id === id); if (!c) return;
    currentDetailId = id;
    const modal = document.getElementById("modal-cookie-detail"), box = modal.querySelector(".modal-box");
    const head = document.getElementById("cookie-modal-head"), nm = document.getElementById("cookie-modal-name");
    head.src = c.images?.head || NO_IMG; head.alt = c.name; nm.textContent = c.name;
    bgFor(box, c.images?.bg);
    const costumes = (appData.costumes || []).filter(x => x.ownerId === id), powerups = (appData.powerups || []).filter(x => x.ownerId === id);
    const splash = c.images?.splash || c.images?.head || "", gif = c.images?.splashGif || "";
    const els = (c.elements || []).map(e => `<span class="fact-chip">${attrIco("element", e)}${esc(e)}</span>`).join("");
    document.getElementById("cookie-detail-content").innerHTML = `
      <div class="detail-top">
        <div class="detail-media">${splashBlock(splash, gif, c.name, "modal-cookie-detail")}
          <div class="detail-thumbs">${thumb("Sprite", c.images?.sprite || splash, c.name, "modal-cookie-detail")}${thumb("Card", c.images?.card || splash, c.name, "modal-cookie-detail")}</div></div>
        <div class="detail-info">
          <div class="info-card"><h4>About</h4><p>${esc(c.description || "No description recorded.")}</p></div>
          <div class="info-card"><h4>Details</h4><dl class="facts">${fact("Rarity", c.rarity, attrIco("rarity", c.rarity))}${fact("Role", c.role, attrIco("role", c.role))}${fact("Position", c.position, attrIco("position", c.position))}${els ? `<div class="fact"><dt>Elements</dt><dd class="fact-chips">${els}</dd></div>` : ""}${fact("PvE tier", tierFor(id, "pve"))}${fact("PvP tier", tierFor(id, "pvp"))}</dl></div>
          <div class="info-card"><h4>Skill</h4><div class="skill-line">${c.skill?.icon ? pic(c.skill.icon, "skill-icon") : ""}<div><strong>${esc(c.skill?.name || "No skill recorded")}</strong><p>${esc(c.skill?.desc || "")}</p></div></div></div>
        </div>
      </div>
      ${section("Costumes", costumes.length, `<div class="related-square-grid">${costumes.map(relCostume).join("")}${addTile(`openSkinForm(null,${jsq(id)})`)}</div>`)}
      ${section("Power-ups", powerups.length, `<div class="related-square-grid">${powerups.map(relPower).join("")}${addTile(`openPowerupForm(null,${jsq(id)})`)}</div>`)}`;
    openModal("modal-cookie-detail"); resetModalScroll("modal-cookie-detail");
  };

  window.viewSkin = function (idx) {
    const s = appData.costumes[idx]; if (!s) return;
    currentSkinIdx = idx;
    const owner = ownerOf(s.ownerId), modal = document.getElementById("modal-skin-detail"), box = modal.querySelector(".modal-box");
    const head = modal.querySelector(".modal-header-costume-head"), title = modal.querySelector(".modal-header-title");
    if (head) { head.src = headOf(owner, s.card || s.sprite) || NO_IMG; head.alt = owner?.name || ""; }
    if (title) title.textContent = s.name;
    bgFor(box, s.bg);
    const splash = s.splash || s.card || s.sprite || "", gif = s.splashGif || s.gif || "";
    const same = (appData.costumes || []).filter(x => x !== s && s.set && x.set === s.set);
    document.getElementById("skin-detail-content").innerHTML = `
      <div class="detail-top">
        <div class="detail-media">${splashBlock(splash, gif, s.name, "modal-skin-detail")}
          <div class="detail-thumbs">${thumb("Card", s.card || splash, s.name, "modal-skin-detail")}${thumb("Sprite", s.sprite || splash, s.name, "modal-skin-detail")}</div></div>
        <div class="detail-info">
          <div class="info-card"><h4>About</h4><p>${esc(s.desc || "No description recorded.")}</p></div>
          <div class="info-card"><h4>Details</h4><dl class="facts">${fact("Cookie", owner?.name || "Unknown cookie", owner ? headImg(owner, "", "fact-head") : "")}${fact("Rarity", s.rarity, attrIco("skinRarity", s.rarity))}${fact("Set", s.set, glyph("collections_bookmark", "fact-glyph"))}</dl></div>
        </div>
      </div>
      ${same.length ? section("More in this set", same.length, `<div class="related-square-grid">${same.map(relCostume).join("")}</div>`) : ""}`;
    openModal("modal-skin-detail"); resetModalScroll("modal-skin-detail");
  };

  window.viewPowerup = function (idx) {
    const p = appData.powerups[idx]; if (!p) return;
    currentPowerupIdx = idx;
    const owner = ownerOf(p.ownerId), modal = document.getElementById("modal-pu-detail");
    const title = modal.querySelector(".modal-header-title"), head = modal.querySelector(".modal-header-powerup-head");
    if (title) title.textContent = p.name; if (head) head.src = headOf(owner) || NO_IMG;
    const imgs = [["Base", p.url10], ["+10", p.url20], ["+20", p.url30]].filter(x => x[1]);
    document.getElementById("pu-detail-content").innerHTML = `
      <div class="pu-images">${imgs.map(x => thumb(x[0], x[1], p.name, "modal-pu-detail")).join("") || `<div class="empty-inline">No images recorded.</div>`}</div>
      <div class="pu-cols">
        <div class="info-card"><h4>About</h4><p>${esc(p.desc || "No description recorded.")}</p></div>
        <div class="info-card"><h4>Details</h4><dl class="facts facts-stack">${fact("Category", p.type, attrIco("powerupType", p.type))}${fact("Cookie", owner?.name || "Unknown cookie", owner ? headImg(owner, "", "fact-head") : "")}</dl></div>
      </div>
      ${p.ingredientName || p.ingredientUrl ? section("Ingredient", null, `<div class="ingredient-row">${p.ingredientUrl ? pic(p.ingredientUrl, "ingredient-image") : ""}<div class="ingredient-name">${esc(p.ingredientName || "Ingredient")}</div></div>`) : ""}`;
    openModal("modal-pu-detail"); resetModalScroll("modal-pu-detail");
  };

  /* ---------- Count pages (MLBB layout) ---------- */
  const PALETTE = ["#4f8dff", "#f7d154", "#7cc7ff", "#9ddc9a", "#c7b8ff", "#ff9d7a", "#5fd6c8", "#e58fd0", "#b9c5d6", "#ffb84d"];
  const cs = { cookie: { group: "rarity", q: "", closed: new Set(), chart: false }, costume: { group: "cookie", q: "", closed: new Set(), chart: false } };
  const GROUPS = { cookie: [["rarity", "Rarity", "workspace_premium"], ["role", "Role", "shield"], ["position", "Position", "location_on"], ["element", "Element", "local_fire_department"]], costume: [["cookie", "Cookies", "cookie"], ["rarity", "Rarity", "workspace_premium"], ["role", "Role", "shield"], ["position", "Position", "location_on"], ["element", "Element", "local_fire_department"]] };
  const catFor = (type, g) => (type === "costume" && g === "rarity") ? "skinRarity" : g;
  const sum0 = entries => entries.reduce((n, [, a]) => n + a.length, 0);
  function pieSlices(type, ents, sum) {
    if (!sum) return "";
    const R = 92, r = 56, pt = (rad, a) => [(rad * Math.cos(a)).toFixed(2), (rad * Math.sin(a)).toFixed(2)];
    let ang = -Math.PI / 2;
    return ents.map(([n, c], i) => {
      const color = PALETTE[i % PALETTE.length], frac = c / sum;
      if (frac >= 0.9999) return `<circle class="pie-slice" data-i="${i}" r="${(R + r) / 2}" fill="none" stroke="${color}" stroke-width="${R - r}" onmouseenter="countPieHover('${type}',${i})" onmouseleave="countPieHover('${type}',-1)"><title>${esc(n)}: ${c}</title></circle>`;
      const a0 = ang, a1 = ang + frac * Math.PI * 2; ang = a1;
      const big = frac > 0.5 ? 1 : 0, [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
      return `<path class="pie-slice" data-i="${i}" d="M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${big} 0 ${x3} ${y3} Z" fill="${color}" onmouseenter="countPieHover('${type}',${i})" onmouseleave="countPieHover('${type}',-1)"><title>${esc(n)}: ${c}</title></path>`;
    }).join("");
  }
  window.countPieHover = function (type, i) {
    const st = cs[type], c = document.getElementById(`cc-pie-center-${type}`), host = document.getElementById(`cc-chart-${type}`);
    if (!c || !host) return;
    host.querySelectorAll(".pie-slice,.legend-row").forEach(e => e.classList.toggle("hot", +e.dataset.i === i));
    host.classList.toggle("has-hot", i >= 0);
    if (i < 0 || !st.entries[i]) { c.innerHTML = `<strong>${st.sum}</strong><span>memberships</span>`; return; }
    const [n, v] = st.entries[i];
    c.innerHTML = `<strong>${v}</strong><span>${esc(n)}</span><em>${Math.round(v / (st.sum || 1) * 100)}%</em>`;
  };
  function buildGroups(type) {
    const { group, q } = cs[type], m = {};
    const add = (k, v) => { if (k) (m[k] ??= []).push(v); };
    if (type === "cookie") {
      (appData.cookies || []).forEach(c => {
        if (q && !String(c.name).toLowerCase().includes(q)) return;
        const keys = group === "element" ? (c.elements || []) : [c[group]];
        keys.forEach(k => add(k, { name: c.name, img: headOf(c), click: `openCookieDetail(${jsq(c.id)})` }));
      });
    } else {
      (appData.costumes || []).forEach((s, i) => {
        if (q && !String(s.name).toLowerCase().includes(q)) return;
        const o = ownerOf(s.ownerId);
        const keys = group === "cookie" ? [o?.name || "Unknown cookie"] : group === "element" ? (o?.elements || []) : group === "rarity" ? [s.rarity] : [o?.[group]];
        keys.forEach(k => add(k, { name: s.name, img: s.card || s.sprite || s.splash || headOf(o), click: `viewSkin(${i})` }));
      });
    }
    return m;
  }
  const groupIcon = (type, name) => {
    const g = cs[type].group;
    if (g === "cookie") { const o = (appData.cookies || []).find(c => c.name === name); return o ? headImg(o, "", "group-head") : glyph("cookie", "group-glyph"); }
    return attrIco(catFor(type, g), name, "group-ico") || glyph("label", "group-glyph");
  };
  function renderCount(type) {
    const page = document.getElementById(`view-${type}-count`), host = document.getElementById(`${type}-count-content`);
    if (!page || !host) return;
    const st = cs[type], word = type === "cookie" ? "Cookies" : "Costumes";
    host.className = "count-host";
    host.innerHTML = `<div class="unified-card count-total-card"><div class="count-total-stack"><div class="count-total-number" id="cc-total-${type}">0</div><div class="count-total-label">${word}</div><button type="button" class="btn btn-secondary btn-sm" onclick="toggleCountChart('${type}')">${glyph("pie_chart")}<span id="cc-chart-label-${type}">${st.chart ? "Hide stats" : "View stats"}</span></button></div><div class="count-chart" id="cc-chart-${type}"${st.chart ? "" : " hidden"}></div></div>
      <div class="count-analytics" id="cc-analytics-${type}"></div>
      <div class="filters-bar count-filters"><div class="filter-item"><label class="form-label">Group by</label><div class="filter-pill-row">${GROUPS[type].map(([k, l, ic]) => `<button type="button" class="filter-pill${k === st.group ? " active" : ""}" onclick="setCountGroup('${type}','${k}')">${glyph(ic)}<span>${l}</span></button>`).join("")}</div></div>
      <div class="filter-item filter-item-search"><label class="form-label">Search</label><input class="form-input" type="search" placeholder="Search..." value="${esc(st.q)}" autocomplete="off" oninput="setCountQuery('${type}',this.value)"></div></div>
      <div id="cc-list-${type}" class="count-list"></div>`;
    fillCount(type);
  }
  function fillCount(type) {
    const st = cs[type], groups = buildGroups(type), word = type === "cookie" ? "Cookies" : "Costumes";
    const entries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    const total = type === "cookie" ? (appData.cookies || []).length : (appData.costumes || []).length;
    const memberships = entries.reduce((n, [, a]) => n + a.length, 0);
    const uniq = new Set(); entries.forEach(([, a]) => a.forEach(x => uniq.add(x.click)));
    const coverage = total ? Math.round(uniq.size / total * 100) : 0, avg = total ? (memberships / total).toFixed(2) : "0.00";
    const set = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
    const tn = document.getElementById(`cc-total-${type}`); if (tn) tn.textContent = total;
    const stat = (ic, l, v, sub = "") => `<div class="count-stat">${glyph(ic)}<div><small>${l}</small><strong>${v}</strong>${sub ? `<em>${sub}</em>` : ""}</div></div>`;
    let analytics = stat("category", "Groups", entries.length) + stat("trending_up", "Largest group", entries[0] ? esc(entries[0][0]) : "—", entries[0] ? `${entries[0][1].length} ${word.toLowerCase()}` : "") + stat("donut_large", "Coverage", coverage + "%") + stat("functions", "Avg. memberships", avg);
    if (type === "costume") {
      const per = {}; (appData.costumes || []).forEach(s => { per[s.ownerId] = (per[s.ownerId] || 0) + 1; });
      const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 5);
      analytics += `<div class="count-top5"><h4>Top 5 cookies by costumes</h4>${top.map(([id, n], i) => { const o = ownerOf(id); return `<div class="top5-row"><b>${i + 1}</b>${headImg(o, "", "group-head")}<span>${esc(o?.name || "Unknown")}</span><strong>${n}</strong></div>`; }).join("") || `<div class="empty-inline">No costumes yet.</div>`}</div>`;
    }
    set(`cc-analytics-${type}`, analytics);
    // chart: hoverable donut + legend
    st.entries = entries.map(([n, a]) => [n, a.length]); st.sum = sum0(entries);
    set(`cc-chart-${type}`, entries.length ? `<div class="count-pie-wrap"><svg class="count-pie" viewBox="-100 -100 200 200" role="img" aria-label="Distribution chart">${pieSlices(type, st.entries, st.sum)}</svg><div class="count-pie-center" id="cc-pie-center-${type}"><strong>${st.sum}</strong><span>memberships</span></div></div><div class="count-legend">${st.entries.map(([n, c], i) => `<div class="legend-row" data-i="${i}" onmouseenter="countPieHover('${type}',${i})" onmouseleave="countPieHover('${type}',-1)"><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${esc(n)}</span><b>${c}</b><em>${Math.round(c / (st.sum || 1) * 100)}%</em></div>`).join("")}</div>` : `<div class="empty-inline">Nothing to chart.</div>`);
    // list
    set(`cc-list-${type}`, entries.map(([name, items]) => {
      const closed = st.closed.has(name);
      return `<section class="count-group${closed ? " collapsed" : ""}"><button type="button" class="count-group-head" onclick="toggleCountGroup('${type}',${jsq(name)})">${glyph(closed ? "chevron_right" : "expand_more", "chev")}<span class="count-group-title">${groupIcon(type, name)}<strong>${esc(name)}</strong></span><span class="count-badge">${items.length}</span></button><div class="count-group-body">${items.map(x => `<button type="button" class="count-card" data-tip="${esc(x.name)}" aria-label="${esc(x.name)}" onclick="${x.click}">${x.img ? pic(x.img, "count-card-img") : glyph("cookie", "count-card-img member-empty")}</button>`).join("")}</div></section>`;
    }).join("") || `<div class="empty-state"><span class="material-symbols-outlined">search_off</span><strong>Nothing found</strong></div>`);
    // header toolbar
    const header = document.getElementById(`view-${type}-count`)?.querySelector(".page-header");
    if (header) {
      let tb = header.querySelector(".skin-count-group-toolbar");
      if (!tb) { tb = document.createElement("div"); tb.className = "skin-count-group-toolbar"; header.appendChild(tb); }
      const open = entries.filter(([n]) => !st.closed.has(n)).length;
      tb.innerHTML = `<span class="skin-count-group-status">${open}/${entries.length} groups open</span><div class="skin-count-group-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="countCollapseAll('${type}')">${glyph("unfold_less")}<span>Collapse</span></button><button type="button" class="btn btn-secondary btn-sm" onclick="countExpandAll('${type}')">${glyph("unfold_more")}<span>Expand</span></button></div>`;
    }
  }
  const redo = type => type === "cookie" ? renderCount("cookie") : renderCount("costume");
  window.renderCookieCount = () => renderCount("cookie");
  window.renderCostumeCount = () => renderCount("costume");
  window.setCountGroup = (type, g) => { cs[type].group = g; cs[type].closed.clear(); redo(type); };
  window.setCountQuery = (type, q) => { cs[type].q = q.trim().toLowerCase(); fillCount(type); };
  window.toggleCountGroup = (type, n) => { const s = cs[type].closed; s.has(n) ? s.delete(n) : s.add(n); fillCount(type); };
  window.countExpandAll = type => { cs[type].closed.clear(); fillCount(type); };
  window.countCollapseAll = type => { cs[type].closed = new Set(Object.keys(buildGroups(type))); fillCount(type); };
  window.toggleCountChart = type => { cs[type].chart = !cs[type].chart; const c = document.getElementById(`cc-chart-${type}`), l = document.getElementById(`cc-chart-label-${type}`); if (c) c.hidden = !cs[type].chart; if (l) l.textContent = cs[type].chart ? "Hide stats" : "View stats"; };

  /* ---------- Matrix ---------- */
  const AX = { rarity: ["Rarity", "workspace_premium"], role: ["Role", "shield"], position: ["Position", "location_on"], element: ["Element", "local_fire_department"] };
  const mx = { row: "rarity", col: "role", sel: null };
  const vals = (cat, c) => cat === "element" ? (c.elements || []) : [c[cat]];
  const mxNames = cat => (appData.attributes?.[cat] || []).map(a => a.name).filter(Boolean);
  const mxItems = (r, c) => (appData.cookies || []).filter(k => vals(mx.row, k).includes(r) && vals(mx.col, k).includes(c));
  window.setMatrixAxis = (axis, v) => { const other = axis === "row" ? "col" : "row"; if (mx[other] === v) mx[other] = mx[axis]; mx[axis] = v; mx.sel = null; renderMatrix(); };
  window.swapMatrixAxes = () => { [mx.row, mx.col] = [mx.col, mx.row]; mx.sel = null; renderMatrix(); };
  window.renderMatrix = function () {
    const host = document.getElementById("matrix-container"), ctl = document.getElementById("matrix-filter-pills"), sum = document.getElementById("matrix-summary-cards");
    if (!host || !ctl) return;
    const rows = mxNames(mx.row), cols = mxNames(mx.col);
    const grid = rows.map(r => cols.map(c => mxItems(r, c).length)), max = Math.max(1, ...grid.flat());
    const used = grid.flat().filter(Boolean).length;
    let top = null; rows.forEach((r, i) => cols.forEach((c, j) => { if (!top || grid[i][j] > top.n) top = { r, c, n: grid[i][j] }; }));
    const seg = (axis, cur) => `<div class="mx-seg">${Object.entries(AX).map(([k, [l, ic]]) => `<button type="button" class="mx-seg-btn${k === cur ? " active" : ""}" onclick="setMatrixAxis('${axis}','${k}')">${glyph(ic)}<span>${l}</span></button>`).join("")}</div>`;
    if (sum) { sum.innerHTML = ""; sum.hidden = true; }
    ctl.className = "mx-controls";
    ctl.innerHTML = `<div class="mx-axis"><span class="mx-axis-label">${glyph("table_rows")}Rows</span>${seg("row", mx.row)}</div><button type="button" class="mx-swap" onclick="swapMatrixAxes()" title="Swap rows and columns">${glyph("swap_vert")}<span>Swap</span></button><div class="mx-axis"><span class="mx-axis-label">${glyph("view_column")}Columns</span>${seg("col", mx.col)}</div>`;
    const hd = (cat, v) => `${attrIco(cat, v, "mx-ico")}<span>${esc(v)}</span>`;
    const body = rows.map((r, i) => `<tr><th class="mx-rh">${hd(mx.row, r)}</th>${cols.map((c, j) => { const n = grid[i][j], on = mx.sel && mx.sel[0] === r && mx.sel[1] === c; return n ? `<td><button type="button" class="mx-cell${on ? " sel" : ""}" style="--heat:${(0.18 + 0.82 * n / max).toFixed(2)}" onclick="openMatrixCell(${jsq(r)},${jsq(c)})">${n}</button></td>` : `<td><span class="mx-empty">·</span></td>`; }).join("")}</tr>`).join("");
    host.className = "mx-layout";
    host.innerHTML = `<section class="mx-card"><div class="mx-meta"><span><b>${(appData.cookies || []).length}</b> cookies</span><span><b>${used}</b> combinations in use</span>${top && top.n ? `<span>Most common: <b>${esc(top.r)} × ${esc(top.c)}</b> (${top.n})</span>` : ""}</div><div class="mx-scroll"><table class="mx-table"><thead><tr><th class="mx-corner">${AX[mx.row][0]} × ${AX[mx.col][0]}</th>${cols.map(c => `<th class="mx-ch">${hd(mx.col, c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div></section>
      <aside class="mx-inspector"><h3 id="matrix-inspector-title">Select a cell</h3><div id="matrix-inspector-content" class="mx-inspector-body"><div class="empty-inline">Click a number in the table to list the matching cookies here.</div></div></aside>`;
    if (mx.sel) openMatrixCell(mx.sel[0], mx.sel[1], true);
  };
  window.openMatrixCell = function (r, c, keep) {
    mx.sel = [r, c];
    const items = mxItems(r, c), t = document.getElementById("matrix-inspector-title"), b = document.getElementById("matrix-inspector-content");
    if (t) t.innerHTML = `${esc(r)} × ${esc(c)} <span class="count-badge">${items.length}</span>`;
    if (b) b.innerHTML = items.length ? items.map(k => `<button type="button" class="count-member" onclick="openCookieDetail(${jsq(k.id)})">${k.images?.head ? pic(k.images.head, "member-head") : glyph("cookie", "member-head member-empty")}<span>${esc(k.name)}</span></button>`).join("") : `<div class="empty-inline">No cookies match.</div>`;
    if (!keep) document.querySelectorAll(".mx-cell").forEach(x => x.classList.toggle("sel", x.getAttribute("onclick") === `openMatrixCell(${jsq(r)},${jsq(c)})`));
  };

  /* ---------- Backup & database dialog ---------- */
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

  /* ---------- Boot (last, so every override above is in place) ---------- */
  window.crkInit();
  bootApp();
})();
