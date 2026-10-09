/* CRK dashboard/system layer — navigation, stats, settings, global search and DB fallback. */
(function () {
  const VERSION=window.APP_VERSION||"v1.2.0";
  const UI_KEY="crk_ui_settings_v1";
  const UI_DEFAULTS={defaultPage:"dashboard",compact:false,reduceMotion:false};
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  // Server-first persistence with a local fallback. This keeps the app usable in a static preview while preserving the existing API when deployed.
  const originalInit=DB.init.bind(DB);
  DB.init=async function(){
    this._token=window.localStorage.getItem("crk_admin_token")||null;this._localFallback=false;
    try{const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),7000);const res=await fetch("/api/data",{signal:ctl.signal});clearTimeout(timer);if(res.ok){this._cache=await res.json();this._loaded=true;return;}throw new Error(`HTTP ${res.status}`);}catch(e){this._localFallback=true;try{const raw=window.localStorage.getItem(STORAGE_KEY);if(raw)this._cache[STORAGE_KEY]=raw;}catch(_){}console.warn("CRK API unavailable; using browser fallback.",e);}
    this._loaded=true;
  };
  DB.setItem=async function(key,value){
    if(!this._token){showToast("Sign in as admin to save changes","info");openAdminLoginModal();return false;}
    const prev=this._cache[key];this._cache[key]=value;
    try{const res=await fetch("/api/data/"+encodeURIComponent(key),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+this._token},body:JSON.stringify({value})});
      if(!res.ok){if(res.status===401){this._token=null;localStorage.removeItem("crk_admin_token");updateAdminUI();showToast("Session expired — please log in again","info");return false;}if(res.status===413)showToast(`"${key}" is too large for the server`,"info");throw new Error(`HTTP ${res.status}`);}
      this._localFallback=false;return true;
    }catch(e){this._cache[key]=value;this._localFallback=true;try{localStorage.setItem(key,String(value));showToast("Saved locally — server database unavailable","info");return true;}catch(_){this._cache[key]=prev;showToast("Save failed","info");return false;}}
  };
  DB.setItemAwaited=async function(key,value){
    if(!this._token){showToast("Sign in as admin to import data","info");openAdminLoginModal();return false;}
    const prev=this._cache[key]; this._cache[key]=value;
    try{
      const res=await fetch("/api/data/"+encodeURIComponent(key),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+this._token},body:JSON.stringify({value})});
      if(!res.ok){
        if(res.status===401){this._token=null;localStorage.removeItem("crk_admin_token");updateAdminUI();showToast("Session expired — please log in again","info");}
        else if(res.status===413)showToast(`"${key}" is too large for the server` ,"info");
        else showToast(`Import failed for "${key}" (HTTP ${res.status})`,"info");
        this._cache[key]=prev; return false;
      }
      this._localFallback=false; return true;
    }catch(e){
      this._cache[key]=prev;
      try{localStorage.setItem(key,String(value));this._localFallback=true;return true;}catch(_){showToast(`Import failed for "${key}"`,"info");return false;}
    }
  };

  window.getUiSettings=function(){try{return {...UI_DEFAULTS,...JSON.parse(localStorage.getItem(UI_KEY)||"{}")};}catch(_){return {...UI_DEFAULTS};}};
  window.applyUiSettings=function(s=getUiSettings()){document.body.classList.toggle("ui-compact",!!s.compact);document.body.classList.toggle("ui-reduced-motion",!!s.reduceMotion);};
  window.saveUiPreferences=function(){const s={defaultPage:(typeof getDropdownValue==="function"?getDropdownValue("settings-default-page"):document.getElementById("settings-default-page")?.dataset.value)||"dashboard",compact:!!document.getElementById("settings-compact-ui")?.checked,reduceMotion:!!document.getElementById("settings-reduce-motion")?.checked};localStorage.setItem(UI_KEY,JSON.stringify(s));const collapse=!!document.getElementById("settings-sidebar-collapsed")?.checked;setSidebarCollapsed(collapse);applyUiSettings(s);showToast("Settings saved","success");};
  function renderSettingsPage(){
    const page=document.getElementById("view-settings");
    if(!page)return;
    const s=getUiSettings();
    const select=document.getElementById("settings-default-page");
    if(select && typeof setupDropdown==="function") setupDropdown("settings-default-page",[
      {name:"Dashboard",value:"dashboard",icon:"dashboard"},
      {name:"Cookies",value:"cookies",icon:"collections_bookmark"},
      {name:"Costumes",value:"costumes",icon:"collections_bookmark"},
      {name:"Costume Sets",value:"sets",icon:"collections_bookmark"},
      {name:"Power-ups",value:"powerups",icon:"collections_bookmark"},
            {name:"Cookie Count",value:"cookie-count",icon:"monitoring"},
      {name:"Costume Count",value:"costume-count",icon:"monitoring"},
      {name:"Matrix",value:"matrix",icon:"monitoring"},
      {name:"Tier List",value:"tierlist",icon:"leaderboard"},
      {name:"Attributes",value:"attributes",icon:"category"},
      {name:"Settings",value:"settings",icon:"settings"}
    ],s.defaultPage||"dashboard");
    const compact=document.getElementById("settings-compact-ui");
    const motion=document.getElementById("settings-reduce-motion");
    const collapsed=document.getElementById("settings-sidebar-collapsed");
    if(compact)compact.checked=!!s.compact;
    if(motion)motion.checked=!!s.reduceMotion;
    if(collapsed)collapsed.checked=localStorage.getItem("sidebar_collapsed")==="true";
  }
  window.renderSettingsPage=renderSettingsPage;
  window.resetUiPreferences=function(){localStorage.removeItem(UI_KEY);setSidebarCollapsed(false);applyUiSettings(UI_DEFAULTS);renderSettingsPage();showToast("UI preferences reset","success");};
  window.setSidebarCollapsed=function(collapsed){const sb=document.getElementById("sidebar"),main=document.querySelector(".main-content"),btn=document.getElementById("toggle-sidebar");sb?.classList.toggle("collapsed",collapsed);main?.classList.toggle("sidebar-collapsed",collapsed);localStorage.setItem("sidebar_collapsed",collapsed?"true":"false");if(btn){btn.setAttribute("aria-label",collapsed?"Expand sidebar":"Collapse sidebar");btn.dataset.tooltip=collapsed?"Expand sidebar":"Collapse sidebar";const icon=btn.querySelector(".material-symbols-outlined");if(icon)icon.textContent=collapsed?"chevron_right":"chevron_left";}};
  window.changeGame=function(){window.location.href="../mlbb/index.html";};

  const NAV_ROOT_BY_PAGE={
    dashboard:"dashboard", collection:"collection", stats:"stats", tierlist:"tierlist", attributes:"attributes", settings:"settings",
    cookies:"collection", costumes:"collection", sets:"collection", powerups:"collection",
    "cookie-stats":"stats", "cookie-count":"stats", "costume-count":"stats", matrix:"stats"
  };
  const SECTION_TABS={
    collection:[
      ["cookies","cookie","Cookies"],
      ["costumes","checkroom","Costumes"],
      ["sets","group_work","Costume Sets"],
      ["powerups","diamond","Power-ups"]
    ],
    stats:[
      ["cookie-count","groups","Cookie Count"],
      ["costume-count","analytics","Costume Count"],
      ["matrix","grid_view","Matrix"]
    ]
  };
  function navRoot(id){return NAV_ROOT_BY_PAGE[id]||id;}
  function syncSectionNavigation(id){
    const host=document.getElementById("section-subnav-host"); if(!host)return;
    const root=navRoot(id), tabs=SECTION_TABS[root];
    if(!tabs){host.hidden=true;host.innerHTML="";return;}
    host.innerHTML=`<div class="section-subnav" role="tablist" aria-label="${root} sections">${tabs.map(([page,icon,label])=>`<button type="button" class="section-subnav-tab${page===id?" active":""}" onclick="switchTab('${page}')" role="tab" aria-selected="${page===id}"><span class="material-symbols-outlined">${icon}</span><span>${label}</span></button>`).join("")}</div>`;
    host.hidden=false;
  }
  function updateNavActive(id){document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===navRoot(id)));syncSectionNavigation(id);}
  function setupGroupedNavigation(){document.querySelectorAll(".nav-item[data-page]").forEach(btn=>{btn.onclick=()=>{const root=btn.dataset.page;const target=root==="collection"?"cookies":root==="stats"?"cookie-count":root;switchTab(target);};});}
  window.switchTab=function(id){
    clearCycles();
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    const page=document.getElementById(`view-${id}`); if(!page)return;
    page.classList.add("active");
    updateNavActive(id);
    if(id==="dashboard")window.renderDashboard();
    if(id==="cookies")window.renderCookies();
    if(id==="costumes")window.renderSkins();
    if(id==="sets")window.renderSets();
    if(id==="powerups")window.renderAllPowerups();
    if(id==="cookie-count")window.renderCookieCount();
    if(id==="costume-count")window.renderCostumeCount();
    if(id==="matrix")window.renderMatrix();
    if(id==="tierlist")window.renderTierList();
    if(id==="attributes")window.renderAttributes();
    if(id==="settings")window.renderSettingsPage();
    scrollToTop();
  };
  /* After data changes, re-render whichever page is open so counts, groups and the matrix stay current.
     (Cookie, costume and power-up lists are re-rendered by their own save/delete handlers.) */
  window.refreshActivePage=function(){
    const id=document.querySelector(".page.active")?.id.replace("view-","");
    const map={dashboard:"renderDashboard",sets:"renderSets","cookie-count":"renderCookieCount","costume-count":"renderCostumeCount",matrix:"renderMatrix",tierlist:"renderTierList"};
    if(map[id]){clearCycles();window[map[id]]();}
  };
  window.setupGroupedNavigation=setupGroupedNavigation;

                
  // Global search with debounce and section-aware results.
  function globalSearch(q){const box=document.getElementById("global-search-results");if(!box)return;const query=q.trim().toLowerCase();if(!query){box.hidden=true;box.innerHTML="";return;}const results=[];appData.cookies.filter(c=>[c.name,c.rarity,c.role,c.position,...(c.elements||[])].join(" ").toLowerCase().includes(query)).slice(0,8).forEach(c=>results.push({icon:"cookie",title:c.name,meta:c.rarity,action:`openCookieDetail('${esc(c.id)}')`}));appData.costumes.filter(s=>[s.name,s.rarity,s.set].join(" ").toLowerCase().includes(query)).slice(0,6).forEach(s=>results.push({icon:"checkroom",title:s.name,meta:s.rarity,action:`viewSkin(${appData.costumes.indexOf(s)})`}));[{id:"dashboard",title:"Dashboard",icon:"dashboard"},{id:"cookies",title:"Cookies",icon:"cookie"},{id:"costumes",title:"Costumes",icon:"checkroom"},{id:"cookie-count",title:"Cookie Count",icon:"groups"},{id:"costume-count",title:"Costume Count",icon:"analytics"},{id:"matrix",title:"Matrix",icon:"grid_view"},{id:"tierlist",title:"Tier List",icon:"leaderboard"},{id:"attributes",title:"Attributes",icon:"category"},{id:"settings",title:"Settings",icon:"settings"}].filter(p=>p.title.toLowerCase().includes(query)).forEach(p=>results.push({icon:p.icon,title:p.title,meta:"Page",action:`switchTab('${p.id}')`}));box.innerHTML=results.slice(0,10).map(r=>`<button class="global-search-result" onclick="${r.action};document.getElementById('global-search').value='';document.getElementById('global-search-results').hidden=true"><span class="material-symbols-outlined">${r.icon}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.meta)}</small></span></button>`).join("")||`<div class="global-search-empty">No results</div>`;box.hidden=false;}
  function initGlobalSearch(){const input=document.getElementById("global-search");if(!input)return;let timer;input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>globalSearch(input.value),220);});input.addEventListener("keydown",e=>{if(e.key==="Escape"){input.value="";globalSearch("");input.blur();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();input.focus();input.select();}});document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();input.focus();input.select();}});document.addEventListener("click",e=>{if(!e.target.closest(".global-search-shell")){document.getElementById("global-search-results")?.setAttribute("hidden","");}});}

  // MLBB-style Matrix: sticky inspector on the right and clickable overlap cells.
  let matrixSelection={row:"rarity",col:"role"};
      
  function setInitialSidebar(){const saved=localStorage.getItem("sidebar_collapsed")==="true";setSidebarCollapsed(saved);document.getElementById("toggle-sidebar")?.addEventListener("click",()=>setSidebarCollapsed(!document.getElementById("sidebar")?.classList.contains("collapsed")));}

  function initCustomTooltips(){
    let tip=document.getElementById("crk-custom-tooltip");if(!tip){tip=document.createElement("div");tip.id="crk-custom-tooltip";tip.className="crk-custom-tooltip";document.body.appendChild(tip);}
    document.addEventListener("mouseover",e=>{const el=e.target.closest("[title]");if(!el||el===tip)return;const title=el.getAttribute("title");if(!title)return;el.dataset.nativeTitle=title;el.removeAttribute("title");tip.textContent=title;tip.classList.add("visible");});
    document.addEventListener("mousemove",e=>{if(!tip.classList.contains("visible"))return;let x=e.clientX+12,y=e.clientY+14;if(x+tip.offsetWidth>innerWidth-8)x=e.clientX-tip.offsetWidth-12;if(y+tip.offsetHeight>innerHeight-8)y=e.clientY-tip.offsetHeight-12;tip.style.left=x+"px";tip.style.top=y+"px";});
    document.addEventListener("mouseout",e=>{const el=e.target.closest("[data-native-title]");if(el){el.setAttribute("title",el.dataset.nativeTitle);delete el.dataset.nativeTitle;}tip.classList.remove("visible");});
  }

  function init(){document.title="Cookie Run: Kingdom - Wiki";document.querySelectorAll(".crk-version").forEach(x=>x.textContent=VERSION);applyUiSettings();initGlobalSearch();initCustomTooltips();setInitialSidebar();setupGroupedNavigation();renderSettingsPage();}

  // Run the application only after every replacement module has loaded.
  /* ===== Dashboard, count pages, matrix ===== */
  {
  const {esc,NO_IMG,attrOf,attrIco,pic,ownerOf,headOf,headImg,glyph,isGlyph,clean}=window.crk;
  const icon=(cat,v)=>attrIco(cat,v,"attribute-icon")||glyph("label");
  window.renderDashboard=function(){
    const host=document.getElementById("dashboard-content");if(!host)return;
    const kpiHost=document.getElementById("dashboard-kpis"),quickHost=document.getElementById("dashboard-quick");
    const cookies=appData.cookies||[],costumes=appData.costumes||[],powerups=appData.powerups||[];
    const sets=new Set(costumes.map(x=>x.set).filter(Boolean));
    const missingOf=c=>typeof getCookieMissingFields==="function"?getCookieMissingFields(c):[];
    const incomplete=cookies.map(c=>({c,m:missingOf(c)})).filter(x=>x.m.length);
    const complete=cookies.length-incomplete.length,pct=cookies.length?Math.round(complete/cookies.length*100):0;
    const withGif=cookies.filter(c=>c.images?.splashGif).length;
    const kpis=[["Cookies",cookies.length,"cookie","In the collection","cookies"],["Costumes",costumes.length,"checkroom","Cosmetics","costumes"],["Costume Sets",sets.size,"collections_bookmark","Named sets","sets"],["Power-ups",powerups.length,"diamond","Upgrades","powerups"],["Complete Records",pct+"%","task_alt",complete+" of "+cookies.length+" cookies",null],["Animated Splash",withGif,"gif_box","Cookies with hover GIF",null]];
    if(kpiHost)kpiHost.innerHTML=kpis.map(([l,v,ic,sub,go])=>`<article class="dashboard-kpi"${go?` onclick="switchTab('${go}')" role="button" tabindex="0"`:""}><span class="material-symbols-outlined">${ic}</span><div><small>${l}</small><strong>${v}</strong><em>${sub}</em></div></article>`).join("");
    const q=(ic,t,sub,act)=>`<button type="button" onclick="${act}"><span class="material-symbols-outlined">${ic}</span><span><strong>${t}</strong><small>${sub}</small></span></button>`;
    if(quickHost)quickHost.innerHTML=q("person_add","Add Cookie","Create a new cookie","openCookieForm()")+q("add_photo_alternate","Add Costume","Create a new costume","openSkinForm()")+q("diamond","Add Power-up","Create a new power-up","openPowerupForm()")+q("leaderboard","Tier List","Rank your cookies","switchTab('tierlist')");
    const panel=(eyebrow,title,body,go,wide)=>`<section class="dashboard-panel${wide?" dashboard-panel-wide":""}"><div class="dashboard-panel-head"><div><span class="dashboard-eyebrow">${eyebrow}</span><h2>${title}</h2></div>${go?`<button class="btn btn-secondary btn-sm" onclick="switchTab('${go}')">View all</button>`:""}</div>${body}</section>`;
    const row=(im,t,sub,act)=>`<button type="button" class="dashboard-row" onclick="${act}">${im}<span><strong>${esc(t)}</strong><small>${esc(sub||"")}</small></span></button>`;
    const headOf=(c,fb)=>{const u=c?.images?.head||fb;return u?`<img src="${esc(u)}" alt="" onerror="this.style.visibility='hidden'">`:`<span class="material-symbols-outlined">cookie</span>`};
    const empty=t=>`<div class="empty-inline">${t}</div>`;
    const recentCookies=[...cookies].slice(-5).reverse().map(c=>row(headOf(c),c.name,[c.rarity,c.role].filter(Boolean).join(" · "),`openCookieDetail('${esc(c.id)}')`)).join("")||empty("No cookies yet.");
    const newestCostumes=costumes.map((s,i)=>({s,i})).slice(-5).reverse().map(({s,i})=>{const o=cookies.find(c=>c.id===s.ownerId);return row(headOf(o,s.card||s.sprite||s.splash),s.name,[o?.name,s.rarity].filter(Boolean).join(" · "),`viewSkin(${i})`)}).join("")||empty("No costumes yet.");
    const byOwner={};costumes.forEach(s=>{byOwner[s.ownerId]=(byOwner[s.ownerId]||0)+1});
    const leaders=Object.entries(byOwner).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,n],i)=>{const c=cookies.find(x=>x.id===id);return row(headOf(c),`${i+1}. ${c?.name||"Unknown"}`,`${n} costume${n===1?"":"s"}`,c?`openCookieDetail('${esc(c.id)}')`:"void 0")}).join("")||empty("No costumes assigned yet.");
    const rar={};cookies.forEach(c=>{if(c.rarity)rar[c.rarity]=(rar[c.rarity]||0)+1});const maxR=Math.max(1,...Object.values(rar));
    const bars=Object.entries(rar).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<div class="dashboard-bar"><span>${icon("rarity",r)}${esc(r)}</span><div><i style="width:${Math.round(n/maxR*100)}%"></i></div><b>${n}</b></div>`).join("")||empty("No data yet.");
    const health=incomplete.length?incomplete.slice(0,8).map(({c,m})=>row(headOf(c),c.name,"Missing: "+m.join(", "),`openCookieForm('${esc(c.id)}')`)).join(""):`<div class="empty-inline">Every cookie record is complete.</div>`;
    host.innerHTML=panel("Recent activity","Recently Added Cookies",`<div class="dashboard-list">${recentCookies}</div>`,"cookies",true)+panel("Collection","Newest Costumes",`<div class="dashboard-list">${newestCostumes}</div>`,"costumes")+panel("At a glance","Roster Leaders",`<div class="dashboard-list">${leaders}</div>`,"costume-count")+panel("Breakdown","Cookies by Rarity",`<div class="dashboard-bars">${bars}</div>`,"cookie-count")+panel("Data quality","Missing Inputs",`<div class="dashboard-list">${health}</div>`,null)
  };


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


  }

  /* ===== Boot (after every definition above) ===== */
  init();
  bootApp();
})();
