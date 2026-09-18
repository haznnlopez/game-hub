      /* MODAL */
      function snapshotCurrentModal() {
        if (!currentModalData) return null;
        return {
          type: currentModalData.type,
          id: currentModalData.id,
          activeImg: currentModalData.activeImg || "splash",
          paintedSkinIndex:
            currentModalData.paintedSkinIndex == null
              ? null
              : currentModalData.paintedSkinIndex,
        };
      }

      function updateModalBackButton() {
        const btn = document.getElementById("modal-back-btn");
        if (!btn) return;
        btn.classList.toggle("visible", modalHistory.length > 0);
        btn.disabled = modalHistory.length === 0;
      }

      function createModalReturnContext() {
        const current = snapshotCurrentModal();
        if (!current) return currentPageId;
        const payload = {
          sourcePage: currentPageId,
          current,
          history: modalHistory,
        };
        return `modal:${encodeURIComponent(JSON.stringify(payload))}`;
      }

      function restoreModalReturnContext(token) {
        try {
          const payload = JSON.parse(decodeURIComponent(token.slice(6)));
          showPage(payload.sourcePage || "page-heroes", true);
          modalHistory = Array.isArray(payload.history) ? payload.history : [];
          if (payload.current?.type && payload.current?.id) {
            openModal(payload.current.type, payload.current.id, {
              fromHistory: true,
              restoreState: payload.current,
            });
          }
        } catch (err) {
          console.error("Could not restore modal context", err);
          showPage("page-heroes", true);
        }
      }

      function goBackModal() {
        const previous = modalHistory.pop();
        if (!previous) {
          updateModalBackButton();
          return;
        }
        openModal(previous.type, previous.id, {
          fromHistory: true,
          restoreState: previous,
        });
      }

      function openSkinFormFromModal(heroId) {
        const returnContext = createModalReturnContext();
        closeModal(false);
        renderSkinForm(null, false, returnContext);
        const select = document.getElementById("skin-hero-id");
        if (select) select.value = heroId;
      }

      function openModal(type, id, options = {}) {
        const modal = document.getElementById("universal-modal");
        const wasOpen = modal.classList.contains("open");
        const previous = snapshotCurrentModal();
        if (
          !options.fromHistory &&
          wasOpen &&
          previous &&
          (previous.type !== type || previous.id !== id)
        ) {
          modalHistory.push(previous);
        }

        currentModalData = {
          type,
          id,
          activeImg: options.restoreState?.activeImg || "splash",
          paintedSkinIndex:
            options.restoreState?.paintedSkinIndex == null
              ? null
              : options.restoreState.paintedSkinIndex,
        };

        document.querySelectorAll("#modal-toggles .toggle-btn").forEach((b) => {
          b.classList.remove("active");
          if (b.dataset.type === currentModalData.activeImg) b.classList.add("active");
        });
        const allBtn = document.querySelector('.toggle-btn[data-type="all"]');
        if (allBtn) allBtn.style.display = type === "skin" ? "none" : "inline-flex";
        document.getElementById("modal-single-view").style.display = "flex";
        document.getElementById("modal-gallery-view").classList.remove("active");

        let data;
        const modalContainer = document.querySelector("#universal-modal .modal-container");
        if (type === "hero") {
          data = getHeroById(id) || getUpcoming().find((x) => x.id === id && x.itemType === "hero");
          if (data) {
            renderHeroModalContent(data, document.getElementById("modal-content"));
            document.getElementById("modal-edit-btn").onclick = () => {
              const returnContext = createModalReturnContext();
              closeModal(false);
              renderHeroFormPage(id, data.itemType ? true : false, returnContext);
            };
            const bgUrl = data.nation ? getAttrBg("nations", data.nation) : "";
            if (modalContainer) {
              modalContainer.style.backgroundImage = bgUrl
                ? `linear-gradient(rgba(2,6,23,0.82), rgba(2,6,23,0.94)), url('${bgUrl}')`
                : "";
              modalContainer.style.backgroundSize = "cover";
              modalContainer.style.backgroundPosition = "center";
            }
          }
        } else {
          data = getSkinById(id) || getUpcoming().find((x) => x.id === id && x.itemType === "skin");
          if (data) {
            renderSkinModalContent(data, document.getElementById("modal-content"));
            document.getElementById("modal-edit-btn").onclick = () => {
              const returnContext = createModalReturnContext();
              closeModal(false);
              renderSkinForm(id, data.itemType ? true : false, returnContext);
            };
          }
          if (modalContainer) modalContainer.style.backgroundImage = "";
        }

        if (!data) return;
        document.getElementById("modal-title").textContent = data.name;
        if (currentModalData.activeImg === "all" && type === "hero") {
          renderGalleryView(data);
        } else {
          updateModalImage(data, currentModalData.activeImg);
        }
        modal.classList.add("open");
        updateModalBackButton();

        // Every modal opens at the top. Modal history remembers what was open,
        // not the previous scroll offset, so navigating back is predictable.
        const modalBody = modal.querySelector(".modal-body");
        if (modalBody) {
          modalBody.scrollTop = 0;
          requestAnimationFrame(() => { modalBody.scrollTop = 0; });
        }

        document.querySelectorAll("#modal-toggles .toggle-btn").forEach((btn) => {
          btn.onclick = () => {
            document.querySelectorAll("#modal-toggles .toggle-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentModalData.activeImg = btn.dataset.type;
            if (btn.dataset.type === "all") renderGalleryView(data);
            else {
              document.getElementById("modal-single-view").style.display = "flex";
              document.getElementById("modal-gallery-view").classList.remove("active");
              updateModalImage(data, btn.dataset.type);
            }
          };
        });
      }

      function closeModal(clearHistory = true) {
        document.getElementById("universal-modal").classList.remove("open");
        currentModalData = null;
        if (clearHistory) modalHistory = [];
        updateModalBackButton();
      }

      function updateModalImage(data, type) {
        const img = document.getElementById("modal-img");
        const wrapper = document.getElementById("modal-single-view");
        let src = "";
        if (currentModalData?.paintedSkinIndex != null && data.paintedSkins) {
          const p = data.paintedSkins[currentModalData.paintedSkinIndex];
          if (type === "portrait") src = p.portrait || data.portrait;
          else if (type === "icon") src = getPaintedSkinImage(p, data, "icon").src;
          else src = getPaintedSkinImage(p, data, "splash").src;
        } else {
          src = type === "portrait"
            ? data.portrait || data.imageUrl
            : type === "icon"
              ? data.icon || data.headIconUrl
              : data.splashArt || data.imageUrl;
        }

        const hero = getHeroById(data.heroId);
        let fallbackSrc = "";
        if (hero) {
          if (type === "portrait") fallbackSrc = hero.portrait || hero.imageUrl || "";
          else if (type === "icon") fallbackSrc = hero.icon || hero.headIconUrl || "";
          else fallbackSrc = hero.splashArt || hero.imageUrl || "";
        }
        wrapper.innerHTML = "";
        img.dataset.fallbackSrc = fallbackSrc || IMAGE_PLACEHOLDER;
        img.dataset.fallbackAttempted = "";
        img.src = src || fallbackSrc || IMAGE_PLACEHOLDER;
        img.style.filter = !src && fallbackSrc ? "grayscale(100%) opacity(0.5)" : "none";
        wrapper.appendChild(img);
      }

      function togglePaintedSkin(idx, el) {
        el.parentNode.querySelectorAll(".landscape-item").forEach((i) => i.classList.remove("active"));
        el.classList.add("active");
        currentModalData.paintedSkinIndex = idx;
        const s = getSkinById(currentModalData.id) || getUpcoming().find((x) => x.id === currentModalData.id && x.itemType === "skin");
        const active = document.querySelector("#modal-toggles .toggle-btn.active");
        updateModalImage(s, active ? active.dataset.type : "splash");
        const titleEl = document.getElementById("modal-title");
        if (titleEl && s) {
          const paintedName = idx != null && s.paintedSkins?.[idx] ? s.paintedSkins[idx].name : "";
          titleEl.textContent = paintedName || s.name;
        }
      }

      function renderGalleryView(d) {
        const g = document.getElementById("modal-gallery-view");
        document.getElementById("modal-single-view").style.display = "none";
        g.classList.add("active");
        g.innerHTML = "";
        const hero = getHeroById(d.heroId);
        const isHeroGallery = currentModalData?.type === "hero";
        const imgs = [
          { key: "splash", l: "Splash Art", s: d.splashArt || d.imageUrl, fallback: hero ? hero.splashArt || hero.imageUrl : "" },
          { key: "portrait", l: "Portrait", s: d.portrait, fallback: hero ? hero.portrait || hero.imageUrl : "" },
          { key: "icon", l: "Head Icon", s: d.icon || d.headIconUrl, fallback: hero ? hero.icon || hero.headIconUrl : "" },
        ].map((item) => ({
          ...item,
          src: item.s || item.fallback || IMAGE_PLACEHOLDER,
          fallbackSrc: item.fallback || IMAGE_PLACEHOLDER,
          fallbackOnly: !item.s && !!item.fallback,
        }));

        if (isHeroGallery) {
          const splash = imgs.find((item) => item.key === "splash");
          const portrait = imgs.find((item) => item.key === "portrait");
          const icon = imgs.find((item) => item.key === "icon");
          const mediaCard = (item, cls, iconName) => `
            <figure class="hero-gallery-media ${cls}">
              <div class="hero-gallery-media-frame">
                <img src="${item.src}" data-fallback-src="${item.fallbackSrc}" alt="${d.name} ${item.l}"${item.fallbackOnly ? ' style="filter:grayscale(100%) opacity(0.62)"' : ""}>
                <figcaption><span class="material-symbols-outlined">${iconName}</span>${item.l}</figcaption>
              </div>
            </figure>`;
          g.innerHTML = `
            <div class="hero-gallery-showcase">
              ${mediaCard(splash, "hero-gallery-splash", "wallpaper")}
              <div class="hero-gallery-side">
                ${mediaCard(portrait, "hero-gallery-portrait", "portrait")}
                ${mediaCard(icon, "hero-gallery-icon", "face")}
              </div>
            </div>`;
          return;
        }

        imgs.forEach((item) => {
          const filter = item.fallbackOnly ? ' style="filter:grayscale(100%) opacity(0.5)"' : "";
          g.innerHTML += `<div class="gallery-row"><h5>${item.l}</h5><img src="${item.src}" data-fallback-src="${item.fallbackSrc}" class="gallery-img"${filter}></div>`;
        });
      }
