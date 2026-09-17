      /* UPCOMING & RELEASE */
      function renderUpcomingPage(v = null) {
        if (v) currentUpcomingView = v;
        const allUpcoming = getUpcoming();
        const heroCount = allUpcoming.filter(
          (x) => x.itemType === "hero",
        ).length;
        const skinCount = allUpcoming.filter(
          (x) => x.itemType === "skin",
        ).length;
        const heroTab = document.getElementById("tab-upcoming-heroes");
        const skinTab = document.getElementById("tab-upcoming-skins");
        heroTab.classList.toggle("active", currentUpcomingView === "heroes");
        skinTab.classList.toggle("active", currentUpcomingView === "skins");
        document.getElementById("tab-count-heroes").textContent =
          heroCount || "";
        document.getElementById("tab-count-skins").textContent =
          skinCount || "";

        // Update add button based on active tab
        const heroBtn = document.getElementById("upcoming-add-hero-btn");
        const skinBtn = document.getElementById("upcoming-add-skin-btn");
        if (heroBtn)
          heroBtn.style.display =
            currentUpcomingView === "heroes" ? "inline-flex" : "none";
        if (skinBtn)
          skinBtn.style.display =
            currentUpcomingView === "skins" ? "inline-flex" : "none";

        // Show/hide and populate hero filter for skin view
        const heroFilterWrap = document.getElementById(
          "upcoming-hero-filter-wrap",
        );
        const heroFilterSel = document.getElementById("filter-upcoming-hero");
        if (heroFilterWrap)
          heroFilterWrap.style.display =
            currentUpcomingView === "skins" ? "" : "none";
        if (heroFilterSel && currentUpcomingView === "skins") {
          const skinHeroes = [
            ...new Set(
              allUpcoming
                .filter((x) => x.itemType === "skin")
                .map((x) => x.heroId),
            ),
          ];
          const allHeroes = [
            ...getHeroes(),
            ...allUpcoming.filter((x) => x.itemType === "hero"),
          ];
          const prevVal = heroFilterSel.value;
          heroFilterSel.innerHTML = '<option value="">All Heroes</option>';
          skinHeroes.forEach((hid) => {
            const hObj = allHeroes.find((h) => h.id === hid);
            if (hObj) {
              const o = document.createElement("option");
              o.value = hid;
              o.textContent = hObj.name + (hObj.itemType ? "  (Upcoming)" : "");
              heroFilterSel.appendChild(o);
            }
          });
          heroFilterSel.value = prevVal;
        }

        const g = document.getElementById("upcoming-grid");
        g.innerHTML = "";

        const fSearch = document
          .getElementById("filter-upcoming-search")
          .value.toLowerCase();
        const fHero =
          heroFilterSel && currentUpcomingView === "skins"
            ? heroFilterSel.value || ""
            : "";
        let l = getUpcoming().filter(
          (x) =>
            x.itemType === (currentUpcomingView === "heroes" ? "hero" : "skin"),
        );
        if (fSearch)
          l = l.filter((x) => x.name.toLowerCase().includes(fSearch));
        if (fHero) l = l.filter((x) => x.heroId === fHero);
        l = applySortPill(l, "upcoming");
        l = applyStarredSort(l);
        const starred = getStarred();

        if (l.length === 0) {
          document.getElementById("no-upcoming-message").style.display =
            "block";
          return;
        }
        document.getElementById("no-upcoming-message").style.display = "none";

        const normRole = (r) =>
          r
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z\-]/g, "");
        const f = document.createDocumentFragment();
        l.forEach((x) => {
          const c = document.createElement("div");
          const isStarredCard = !!starred[x.id];
          c.className = "unified-card" + (isStarredCard ? " starred-card" : "");

          let glowStyle = "transparent";
          if (x.itemType === "hero") {
            if (x.roles && x.roles.length > 0) {
              const colors = x.roles.map(
                (r) => `var(--role-${normRole(r)}, #555)`,
              );
              if (colors.length === 1) glowStyle = colors[0];
              else glowStyle = `linear-gradient(135deg, ${colors.join(", ")})`;
            }
          } else {
            let raritySlug = "basic";
            if (x.collectible)
              raritySlug = x.collectible.toLowerCase().replace(/\s+/g, "-");
            else if (x.rarity)
              raritySlug = x.rarity.toLowerCase().replace(/\s+/g, "-");
            glowStyle = `var(--rarity-${raritySlug}, var(--rarity-basic))`;
          }
          c.style.setProperty("--card-glow", glowStyle);

          const sub =
            x.itemType === "hero"
              ? x.roles
                ? x.roles.join(" / ")
                : ""
              : x.rarity || x.collectible || "Skin";

          let imgSrc =
            x.splashArt || x.imageUrl || "https://placehold.co/400x225";
          let imgStyle = "";
          if (x.itemType === "skin" && !x.splashArt && !x.imageUrl) {
            const imgData = getSkinImageWithFallback(x, "splash");
            imgSrc = imgData.src;
            if (imgData.isGreyed)
              imgStyle = ' style="filter: grayscale(100%) opacity(0.5);"';
          }

          // Hero skill icons (for hero cards)
          let skillsHtml = "";
          if (x.itemType === "hero" && x.skills && x.skills.length > 0) {
            const skillItems = x.skills
              .map((s) => {
                const all = [
                  { name: s.name, icon: s.icon || "" },
                  ...(s.subSkills || []).map((ss) => ({
                    name: ss.name || s.name,
                    icon: ss.icon || s.icon || "",
                    greyed: !ss.icon,
                  })),
                ];
                const hasSubs = all.length > 1;
                return `<div class="card-skill-strip-wrapper" data-skill-name="${s.name.replace(/"/g, "&quot;")}" data-skill-variants="${encodeURIComponent(JSON.stringify(all))}" onmouseenter="startSkillCycle(this)" onmouseleave="stopSkillCycle(this)"><img src="${s.icon || ""}" class="card-skill-strip-icon${hasSubs ? " sub-cycling" : ""}" onerror="this.src=''"></div>`;
              })
              .join("");
            skillsHtml = `<div class="card-skill-strip">${skillItems}</div>`;
          }

          // Hero icon (for skin cards)
          let heroIconHtml = "";
          if (x.itemType === "skin") {
            const hero =
              getHeroById(x.heroId) ||
              getUpcoming().find(
                (z) => z.id === x.heroId && z.itemType === "hero",
              );
            if (hero && hero.icon)
              heroIconHtml = `<div class="card-hero-icon" style="background-image:url('${hero.icon}')" title="${hero.name}"></div>`;
          }

          // Painted pill
          let paintedPillHtml = "";
          if (
            x.itemType === "skin" &&
            x.paintedSkins &&
            x.paintedSkins.length > 0
          ) {
            const count = x.paintedSkins.length;
            paintedPillHtml = `<span class="painted-pill" onmouseenter="showPaintedPopup(event,JSON.parse(this.dataset.skins),this)" onmouseleave="hidePaintedPopup()" data-skins='${JSON.stringify(x.paintedSkins.map((p) => ({ name: p.name, splashArt: p.splashArt || "" })))}' onclick="event.stopPropagation()">+${count}</span>`;
          }

          // Meta row: release date + price
          let releaseDateHtml = "";
          let priceHtml = "";
          let upcomingMetaHtml = "";
          const hasDate = !!x.releaseDate;
          const hasBP = !!x.priceBP;
          const hasDia = !!x.priceDiamonds;
          if (hasDate || hasBP || hasDia) {
            upcomingMetaHtml = '<div class="card-meta-row">';
            if (x.releaseDate)
              upcomingMetaHtml += `<span class="card-meta-item"><span class="material-symbols-outlined card-meta-icon">calendar_month</span>${x.releaseDate}</span>`;
            if (x.priceBP)
              upcomingMetaHtml += `<span class="card-meta-item"><svg class="card-meta-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/><text x="10" y="14.5" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">BP</text></svg>${x.priceBP}</span>`;
            if (x.priceDiamonds)
              upcomingMetaHtml += `<span class="card-meta-item"><svg class="card-meta-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="10,2 18,8 10,18 2,8" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polygon points="10,2 14,8 10,11 6,8" fill="currentColor" opacity="0.35"/></svg>${x.priceDiamonds}</span>`;
            upcomingMetaHtml += "</div>";
          }

          const starIcon = isStarredCard ? "star" : "star_border";
          const starCls = isStarredCard ? "starred" : "";
          let overlayActions;
          if (x.itemType === "skin") {
            overlayActions = `<div class="card-overlay-actions"><div class="overlay-btn star ${starCls}" onclick="event.stopPropagation();toggleStar('${x.id}',renderUpcomingPage)"><span class="material-symbols-outlined">${starIcon}</span></div><div class="overlay-btn" onclick="renderSkinForm('${x.id}',true)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteSkin('${x.id}',true)"><span class="material-symbols-outlined">delete</span></div></div>`;
          } else {
            overlayActions = `<div class="card-overlay-actions"><div class="overlay-btn star ${starCls}" onclick="event.stopPropagation();toggleStar('${x.id}',renderUpcomingPage)"><span class="material-symbols-outlined">${starIcon}</span></div><div class="overlay-btn" onclick="renderHeroFormPage('${x.id}',true)"><span class="material-symbols-outlined">edit</span></div><div class="overlay-btn delete" onclick="deleteHero('${x.id}',true)"><span class="material-symbols-outlined">delete</span></div></div>`;
          }

          // Rarity image for upcoming skins
          const upcomingRarityImg =
            x.itemType === "skin"
              ? x.skinTag || getAttrImage("skinRarities", x.rarity || "")
              : "";
          const upcomingRarityHtml = upcomingRarityImg
            ? `<img src="${upcomingRarityImg}" style="height:22px;width:auto;max-width:56px;object-fit:contain;flex-shrink:0;vertical-align:middle;" onerror="this.style.display='none'">`
            : "";

          // Upcoming hero attr tags — all inline in one row
          let upcomingAttrHtml = "";
          if (x.itemType === "hero") {
            const allTags = [
              buildAttrTags(x.roles, "roles"),
              buildAttrTags(x.lanes, "lanes"),
              buildAttrTags(x.specialties, "specialties"),
            ]
              .filter(Boolean)
              .join("");
            if (allTags)
              upcomingAttrHtml = `<div class="attr-tag-row">${allTags}</div>`;
          }

          const skinTitleHtml =
            x.itemType === "skin"
              ? `<span style="display:inline-flex;align-items:center;gap:0.35rem;">${upcomingRarityHtml}${x.name}${paintedPillHtml}</span>`
              : x.name;

          c.dataset.itemType = x.itemType;
          c.dataset.itemId = x.id;
          // Skill strip always goes inside image wrapper (absolute at bottom)
          c.innerHTML = `<div class="card-image-wrapper">${heroIconHtml}${skillsHtml}<img src="${imgSrc}" class="card-image"${imgStyle}>${overlayActions}</div><div class="card-content"><h3 class="card-title">${skinTitleHtml}</h3><div class="card-subtitle">${sub}</div>${upcomingAttrHtml}${upcomingMetaHtml}</div><div class="card-action-area"><button class="btn btn-release" onclick="event.stopPropagation();releaseItem('${x.itemType}','${x.id}')">Release</button></div>`;

          c.onclick = (e) => {
            if (
              !e.target.closest(".btn-release") &&
              !e.target.closest(".card-overlay-actions") &&
              !e.target.closest(".painted-pill")
            ) {
              const card = e.currentTarget;
              openModal(card.dataset.itemType, card.dataset.itemId);
            }
          };
          f.appendChild(c);
        });
        g.appendChild(f);
        requestAnimationFrame(initAllSkillCycles);
      }

      function releaseItem(type, id) {
        showConfirm(`Release this ${type}?`, () => {
          const l = getUpcoming();
          const updated = l.filter((x) => x.id !== id);
          saveUpcoming(updated);

          if (type === "hero") {
            const h = l.find((x) => x.id === id && x.itemType === "hero");
            if (h) {
              delete h.itemType;
              const heroes = getHeroes();
              const idx = heroes.findIndex((x) => x.id === id);
              if (idx > -1) heroes[idx] = h;
              else heroes.push(h);
              saveHeroes(heroes);
              populateFilters();
            }
          } else {
            const s = l.find((x) => x.id === id && x.itemType === "skin");
            if (s) {
              delete s.itemType;
              const skins = getSkins();
              const idx = skins.findIndex((x) => x.id === id);
              if (idx > -1) skins[idx] = s;
              else skins.push(s);
              saveSkins(skins);
            }
          }

          renderUpcomingPage();
          showToast("Released!", "success");
        });
      }

      function deleteSkin(id, isUp) {
        showConfirm("Delete Skin?", () => {
          const l = isUp ? getUpcoming() : getSkins();
          const n = l.filter((x) => x.id !== id);
          isUp ? saveUpcoming(n) : saveSkins(n);
          isUp ? renderUpcomingPage() : renderSkinsPage();
          showToast("Deleted", "success");
        });
      }
