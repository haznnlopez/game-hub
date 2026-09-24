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
        closeImageViewer();
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

      let imageViewerState = null;

      function resolveModalGalleryMedia(d) {
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
        return {
          painted,
          splash: { key: "splash", label: "Splash Art", icon: "wallpaper", ...resolve("splash") },
          portrait: { key: "portrait", label: "Portrait", icon: "portrait", ...resolve("portrait") },
          headIcon: { key: "icon", label: "Head Icon", icon: "face", ...resolve("icon") },
        };
      }

      function updateModalHeaderIcon(item, ownerName = "") {
        const icon = document.getElementById("modal-header-icon");
        if (!icon || !item) return;
        icon.classList.remove("image-fallback", "image-fallback-secondary");
        icon.dataset.fallbackSrc = item.fallbackSrc || IMAGE_PLACEHOLDER;
        icon.dataset.fallbackIndex = "0";
        icon.src = item.src || item.fallbackSrc || IMAGE_PLACEHOLDER;
        icon.alt = ownerName ? `${ownerName} head icon` : "Head icon";
        icon.setAttribute("aria-hidden", "false");
        icon.classList.toggle("fallback-only", Boolean(item.fallbackOnly));
      }

      function openGalleryImageViewerFromCard(card) {
        if (!card) return;
        const img = card.querySelector("img");
        let src = img?.currentSrc || img?.src || "";
        const fallback = card.dataset.imageFallback
          ? decodeURIComponent(card.dataset.imageFallback)
          : "";
        if (!src || src === IMAGE_PLACEHOLDER) {
          src = card.dataset.imageSrc ? decodeURIComponent(card.dataset.imageSrc) : fallback;
        }
        const label = card.dataset.imageLabel
          ? decodeURIComponent(card.dataset.imageLabel)
          : "Artwork";
        const owner = card.dataset.imageOwner
          ? decodeURIComponent(card.dataset.imageOwner)
          : document.getElementById("modal-title")?.textContent || "MLBB";
        openImageViewer(src || fallback || IMAGE_PLACEHOLDER, label, owner, fallback);
      }

      function openImageViewer(src, label = "Artwork", owner = "MLBB", fallbackSrc = "") {
        const overlay = document.getElementById("image-viewer-modal");
        const img = document.getElementById("image-viewer-img");
        const title = document.getElementById("image-viewer-title");
        const subtitle = document.getElementById("image-viewer-subtitle");
        if (!overlay || !img) return;

        const hdSrc = typeof cleanImageUrl === "function" ? cleanImageUrl(src) : src;
        const hdFallback = fallbackSrc && typeof cleanImageUrl === "function"
          ? cleanImageUrl(fallbackSrc)
          : fallbackSrc;
        img.classList.remove("image-fallback", "image-fallback-secondary");
        imageViewerState = {
          src: hdSrc || hdFallback || IMAGE_PLACEHOLDER,
          label,
          owner,
        };
        title.textContent = label || "Artwork";
        subtitle.textContent = owner || "";
        img.dataset.fallbackSrc = hdFallback || IMAGE_PLACEHOLDER;
        img.dataset.fallbackIndex = "0";
        img.src = imageViewerState.src;
        img.alt = `${owner || "MLBB"} ${label || "artwork"}`;
        img.onload = () => {
          if (imageViewerState) imageViewerState.src = img.currentSrc || img.src || imageViewerState.src;
        };
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        overlay.onclick = (event) => {
          if (event.target === overlay) closeImageViewer();
        };
        requestAnimationFrame(() => overlay.querySelector(".image-viewer-close")?.focus());
      }

      function closeImageViewer() {
        const overlay = document.getElementById("image-viewer-modal");
        const img = document.getElementById("image-viewer-img");
        if (!overlay) return;
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        if (img) {
          img.onload = null;
          img.removeAttribute("src");
          img.dataset.fallbackSrc = "";
          img.dataset.fallbackIndex = "0";
        }
        imageViewerState = null;
      }

      function imageViewerSuggestedName() {
        const safe = (value) => String(value || "image")
          .trim()
          .replace(/[^a-z0-9._-]+/gi, "-")
          .replace(/^-+|-+$/g, "") || "image";
        const src = imageViewerState?.src || "";
        let ext = "png";
        try {
          const pathname = new URL(src, window.location.href).pathname;
          const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
          if (match && /^(png|jpe?g|webp|gif|bmp|svg)$/i.test(match[1])) ext = match[1].toLowerCase().replace("jpeg", "jpg");
        } catch (_) {}
        return `${safe(imageViewerState?.owner)}-${safe(imageViewerState?.label)}.${ext}`;
      }

      async function downloadImageViewer() {
        const img = document.getElementById("image-viewer-img");
        const src = img?.currentSrc || img?.src || imageViewerState?.src || "";
        if (!src || src === IMAGE_PLACEHOLDER) {
          showToast("No downloadable artwork is available.", "info");
          return;
        }
        let suggestedName = imageViewerSuggestedName();
        try {
          const response = await fetch(src, { cache: "no-store" });
          if (!response.ok) throw new Error(`Image request failed (${response.status})`);
          const blob = await response.blob();
          const mimeExt = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/bmp": "bmp",
            "image/svg+xml": "svg",
          }[blob.type];
          if (mimeExt) suggestedName = suggestedName.replace(/\.[a-z0-9]+$/i, `.${mimeExt}`);

          if (window.showSaveFilePicker && window.isSecureContext) {
            try {
              const handle = await window.showSaveFilePicker({ suggestedName });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              showToast("Image saved", "success");
              return;
            } catch (err) {
              if (err?.name === "AbortError") return;
              throw err;
            }
          }

          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = suggestedName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          showToast("Download started", "success");
        } catch (err) {
          console.warn("Direct image download was blocked; opening the image instead.", err);
          const link = document.createElement("a");
          link.href = src;
          link.download = suggestedName;
          link.target = "_blank";
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          link.remove();
          showToast("Opened the original image so you can save it.", "info");
        }
      }

      function renderGalleryView(d) {
        const g = document.getElementById("modal-gallery-view");
        const single = document.getElementById("modal-single-view");
        if (single) single.style.display = "none";
        g.classList.add("active");

        const media = resolveModalGalleryMedia(d);
        updateModalHeaderIcon(media.headIcon, media.painted?.name || d.name);
        const items = [media.splash, media.portrait];
        const owner = media.painted?.name || d.name;
        const card = (item, cls) => `<button type="button" class="hero-gallery-media gallery-viewer-trigger ${cls}"
          data-image-src="${encodeURIComponent(item.src || "")}"
          data-image-fallback="${encodeURIComponent(item.fallbackSrc || "")}"
          data-image-label="${encodeURIComponent(item.label)}"
          data-image-owner="${encodeURIComponent(owner)}"
          onclick="openGalleryImageViewerFromCard(this)"
          aria-label="Open ${item.label} image viewer">
          <span class="hero-gallery-media-frame">
            <img src="${item.src}" data-fallback-src="${item.fallbackSrc}" alt="${owner} ${item.label}"${item.fallbackOnly ? ' style="filter:grayscale(100%) opacity(0.62)"' : ""}>
            <span class="hero-gallery-open-hint"><span class="material-symbols-outlined">open_in_full</span>Open</span>
            <span class="hero-gallery-caption"><span class="material-symbols-outlined">${item.icon}</span>${item.label}</span>
          </span>
        </button>`;

        g.innerHTML = `<div class="hero-gallery-showcase modal-all-images ${currentModalData?.type === "skin" ? "skin-gallery-showcase" : ""}">
          ${card(items[0], "hero-gallery-splash")}
          ${card(items[1], "hero-gallery-portrait")}
        </div>${media.painted ? `<div class="gallery-variant-note"><span class="material-symbols-outlined">palette</span>Showing painted variant: <strong>${media.painted.name || "Painted Skin"}</strong> · click it again below to return to the base skin.</div>` : ""}`;
      }


      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.getElementById("image-viewer-modal")?.classList.contains("open")) {
          event.preventDefault();
          event.stopPropagation();
          closeImageViewer();
        }
      }, true);
