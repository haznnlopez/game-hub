/* CRK modal layer — image-first Cookie detail and cleaned forms. */
(function () {
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const src = (u) => u ? String(u) : "https://placehold.co/900x700/193b68/fff?text=No+Image";
  const safeImg = (u, cls="") => `<img class="${cls}" src="${esc(src(u))}" alt="" onerror="this.onerror=null;this.src='https://placehold.co/900x700/193b68/fff?text=No+Image'">`;
  const pill = (cat, value) => { const a=getAttr(cat,value)||{}; return `<span class="detail-pill">${a.icon?`<img src="${esc(a.icon)}" alt="">`:""}${esc(value)}</span>`; };

  function getTierForCookie(id, mode) {
    const lists = appData.tierLists?.[mode];
    if (lists) {
      const meta = lists.meta || appData.tierMeta || [];
      const key = Object.keys(lists.data || lists.tierList || {}).find((k) => (lists.data || lists.tierList)[k]?.includes(id));
      const t = meta.find(x=>x.id===key);
      return t?.label || key || "Unranked";
    }
    const key = Object.keys(appData.tierList || {}).find((k)=>(appData.tierList[k]||[]).includes(id));
    const t=(appData.tierMeta||[]).find(x=>x.id===key);
    return t?.label || key || "Unranked";
  }

  window.openImageViewer = function (title, imageUrl, returnModalId) {
    let modal=document.getElementById("crk-image-viewer");
    if(!modal){ modal=document.createElement("div");modal.id="crk-image-viewer";modal.className="modal crk-image-viewer";document.body.appendChild(modal); }
    modal.innerHTML=`<div class="image-viewer-box"><div class="modal-header"><div><h3>${esc(title)}</h3></div><div class="modal-header-actions"><button class="modal-btn-circle" onclick="closeImageViewer()" title="Back"><span class="material-symbols-outlined">arrow_back</span></button><button class="modal-btn-circle close" onclick="closeImageViewer()" title="Close"><span class="material-symbols-outlined">close</span></button></div></div><div class="image-viewer-body"><img src="${esc(src(imageUrl))}" alt="${esc(title)}" onerror="this.onerror=null;this.src='https://placehold.co/1200x800/193b68/fff?text=No+Image'"></div><div class="image-viewer-actions"><button class="btn btn-secondary" onclick="closeImageViewer()">Close</button><button class="btn btn-primary" onclick="downloadCRKImage('${esc(imageUrl)}','${esc(title)}')"><span class="material-symbols-outlined">download</span> Download as</button></div></div>`;
    modal.dataset.returnModal=returnModalId||"";modal.classList.add("open");
  };
  window.closeImageViewer=function(){const m=document.getElementById("crk-image-viewer");if(!m)return;m.classList.remove("open");if(m.dataset.returnModal)document.getElementById(m.dataset.returnModal)?.classList.add("open");};
  window.downloadCRKImage=async function(url,title){
    try{const r=await fetch(cleanUrl(url));const b=await r.blob();const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=(title||"cookie").replace(/[^a-z0-9_-]+/gi,"-")+".png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast("Image download started","success");}
    catch(e){window.open(cleanUrl(url),"_blank","noopener");showToast("Opened image in a new tab","info");}
  };

  window.openCookieDetail = function(id){
    const c=appData.cookies.find(x=>x.id===id); if(!c)return; currentDetailId=id;
    const modal=document.getElementById("modal-cookie-detail"), box=modal.querySelector(".modal-box"), content=document.getElementById("cookie-detail-content");
    const head=document.getElementById("cookie-modal-head"), name=document.getElementById("cookie-modal-name");
    if(head){head.src=src(c.images?.head);head.alt=c.name;} if(name)name.textContent=c.name;
    if(c.images?.bg){box.style.backgroundImage=`linear-gradient(to bottom,rgba(8,28,55,.86),rgba(8,28,55,.96)),url('${c.images.bg}')`;box.style.backgroundSize="cover";box.style.backgroundPosition="center";}else box.style.backgroundImage="none";
    const isGuest=c.rarity==="Guest";
    const pills=[pill("rarity",c.rarity)]; if(!isGuest){if(c.role)pills.push(pill("role",c.role));if(c.position)pills.push(pill("position",c.position));(c.elements||[]).forEach(e=>pills.push(pill("element",e)));}
    const splash=c.images?.splash, sprite=c.images?.sprite, card=c.images?.card;
    const costumes=appData.costumes.filter(x=>x.ownerId===id), powerups=isGuest?[]:appData.powerups.filter(x=>x.ownerId===id);
    const tierPve=getTierForCookie(id,"pve"),tierPvp=getTierForCookie(id,"pvp");
    const imageBlock=`<div class="cookie-modal-gallery"><button class="cookie-modal-splash" onclick="openImageViewer('${esc(c.name)} — Splash','${esc(splash||c.images?.head)}','modal-cookie-detail')">${safeImg(splash||c.images?.head,"cookie-splash-image")}</button><div class="cookie-modal-secondary-images"><button onclick="openImageViewer('${esc(c.name)} — Sprite','${esc(sprite||splash||c.images?.head)}','modal-cookie-detail')">${safeImg(sprite||splash||c.images?.head,"cookie-secondary-image")}<span>Sprite</span></button><button onclick="openImageViewer('${esc(c.name)} — Card','${esc(card||splash||c.images?.head)}','modal-cookie-detail')">${safeImg(card||splash||c.images?.head,"cookie-secondary-image")}<span>Card</span></button></div></div>`;
    const relatedCards=costumes.map(s=>{const idx=appData.costumes.indexOf(s);return `<article class="card crk-related-card" onclick="viewSkin(${idx})"><img class="card-img" src="${esc(s.card||s.splash||s.sprite||'https://placehold.co/200?text=?')}" alt=""><div class="card-overlay"><div class="card-text-wrapper"><div class="card-name">${esc(s.name)}</div><div class="card-sub">${esc(s.rarity||"")}</div></div></div></article>`;}).join("");
    content.innerHTML=`<div class="cookie-detail-v2"><div class="cookie-detail-media">${imageBlock}<div class="detail-pill-row">${pills.join("")}</div><div class="detail-pill-row tier-pill-row"><span class="detail-pill tier-pill"><strong>PvE</strong>${esc(tierPve)}</span><span class="detail-pill tier-pill"><strong>PvP</strong>${esc(tierPvp)}</span></div></div><div class="cookie-detail-copy">${c.description?`<section class="detail-section"><h3>Description</h3><div class="detail-desc">${smartText(c.description)}</div></section>`:""}${!isGuest&&c.skill?.name?`<section class="detail-section"><h3>Skill</h3><div class="skill-box">${c.skill.icon?safeImg(c.skill.icon,"skill-icon"):""}<div class="skill-content"><h4>${esc(c.skill.name)}</h4><div class="skill-desc">${smartText(c.skill.desc||"")}</div></div></div></section>`:""}<section class="detail-section"><h3>Costumes (${costumes.length})</h3>${relatedCards?`<div class="card-grid crk-related-grid">${relatedCards}</div>`:`<div class="empty-inline">No costumes recorded.</div>`}</section>${!isGuest?`<section class="detail-section"><h3>Power-ups (${powerups.length})</h3><div class="pu-grid crk-related-grid">${powerups.map(p=>{const i=appData.powerups.indexOf(p);return `<article class="pu-card crk-related-card" onclick="viewPowerup(${i})"><div class="pu-img-container">${safeImg(p.url10||p.url20||p.url30||c.images?.head,"pu-cycle-img")}</div><div class="card-overlay"><div class="card-text-wrapper"><div class="card-name">${esc(p.name)}</div><div class="card-sub">${esc(p.type||"")}</div></div></div></article>`;}).join("")}</div></section>`:""}</div></div>`;
    openModal("modal-cookie-detail");
  };

  window.openCookieForm = function(id=null){
    document.getElementById("cookie-form")?.reset();document.getElementById("cookie-form-title").textContent=id?"Edit Cookie":"Add Cookie";document.getElementById("cf-id").value=id||("c"+Date.now());
    setupDropdown("cf-rarity",appData.attributes.rarity,id?(appData.cookies.find(c=>c.id===id)?.rarity):"Common");
    setupDropdown("cf-role",appData.attributes.role,id?(appData.cookies.find(c=>c.id===id)?.role):"Charge");
    setupDropdown("cf-pos",appData.attributes.position,id?(appData.cookies.find(c=>c.id===id)?.position):"Front");
    const c=id&&appData.cookies.find(x=>x.id===id);const selected=c?.elements||[];const ec=document.getElementById("cf-elements");
    ec.innerHTML=`<div class="multi-select" id="element-multiselect"><button type="button" class="select-box" onclick="toggleMultiSelect(event)"><span id="selected-text">${selected.length?selected.map(esc).join(", "):"Select Elements..."}</span><span class="material-symbols-outlined">arrow_drop_down</span></button><div class="options-container" id="element-options">${appData.attributes.element.map(e=>`<label class="option"><input type="checkbox" value="${esc(e.name)}" ${selected.includes(e.name)?"checked":""} onchange="updateMultiSelectLabel()">${e.icon?`<img src="${esc(e.icon)}" alt="">`:""}<span>${esc(e.name)}</span></label>`).join("")}</div></div>`;
    if(c){document.getElementById("cf-name").value=c.name||"";document.getElementById("cf-description").value=c.description||"";document.getElementById("cf-head").value=c.images?.head||"";document.getElementById("cf-splash").value=c.images?.splash||"";document.getElementById("cf-sprite").value=c.images?.sprite||"";document.getElementById("cf-card").value=c.images?.card||"";document.getElementById("cf-bg").value=c.images?.bg||"";document.getElementById("cf-skill-name").value=c.skill?.name||"";document.getElementById("cf-skill-icon").value=c.skill?.icon||"";document.getElementById("cf-skill-desc").value=c.skill?.desc||"";}
    openModal("modal-cookie-form");setTimeout(updateGuestFieldVisibility,0);bindFormUrlPreview();
  };

  window.submitCookieForm=function(){
    const id=document.getElementById("cf-id").value, existing=appData.cookies.find(x=>x.id===id), rarity=getDropdownValue("cf-rarity"), guest=rarity==="Guest";
    const data={id,name:document.getElementById("cf-name").value.trim(),description:document.getElementById("cf-description").value.trim(),rarity,role:guest?"":getDropdownValue("cf-role"),position:guest?"":getDropdownValue("cf-pos"),elements:guest?[]:Array.from(document.querySelectorAll("#element-options input:checked")).map(x=>x.value),images:{head:cleanUrl(document.getElementById("cf-head").value),splash:cleanUrl(document.getElementById("cf-splash").value),sprite:cleanUrl(document.getElementById("cf-sprite").value),card:cleanUrl(document.getElementById("cf-card").value),bg:cleanUrl(document.getElementById("cf-bg").value)},skill:guest?{}:{name:document.getElementById("cf-skill-name").value.trim(),icon:cleanUrl(document.getElementById("cf-skill-icon").value),desc:document.getElementById("cf-skill-desc").value.trim()}};
    if(!data.name){showToast("Cookie name is required","info");return;} if(existing)Object.assign(existing,data);else appData.cookies.push(data);persistAppData();closeModal("modal-cookie-form");renderCookies();showToast("Cookie saved","success");
  };

  window.openSkinForm=function(idx=null){
    document.getElementById("modal-skin-form").classList.add("open");document.getElementById("sf-idx").value=idx!==null?idx:"";document.getElementById("skin-form-title").textContent=idx!==null?"Edit Costume":"Add Costume";
    const cookies=appData.cookies.map(c=>({name:c.name,value:c.id,icon:c.images?.head}));const s=idx!==null?appData.costumes[idx]:null;
    setupDropdown("sf-owner",cookies,s?.ownerId||currentDetailId||"");setupDropdown("sf-rarity",appData.attributes.skinRarity,s?.rarity||"Common");
    const sets=[...new Set(appData.costumes.map(c=>c.set).filter(Boolean))].sort();setupDropdown("sf-set",[{name:"No Set",value:""},...sets.map(x=>({name:x,value:x}))],s?.set||"");
    document.getElementById("sf-name").value=s?.name||"";document.getElementById("sf-desc").value=s?.desc||"";document.getElementById("sf-bg").value=s?.bg||"";document.getElementById("sf-card").value=s?.card||"";document.getElementById("sf-splash").value=s?.splash||"";document.getElementById("sf-sprite").value=s?.sprite||"";resetModalScroll("modal-skin-form");bindFormUrlPreview();
  };
  window.saveSkin=function(){const raw=document.getElementById("sf-idx").value;const c={name:document.getElementById("sf-name").value.trim(),ownerId:getDropdownValue("sf-owner"),rarity:getDropdownValue("sf-rarity"),set:getDropdownValue("sf-set"),desc:document.getElementById("sf-desc").value.trim(),bg:cleanUrl(document.getElementById("sf-bg").value),card:cleanUrl(document.getElementById("sf-card").value),splash:cleanUrl(document.getElementById("sf-splash").value),sprite:cleanUrl(document.getElementById("sf-sprite").value)};if(!c.name){showToast("Costume name is required","info");return;}if(raw!=="")appData.costumes[+raw]=c;else{c._addedAt=Date.now();appData.costumes.push(c);}persistAppData();closeModal("modal-skin-form");currentDetailId?openCookieDetail(currentDetailId):renderSkins();showToast("Costume saved","success");};

  window.editSkinFromDetail=function(){if(currentSkinIdx!==null){closeModal("modal-skin-detail");openSkinForm(currentSkinIdx);}};

  function bindFormUrlPreview(){
    document.querySelectorAll("#modal-cookie-form input,#modal-skin-form input,#modal-pu-form input").forEach(el=>{el.autocomplete="off";});
  }
  window.bindFormUrlPreview=bindFormUrlPreview;
  // URL preview + HD-fier via delegation so dynamically-created forms work too.
  document.addEventListener("mouseover",e=>{const el=e.target.closest("input[placeholder*='URL'],input[id*='url'],input[id*='head'],input[id*='card'],input[id*='splash'],input[id*='sprite'],input[id*='bg']");if(!el||!el.value)return;const t=document.getElementById("url-tooltip"),i=document.getElementById("url-tooltip-img");if(t&&i){i.src=cleanUrl(el.value);t.style.display="block";t.style.top=(e.clientY+15)+"px";t.style.left=(e.clientX+15)+"px";}});
  document.addEventListener("mousemove",e=>{const t=document.getElementById("url-tooltip");if(t&&t.style.display==="block"){t.style.top=(e.clientY+15)+"px";t.style.left=(e.clientX+15)+"px";}});
  document.addEventListener("mouseout",e=>{const el=e.target.closest("input[placeholder*='URL'],input[id*='url'],input[id*='head'],input[id*='card'],input[id*='splash'],input[id*='sprite'],input[id*='bg']");if(el){const t=document.getElementById("url-tooltip");if(t)t.style.display="none";}});

  window.hdFier=function(url){let u=cleanUrl(url);u=u.replace(/\/revision\/latest[^/]*/i,"");u=u.replace(/\/thumb\/([^/]+)\/\d+px-[^/?#]+/i,"/$1");u=u.replace(/\/\d+px-[^/?#]+(?=\?|#|$)/i,"");return u;};
  document.addEventListener("click",e=>{const b=e.target.closest("[data-hdfier-input]");if(!b)return;const input=document.getElementById(b.dataset.hdfierInput);if(input)input.value=hdFier(input.value);});

  // Make all URL fields show a small HD button without changing the data model.
  function injectHDFierButtons(){document.querySelectorAll("#modal-cookie-form input[placeholder*='URL'],#modal-skin-form input[placeholder*='URL'],#modal-pu-form input[placeholder*='URL']").forEach(input=>{if(input.parentElement.querySelector(`[data-hdfier-input='${input.id}']`))return;const w=document.createElement("div");w.className="url-field-wrap";input.parentNode.insertBefore(w,input);w.appendChild(input);const b=document.createElement("button");b.type="button";b.className="url-hdfier-btn";b.dataset.hdfierInput=input.id;b.title="Clean / HD-fy URL";b.innerHTML='<span class="material-symbols-outlined">high_quality</span>';w.appendChild(b);});}
  setTimeout(injectHDFierButtons,100);document.addEventListener("click",()=>setTimeout(injectHDFierButtons,20));
})();
