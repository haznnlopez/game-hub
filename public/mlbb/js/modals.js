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

        document.getElementById("modal-single-view").style.display = "none";
        document.getElementById("modal-gallery-view").classList.add("active");

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
            const primaryNation = getHeroNations(data)[0] || "";
            const bgUrl = primaryNation ? getAttrBg("nations", primaryNation) : "";
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
        renderGalleryView(data);
        modal.classList.add("open");
        updateModalBackButton();

        // Every modal opens at the top. Modal history remembers what was open,
        // not the previous scroll offset, so navigating back is predictable.
        const modalBody = modal.querySelector(".modal-body");
        if (modalBody) {
          modalBody.scrollTop = 0;
          requestAnimationFrame(() => { modalBody.scrollTop = 0; });
        }

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
        const s = getSkinById(currentModalData.id) || getUpcoming().find((x) => x.id === currentModalData.id && x.itemType === "skin");
        if (!s) return;
        const same = currentModalData.paintedSkinIndex === idx;
        currentModalData.paintedSkinIndex = same ? null : idx;
        el.parentNode.querySelectorAll(".landscape-item").forEach((item) => item.classList.remove("active"));
        if (!same) el.classList.add("active");
        renderGalleryView(s);
        const titleEl = document.getElementById("modal-title");
        const paintedName = !same && s.paintedSkins?.[idx] ? s.paintedSkins[idx].name : "";
        if (titleEl) titleEl.textContent = paintedName || s.name;
      }

      function renderGalleryView(d) {
        const g = document.getElementById("modal-gallery-view");
        const single = document.getElementById("modal-single-view");
        if (single) single.style.display = "none";
        g.classList.add("active");
        const hero = getHeroById(d.heroId);
        const painted = currentModalData?.type === "skin" && currentModalData?.paintedSkinIndex != null
          ? d.paintedSkins?.[currentModalData.paintedSkinIndex] || null
          : null;
        const source = painted || d;
        const resolve = (key) => {
          const heroValue = key === "splash"
            ? hero?.splashArt || hero?.imageUrl || ""
            : key === "portrait"
              ? hero?.portrait || hero?.imageUrl || ""
              : hero?.icon || hero?.headIconUrl || "";
          const baseValue = key === "splash"
            ? d.splashArt || d.imageUrl || ""
            : key === "portrait"
              ? d.portrait || ""
              : d.icon || d.headIconUrl || "";
          const ownValue = key === "splash"
            ? source.splashArt || source.splash || source.imageUrl || ""
            : key === "portrait"
              ? source.portrait || ""
              : source.icon || source.headIconUrl || "";
          return {
            src: ownValue || (painted ? baseValue : "") || heroValue || IMAGE_PLACEHOLDER,
            fallbackSrc: (painted ? baseValue : "") || heroValue || IMAGE_PLACEHOLDER,
            fallbackOnly: !ownValue,
          };
        };
        const items = [
          { key: "splash", label: "Splash Art", icon: "wallpaper", ...resolve("splash") },
          { key: "portrait", label: "Portrait", icon: "portrait", ...resolve("portrait") },
          { key: "icon", label: "Head Icon", icon: "face", ...resolve("icon") },
        ];
        const card = (item, cls) => `<figure class="hero-gallery-media ${cls}">
          <div class="hero-gallery-media-frame">
            <img src="${item.src}" data-fallback-src="${item.fallbackSrc}" alt="${d.name} ${item.label}"${item.fallbackOnly ? ' style="filter:grayscale(100%) opacity(0.62)"' : ""}>
            <figcaption><span class="material-symbols-outlined">${item.icon}</span>${item.label}</figcaption>
          </div>
        </figure>`;
        g.innerHTML = `<div class="hero-gallery-showcase modal-all-images ${currentModalData?.type === "skin" ? "skin-gallery-showcase" : ""}">
          ${card(items[0], "hero-gallery-splash")}
          <div class="hero-gallery-side">
            ${card(items[1], "hero-gallery-portrait")}
            ${card(items[2], "hero-gallery-icon")}
          </div>
        </div>${painted ? `<div class="gallery-variant-note"><span class="material-symbols-outlined">palette</span>Showing painted variant: <strong>${painted.name || "Painted Skin"}</strong> · click it again below to return to the base skin.</div>` : ""}`;
      }
