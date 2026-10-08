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
    

  /* ===== Forms, detail modals, set modal ===== */
  {
  const {esc,NO_IMG,attrOf,attrIco,pic,ownerOf,headOf,headImg,glyph,isGlyph,clean}=window.crk;
  /* Costume set dropdown: "No Set" + each set, cycling through the heads of its costumes. */
  function setOptions(){
    const sets={};
    (appData.costumes||[]).forEach(x=>{if(!x.set)return;const h=headOf(ownerOf(x.ownerId),x.card||x.sprite);(sets[x.set]??=[]);if(h&&!sets[x.set].includes(h))sets[x.set].push(h);});
    return [{name:'No Set',value:'',icon:'block'},...Object.keys(sets).map(n=>({name:n,value:n,icon:sets[n][0]||'collections_bookmark',cycle:sets[n]}))];
  }
  window.openCookieForm=function(id=null){const f=document.getElementById('cookie-form');f?.reset();document.getElementById('cookie-form-title').textContent=id?'Edit Cookie':'Add Cookie';document.getElementById('cf-id').value=id||('c'+Date.now());const c=id?appData.cookies.find(x=>x.id===id):null;setupDropdown('cf-rarity',appData.attributes.rarity,c?.rarity||'Common');setupDropdown('cf-role',appData.attributes.role,c?.role||'Charge');setupDropdown('cf-pos',appData.attributes.position,c?.position||'Front');const chosen=c?.elements||[];const ec=document.getElementById('cf-elements');ec.innerHTML=`<div class="multi-select crk-multi-select" id="element-multiselect"><button type="button" class="select-box" onclick="toggleMultiSelect(event)"><span id="selected-text">${chosen.length?chosen.join(', '):'Select Elements...'}</span><span class="material-symbols-outlined">expand_more</span></button><div class="options-container" id="element-options">${(appData.attributes.element||[]).map(e=>`<label class="option"><input type="checkbox" value="${esc(e.name)}" ${chosen.includes(e.name)?'checked':''} onchange="updateMultiSelectLabel()">${e.icon?`<img src="${esc(e.icon)}">`:''}<span>${esc(e.name)}</span></label>`).join('')}</div></div>`;if(c){document.getElementById('cf-name').value=c.name||'';document.getElementById('cf-description').value=c.description||'';document.getElementById('cf-head').value=c.images?.head||'';document.getElementById('cf-splash').value=c.images?.splash||'';document.getElementById('cf-gif').value=c.images?.splashGif||'';document.getElementById('cf-sprite').value=c.images?.sprite||'';document.getElementById('cf-card').value=c.images?.card||'';document.getElementById('cf-bg').value=c.images?.bg||'';document.getElementById('cf-skill-name').value=c.skill?.name||'';document.getElementById('cf-skill-icon').value=c.skill?.icon||'';document.getElementById('cf-skill-desc').value=c.skill?.desc||'';}openModal('modal-cookie-form');setTimeout(()=>{updateGuestFieldVisibility?.();autoHDFields();resetModalScroll('modal-cookie-form');},20);};
  window.submitCookieForm=function(){const id=document.getElementById('cf-id').value,existing=appData.cookies.find(x=>x.id===id),rarity=getDropdownValue('cf-rarity'),guest=rarity==='Guest';const data={id,name:document.getElementById('cf-name').value.trim(),description:document.getElementById('cf-description').value.trim(),rarity,role:guest?'':getDropdownValue('cf-role'),position:guest?'':getDropdownValue('cf-pos'),elements:guest?[]:[...document.querySelectorAll('#element-options input:checked')].map(x=>x.value),images:{head:clean(document.getElementById('cf-head').value),splash:clean(document.getElementById('cf-splash').value),splashGif:clean(document.getElementById('cf-gif').value),sprite:clean(document.getElementById('cf-sprite').value),card:clean(document.getElementById('cf-card').value),bg:clean(document.getElementById('cf-bg').value)},skill:guest?{}:{name:document.getElementById('cf-skill-name').value.trim(),icon:clean(document.getElementById('cf-skill-icon').value),desc:document.getElementById('cf-skill-desc').value.trim()}};if(!data.name){showToast('Cookie name is required','info');return;}if(existing)Object.assign(existing,data);else appData.cookies.push(data);persistAppData();closeModal('modal-cookie-form');renderCookies();showToast('Cookie saved','success');};

  window.openSkinForm=function(idx=null,ownerId=null){const s=idx!==null?appData.costumes[idx]:null;document.getElementById('sf-idx').value=idx===null?'':idx;document.getElementById('skin-form-title').textContent=s?'Edit Costume':'Add Costume';setupDropdown('sf-owner',appData.cookies.map(c=>({name:c.name,value:c.id,icon:c.images?.head})),s?.ownerId||ownerId||appData.cookies[0]?.id||'');setupDropdown('sf-rarity',appData.attributes.skinRarity||[],s?.rarity||appData.attributes.skinRarity?.[0]?.name||'');setupDropdown('sf-set',setOptions(),s?.set||'');document.getElementById('sf-name').value=s?.name||'';document.getElementById('sf-desc').value=s?.desc||'';document.getElementById('sf-bg').value=s?.bg||'';document.getElementById('sf-card').value=s?.card||'';document.getElementById('sf-splash').value=s?.splash||'';document.getElementById('sf-gif').value=s?.splashGif||s?.gif||'';document.getElementById('sf-sprite').value=s?.sprite||'';openModal('modal-skin-form');setTimeout(()=>{autoHDFields();resetModalScroll('modal-skin-form')},20);};
  window.saveSkin=function(){const raw=document.getElementById('sf-idx').value,s={name:document.getElementById('sf-name').value.trim(),ownerId:getDropdownValue('sf-owner'),rarity:getDropdownValue('sf-rarity'),set:getDropdownValue('sf-set'),desc:document.getElementById('sf-desc').value.trim(),bg:clean(document.getElementById('sf-bg').value),card:clean(document.getElementById('sf-card').value),splash:clean(document.getElementById('sf-splash').value),splashGif:clean(document.getElementById('sf-gif').value),sprite:clean(document.getElementById('sf-sprite').value)};if(!s.name){showToast('Costume name is required','info');return;}if(raw!=='')appData.costumes[+raw]=s;else{appData.costumes.push({...s,_addedAt:Date.now()});}persistAppData();closeModal('modal-skin-form');renderSkins();showToast('Costume saved','success');};
  window.openPowerupForm=function(idx=null,ownerId=null){const p=idx!==null?appData.powerups[idx]:null;document.getElementById('puf-idx').value=idx===null?'':idx;document.getElementById('pu-form-title').textContent=p?'Edit Power-up':'Add Power-up';setupDropdown('puf-owner',appData.cookies.map(c=>({name:c.name,value:c.id,icon:c.images?.head})),p?.ownerId||ownerId||appData.cookies[0]?.id||'');setupDropdown('puf-type',appData.attributes.powerupType||[],p?.type||appData.attributes.powerupType?.[0]?.name||'');document.getElementById('puf-name').value=p?.name||'';document.getElementById('puf-desc').value=p?.desc||'';document.getElementById('puf-ingredient-name').value=p?.ingredientName||'';document.getElementById('puf-ingredient-url').value=p?.ingredientUrl||'';document.getElementById('puf-10-url').value=p?.url10||'';document.getElementById('puf-20-url').value=p?.url20||'';document.getElementById('puf-30-url').value=p?.url30||'';openModal('modal-pu-form');setTimeout(()=>{autoHDFields();resetModalScroll('modal-pu-form')},20);};
  window.savePowerup=function(){const raw=document.getElementById('puf-idx').value,p={name:document.getElementById('puf-name').value.trim(),ownerId:getDropdownValue('puf-owner'),type:getDropdownValue('puf-type'),desc:document.getElementById('puf-desc').value.trim(),ingredientName:document.getElementById('puf-ingredient-name').value.trim(),ingredientUrl:clean(document.getElementById('puf-ingredient-url').value),url10:clean(document.getElementById('puf-10-url').value),url20:clean(document.getElementById('puf-20-url').value),url30:clean(document.getElementById('puf-30-url').value)};if(!p.name){showToast('Power-up name is required','info');return;}if(raw!=='')appData.powerups[+raw]=p;else appData.powerups.push({...p,_addedAt:Date.now()});persistAppData();closeModal('modal-pu-form');renderAllPowerups();showToast('Power-up saved','success');};


  window.autoHDFields=function(){document.querySelectorAll('#modal-cookie-form input[placeholder*="URL"],#modal-skin-form input[placeholder*="URL"],#modal-pu-form input[placeholder*="URL"]').forEach(input=>{if(input.dataset.hdBound)return;input.dataset.hdBound='1';const cleanNow=()=>{if(input.value){const before=input.value;const after=typeof hdFier==='function'?hdFier(before):before;if(after&&after!==before)input.value=after;}};input.addEventListener('input',cleanNow);input.addEventListener('blur',cleanNow);});};

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
      <div class="detail-images">${splashBlock(splash, gif, c.name, "modal-cookie-detail")}
        <div class="detail-thumbs">${thumb("Sprite", c.images?.sprite || splash, c.name, "modal-cookie-detail")}${thumb("Card", c.images?.card || splash, c.name, "modal-cookie-detail")}</div></div>
      <div class="detail-cols">
        <div class="info-card"><h4>About</h4><p>${esc(c.description || "No description recorded.")}</p></div>
        <div class="info-card"><h4>Details</h4><dl class="facts facts-stack">${fact("Rarity", c.rarity, attrIco("rarity", c.rarity))}${fact("Role", c.role, attrIco("role", c.role))}${fact("Position", c.position, attrIco("position", c.position))}${els ? `<div class="fact"><dt>Elements</dt><dd class="fact-chips">${els}</dd></div>` : ""}${fact("PvE tier", tierFor(id, "pve"))}${fact("PvP tier", tierFor(id, "pvp"))}</dl></div>
      </div>
      <div class="info-card skill-card"><h4>Skill</h4><div class="skill-line">${c.skill?.icon ? pic(c.skill.icon, "skill-icon") : ""}<div><strong>${esc(c.skill?.name || "No skill recorded")}</strong><p>${esc(c.skill?.desc || "")}</p></div></div></div>
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
      <div class="detail-images">${splashBlock(splash, gif, s.name, "modal-skin-detail")}
        <div class="detail-thumbs">${thumb("Card", s.card || splash, s.name, "modal-skin-detail")}${thumb("Sprite", s.sprite || splash, s.name, "modal-skin-detail")}</div></div>
      <div class="detail-cols">
        <div class="info-card"><h4>About</h4><p>${esc(s.desc || "No description recorded.")}</p></div>
        <div class="info-card"><h4>Details</h4><dl class="facts facts-stack">${fact("Cookie", owner?.name || "Unknown cookie", owner ? headImg(owner, "", "fact-head") : "")}${fact("Rarity", s.rarity, attrIco("skinRarity", s.rarity))}${fact("Set", s.set, glyph("collections_bookmark", "fact-glyph"))}</dl></div>
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
      <div class="detail-cols">
        <div class="info-card"><h4>About</h4><p>${esc(p.desc || "No description recorded.")}</p></div>
        <div class="info-card"><h4>Details</h4><dl class="facts facts-stack">${fact("Category", p.type, attrIco("powerupType", p.type))}${fact("Cookie", owner?.name || "Unknown cookie", owner ? headImg(owner, "", "fact-head") : "")}</dl></div>
      </div>
      ${p.ingredientName || p.ingredientUrl ? section("Ingredient", null, `<div class="ingredient-row">${p.ingredientUrl ? pic(p.ingredientUrl, "ingredient-image") : ""}<div class="ingredient-name">${esc(p.ingredientName || "Ingredient")}</div></div>`) : ""}`;
    openModal("modal-pu-detail"); resetModalScroll("modal-pu-detail");
  };


  window.viewSet=function(setName){const modal=document.getElementById('modal-set-detail'),content=document.getElementById('set-detail-content'),items=(appData.costumes||[]).filter(s=>(s.set||'')===setName);document.getElementById('set-detail-title').textContent=setName||'Costume Set';content.innerHTML=`<div class="set-modal-grid">${items.map((s)=>`<article class="related-square-card" onclick="viewSkin(${appData.costumes.indexOf(s)});closeModal('modal-set-detail')">${img(s.card||s.splash||s.sprite,'related-square-image')}<div class="related-hover"><strong>${esc(s.name)}</strong><small>${esc(s.rarity||'')}</small></div></article>`).join('')||'<div class="empty-inline">No costumes are assigned to this set.</div>'}</div>`;openModal('modal-set-detail');};


  }
})();
