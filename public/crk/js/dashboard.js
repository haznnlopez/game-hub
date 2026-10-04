/* CRK dashboard/system layer — navigation, stats, settings, global search and DB fallback. */
(function () {
  const VERSION="v1.0.0";
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
  DB.setItemAwaited=DB.setItem;

  window.getUiSettings=function(){try{return {...UI_DEFAULTS,...JSON.parse(localStorage.getItem(UI_KEY)||"{}")};}catch(_){return {...UI_DEFAULTS};}};
  window.applyUiSettings=function(s=getUiSettings()){document.body.classList.toggle("ui-compact",!!s.compact);document.body.classList.toggle("ui-reduced-motion",!!s.reduceMotion);};
  window.saveUiPreferences=function(){const s={defaultPage:document.getElementById("settings-default-page")?.value||"dashboard",compact:!!document.getElementById("settings-compact-ui")?.checked,reduceMotion:!!document.getElementById("settings-reduce-motion")?.checked};localStorage.setItem(UI_KEY,JSON.stringify(s));const collapse=!!document.getElementById("settings-sidebar-collapsed")?.checked;setSidebarCollapsed(collapse);applyUiSettings(s);showToast("Settings saved","success");};
  function renderSettingsPage(){
    const page=document.getElementById("view-settings");
    if(!page)return;
    const s=getUiSettings();
    const select=document.getElementById("settings-default-page");
    if(select && typeof setupDropdown==="function") setupDropdown("settings-default-page",[
      {name:"Dashboard",value:"dashboard",icon:"dashboard"},
      {name:"Cookies",value:"cookies",icon:"cookie"},
      {name:"Costumes",value:"costumes",icon:"checkroom"},
      {name:"Costume Sets",value:"sets",icon:"group_work"},
      {name:"Power-ups",value:"powerups",icon:"diamond"},
      {name:"Cookie Stats",value:"cookie-stats",icon:"monitoring"},
      {name:"Cookie Count",value:"cookie-count",icon:"groups"},
      {name:"Costume Count",value:"costume-count",icon:"analytics"},
      {name:"Matrix",value:"matrix",icon:"grid_view"},
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
      ["cookie-stats","monitoring","Cookie Stats"],
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
  function setupGroupedNavigation(){document.querySelectorAll(".nav-item[data-page]").forEach(btn=>{btn.onclick=()=>{const root=btn.dataset.page;const target=root==="collection"?"cookies":root==="stats"?"cookie-stats":root;switchTab(target);};});}
  window.switchTab=function(id){
    clearCycles();
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    const page=document.getElementById(`view-${id}`); if(!page)return;
    page.classList.add("active");
    updateNavActive(id);
    if(id==="dashboard")renderDashboard();
    if(id==="cookies")renderCookies();
    if(id==="costumes")renderSkins();
    if(id==="sets")renderSets();
    if(id==="powerups")renderAllPowerups();
    if(id==="cookie-stats")renderCookieStats();
    if(id==="cookie-count")renderCookieCount();
    if(id==="costume-count")renderCostumeCount();
    if(id==="matrix")renderMatrix();
    if(id==="tierlist")renderTierList();
    if(id==="attributes")renderAttributes();
    if(id==="settings")renderSettingsPage();
    scrollToTop();
  };
  window.setupGroupedNavigation=setupGroupedNavigation;

  function renderDashboard(){const host=document.getElementById("dashboard-content");if(!host)return;const missing=appData.cookies.filter(c=>getCookieMissingFields(c).length).length;host.innerHTML=`<div class="stats-grid">${statCard("Cookies",appData.cookies.length,"cookie","Released collection")}${statCard("Costumes",appData.costumes.length,"checkroom","Cosmetics")}${statCard("Costume Sets",new Set(appData.costumes.map(x=>x.set).filter(Boolean)).size,"collections","Named sets")}${statCard("Power-ups",appData.powerups.length,"diamond","Upgrades")}${statCard("Missing Cookie Inputs",missing,"warning","Records needing cleanup")}</div><div class="dashboard-two-col">${bars("Cookie Rarity",counts(appData.cookies,"rarity"),"rarity")}${bars("Cookie Role",counts(appData.cookies,"role"),"role")}</div><section class="dashboard-panel"><div class="panel-heading"><h2>Quick actions</h2></div><div class="quick-actions"><button class="btn btn-primary" onclick="openCookieForm()">Add Cookie</button><button class="btn btn-secondary" onclick="openSkinForm()">Add Costume</button><button class="btn btn-secondary" onclick="openPowerupForm()">Add Power-up</button><button class="btn btn-secondary" onclick="switchTab('tierlist')">Open Tier List</button></div></section>`;}
  window.renderDashboard=renderDashboard;
  function renderCookieStats(){const host=document.getElementById("cookie-stats-content");if(!host)return;const complete=appData.cookies.filter(c=>!getCookieMissingFields(c).length).length;const withSplash=appData.cookies.filter(c=>c.images?.splash).length;host.innerHTML=`${statCard("Total Cookies",appData.cookies.length,"cookie")}${statCard("Complete Records",complete,"task_alt",`${appData.cookies.length?Math.round(complete/appData.cookies.length*100):0}% complete`)}${statCard("With Splash Art",withSplash,"wallpaper")}${statCard("With Description",appData.cookies.filter(c=>c.description).length,"description")}${bars("Rarity",counts(appData.cookies,"rarity"),"rarity")}${bars("Role",counts(appData.cookies,"role"),"role")}`;}
  window.renderCookieStats=renderCookieStats;
  function renderCookieCount(){const host=document.getElementById("cookie-count-content");if(!host)return;host.innerHTML=`${bars("By Rarity",counts(appData.cookies,"rarity"),"rarity")}${bars("By Role",counts(appData.cookies,"role"),"role")}${bars("By Position",counts(appData.cookies,"position"),"position")}${bars("By Element",(()=>{const m={};appData.cookies.forEach(c=>(c.elements||[]).forEach(e=>m[e]=(m[e]||0)+1));return m;})(),"element")}`;}
  window.renderCookieCount=renderCookieCount;
  function renderCostumeCount(){const host=document.getElementById("costume-count-content");if(!host)return;const ownerMap={};appData.costumes.forEach(s=>{const o=appData.cookies.find(c=>c.id===s.ownerId);const k=o?.name||"Unknown";ownerMap[k]=(ownerMap[k]||0)+1;});host.innerHTML=`${statCard("Total Costumes",appData.costumes.length,"checkroom")}${statCard("Costume Sets",new Set(appData.costumes.map(x=>x.set).filter(Boolean)).size,"collections")}${bars("By Rarity",counts(appData.costumes,"rarity"),"skinRarity")}${bars("By Cookie",ownerMap,null)}`;}
  window.renderCostumeCount=renderCostumeCount;

  // Global search with debounce and section-aware results.
  function globalSearch(q){const box=document.getElementById("global-search-results");if(!box)return;const query=q.trim().toLowerCase();if(!query){box.hidden=true;box.innerHTML="";return;}const results=[];appData.cookies.filter(c=>[c.name,c.rarity,c.role,c.position,...(c.elements||[])].join(" ").toLowerCase().includes(query)).slice(0,8).forEach(c=>results.push({icon:"cookie",title:c.name,meta:c.rarity,action:`openCookieDetail('${esc(c.id)}')`}));appData.costumes.filter(s=>[s.name,s.rarity,s.set].join(" ").toLowerCase().includes(query)).slice(0,6).forEach(s=>results.push({icon:"checkroom",title:s.name,meta:s.rarity,action:`viewSkin(${appData.costumes.indexOf(s)})`}));[{id:"dashboard",title:"Dashboard",icon:"dashboard"},{id:"cookies",title:"Cookies",icon:"cookie"},{id:"costumes",title:"Costumes",icon:"checkroom"},{id:"cookie-stats",title:"Cookie Stats",icon:"monitoring"},{id:"cookie-count",title:"Cookie Count",icon:"groups"},{id:"costume-count",title:"Costume Count",icon:"analytics"},{id:"matrix",title:"Matrix",icon:"grid_view"},{id:"tierlist",title:"Tier List",icon:"leaderboard"},{id:"attributes",title:"Attributes",icon:"category"},{id:"settings",title:"Settings",icon:"settings"}].filter(p=>p.title.toLowerCase().includes(query)).forEach(p=>results.push({icon:p.icon,title:p.title,meta:"Page",action:`switchTab('${p.id}')`}));box.innerHTML=results.slice(0,10).map(r=>`<button class="global-search-result" onclick="${r.action};document.getElementById('global-search').value='';document.getElementById('global-search-results').hidden=true"><span class="material-symbols-outlined">${r.icon}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.meta)}</small></span></button>`).join("")||`<div class="global-search-empty">No results</div>`;box.hidden=false;}
  function initGlobalSearch(){const input=document.getElementById("global-search");if(!input)return;let timer;input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>globalSearch(input.value),220);});input.addEventListener("keydown",e=>{if(e.key==="Escape"){input.value="";globalSearch("");input.blur();}});document.addEventListener("click",e=>{if(!e.target.closest(".global-search-shell")){document.getElementById("global-search-results")?.setAttribute("hidden","");}});}

  // MLBB-style Matrix: sticky inspector on the right and clickable overlap cells.
  let matrixSelection={row:"rarity",col:"role",items:[]};
  window.renderMatrix=function(){
    const host=document.getElementById("matrix-container");if(!host)return;
    const attrs=["rarity","role","position","element"];
    const row=matrixSelection.row,col=matrixSelection.col;
    const rowVals=(appData.attributes[row]||[]).map(x=>typeof x==="string"?x:x.name);
    const colVals=(appData.attributes[col]||[]).map(x=>typeof x==="string"?x:x.name);
    const matches=(rv,cv)=>appData.cookies.filter(c=>{const a=row==="element"?(c.elements||[]):[c[row]];const b=col==="element"?(c.elements||[]):[c[col]];return a.includes(rv)&&b.includes(cv);});
    host.innerHTML=`<div class="matrix-v2"><div class="matrix-v2-main"><div class="matrix-controls"><label>Rows<select id="matrix-row-v2">${attrs.map(x=>`<option value="${x}" ${x===row?"selected":""}>${capitalize(x)}</option>`).join("")}</select></label><label>Columns<select id="matrix-col-v2">${attrs.filter(x=>x!==row).map(x=>`<option value="${x}" ${x===col?"selected":""}>${capitalize(x)}</option>`).join("")}</select></label></div><div class="matrix-scroll"><table class="matrix-table matrix-v2-table"><thead><tr><th class="matrix-th">${capitalize(row)} × ${capitalize(col)}</th>${colVals.map(v=>`<th class="matrix-th">${iconForStat(col,v)}<span>${esc(v)}</span></th>`).join("")}</tr></thead><tbody>${rowVals.map(rv=>`<tr><th class="matrix-rh">${iconForStat(row,rv)}<span>${esc(rv)}</span></th>${colVals.map(cv=>{const items=matches(rv,cv);return `<td class="matrix-td ${items.length?"has-matches":""}" onclick="openMatrixCell(${JSON.stringify(rv)},${JSON.stringify(cv)})"><div class="matrix-cell-count">${items.length}</div><div class="matrix-cell-content">${items.slice(0,8).map(c=>`<img class="matrix-head" src="${esc(c.images?.head||'https://placehold.co/40?text=?')}" alt="${esc(c.name)}" title="${esc(c.name)}">`).join("")}</div>${items.length>8?`<small>+${items.length-8} more</small>`:""}</td>`;}).join("")}</tr>`).join("")}</tbody></table></div></div><aside class="matrix-inspector"><div class="matrix-inspector-head"><div><span>Selection</span><strong id="matrix-inspector-title">Select a cell</strong></div><span class="material-symbols-outlined">grid_view</span></div><div id="matrix-inspector-content" class="matrix-inspector-content"><div class="empty-state"><span class="material-symbols-outlined">touch_app</span><span>Click a matrix cell to inspect matching Cookies.</span></div></div></aside></div>`;
    document.getElementById("matrix-row-v2").onchange=e=>{matrixSelection.row=e.target.value;if(matrixSelection.col===matrixSelection.row)matrixSelection.col=attrs.find(x=>x!==matrixSelection.row);renderMatrix();};
    document.getElementById("matrix-col-v2").onchange=e=>{matrixSelection.col=e.target.value;renderMatrix();};
  };
  window.openMatrixCell=function(rv,cv){const row=matrixSelection.row,col=matrixSelection.col;const items=appData.cookies.filter(c=>(row==="element"?(c.elements||[]):[c[row]]).includes(rv)&&(col==="element"?(c.elements||[]):[c[col]]).includes(cv));const t=document.getElementById("matrix-inspector-title"),c=document.getElementById("matrix-inspector-content");if(t)t.textContent=`${rv} × ${cv} · ${items.length}`;if(c)c.innerHTML=items.length?items.map(x=>`<button class="matrix-cookie-row" onclick="openCookieDetail('${esc(x.id)}')"><img src="${esc(x.images?.head||'https://placehold.co/40?text=?')}" alt=""><span><strong>${esc(x.name)}</strong><small>${esc(x.rarity)} · ${esc(x.role||"Guest")}</small></span></button>`).join(""):`<div class="empty-state"><span>No matching cookies.</span></div>`;};

  function setInitialSidebar(){const saved=localStorage.getItem("sidebar_collapsed")==="true";setSidebarCollapsed(saved);document.getElementById("toggle-sidebar")?.addEventListener("click",()=>setSidebarCollapsed(!document.getElementById("sidebar")?.classList.contains("collapsed")));}

  function initCustomTooltips(){
    let tip=document.getElementById("crk-custom-tooltip");if(!tip){tip=document.createElement("div");tip.id="crk-custom-tooltip";tip.className="crk-custom-tooltip";document.body.appendChild(tip);}
    document.addEventListener("mouseover",e=>{const el=e.target.closest("[title]");if(!el||el===tip)return;const title=el.getAttribute("title");if(!title)return;el.dataset.nativeTitle=title;el.removeAttribute("title");tip.textContent=title;tip.classList.add("visible");});
    document.addEventListener("mousemove",e=>{if(!tip.classList.contains("visible"))return;let x=e.clientX+12,y=e.clientY+14;if(x+tip.offsetWidth>innerWidth-8)x=e.clientX-tip.offsetWidth-12;if(y+tip.offsetHeight>innerHeight-8)y=e.clientY-tip.offsetHeight-12;tip.style.left=x+"px";tip.style.top=y+"px";});
    document.addEventListener("mouseout",e=>{const el=e.target.closest("[data-native-title]");if(el){el.setAttribute("title",el.dataset.nativeTitle);delete el.dataset.nativeTitle;}tip.classList.remove("visible");});
  }

  function init(){document.title="Cookie Run: Kingdom — Knowledge Hub";document.querySelectorAll(".crk-version").forEach(x=>x.textContent=VERSION);applyUiSettings();initGlobalSearch();initCustomTooltips();setInitialSidebar();setupGroupedNavigation();renderSettingsPage();}

  // Run the application only after every replacement module has loaded.
  init();
  bootApp();
})();
