      /* MODAL */
      function openModal(type, id) {
        currentModalData = { type, id, activeImg: "splash" };
        const modal = document.getElementById("universal-modal");
        document.querySelectorAll("#modal-toggles .toggle-btn").forEach((b) => {
          b.classList.remove("active");
          if (b.dataset.type === "splash") b.classList.add("active");
        });
        const allBtn = document.querySelector('.toggle-btn[data-type="all"]');
        if (allBtn)
          allBtn.style.display = type === "skin" ? "none" : "inline-flex"; // Flex needed for centering
        document.getElementById("modal-single-view").style.display = "flex";
        document
          .getElementById("modal-gallery-view")
          .classList.remove("active");

        let data;
        const modalContainer = document.querySelector(
          "#universal-modal .modal-container",
        );
        if (type === "hero") {
          data = getHeroById(id);
          if (!data) {
            data = getUpcoming().find(
              (x) => x.id === id && x.itemType === "hero",
            );
          }
          if (data) {
            renderHeroModalContent(
              data,
              document.getElementById("modal-content"),
            );
            document.getElementById("modal-edit-btn").onclick = () => {
              closeModal();
              renderHeroFormPage(id, data.itemType ? true : false);
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
          data = getSkinById(id);
          if (!data) {
            data = getUpcoming().find(
              (x) => x.id === id && x.itemType === "skin",
            );
          }
          if (data) {
            renderSkinModalContent(
              data,
              document.getElementById("modal-content"),
            );
            document.getElementById("modal-edit-btn").onclick = () => {
              closeModal();
              renderSkinForm(id, data.itemType ? true : false);
            };
          }
          if (modalContainer) modalContainer.style.backgroundImage = "";
        }

        if (!data) return;
        document.getElementById("modal-title").textContent = data.name;
        updateModalImage(data, "splash");
        modal.classList.add("open");

        document
          .querySelectorAll("#modal-toggles .toggle-btn")
          .forEach((btn) => {
            btn.onclick = () => {
              document
                .querySelectorAll("#modal-toggles .toggle-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              if (btn.dataset.type === "all") {
                renderGalleryView(data);
              } else {
                document.getElementById("modal-single-view").style.display =
                  "flex";
                document
                  .getElementById("modal-gallery-view")
                  .classList.remove("active");
                updateModalImage(data, btn.dataset.type);
              }
            };
          });
      }
      function closeModal() {
        document.getElementById("universal-modal").classList.remove("open");
        currentModalData = null;
      }

      function updateModalImage(data, type) {
        const img = document.getElementById("modal-img");
        const wrapper = document.getElementById("modal-single-view");
        let src = "";
        if (currentModalData.paintedSkinIndex != null && data.paintedSkins) {
          const p = data.paintedSkins[currentModalData.paintedSkinIndex];
          if (type === "portrait") {
            src = p.portrait || data.portrait;
          } else if (type === "icon") {
            const iconRes = getPaintedSkinImage(p, data, "icon");
            src = iconRes.src;
          } else {
            const splashRes = getPaintedSkinImage(p, data, "splash");
            src = splashRes.src;
          }
        } else {
          src =
            type === "portrait"
              ? data.portrait || data.imageUrl
              : type === "icon"
                ? data.icon || data.headIconUrl
                : data.splashArt || data.imageUrl;
        }
        let typeLabel =
          type === "portrait"
            ? "Model"
            : type === "icon"
              ? "Icon"
              : "Splash Art";
        if (!src) {
          const hero = getHeroById(data.heroId);
          let fallbackSrc = "";
          if (hero) {
            if (type === "portrait")
              fallbackSrc = hero.portrait || hero.imageUrl;
            else if (type === "icon")
              fallbackSrc = hero.icon || hero.headIconUrl;
            else fallbackSrc = hero.splashArt || hero.imageUrl;
          }
          if (fallbackSrc) {
            wrapper.innerHTML = "";
            img.src = fallbackSrc;
            img.style.filter = "grayscale(100%) opacity(0.5)";
            wrapper.appendChild(img);
          } else {
            wrapper.innerHTML = `<div style="width: 100%; height: 400px; background-color: var(--bg-light); display: flex; align-items: center; justify-content: center; border-radius: 0.5rem;"><span style="color: var(--text-med); font-weight: 500; font-size: 1.2rem;">${typeLabel} unavailable</span></div>`;
          }
        } else {
          wrapper.innerHTML = "";
          img.src = src;
          img.style.filter = "none";
          wrapper.appendChild(img);
        }
      }
      function togglePaintedSkin(idx, el) {
        el.parentNode
          .querySelectorAll(".landscape-item")
          .forEach((i) => i.classList.remove("active"));
        el.classList.add("active");
        currentModalData.paintedSkinIndex = idx;
        const s =
          getSkinById(currentModalData.id) ||
          getUpcoming().find(
            (x) => x.id === currentModalData.id && x.itemType === "skin",
          );
        const active = document.querySelector(
          "#modal-toggles .toggle-btn.active",
        );
        updateModalImage(s, active ? active.dataset.type : "splash");
        // Reflect the chosen painted skin's name in the modal header so it's
        // clear which variant is currently selected.
        const titleEl = document.getElementById("modal-title");
        if (titleEl && s) {
          const paintedName =
            idx != null && s.paintedSkins && s.paintedSkins[idx]
              ? s.paintedSkins[idx].name
              : "";
          titleEl.textContent = paintedName || s.name;
        }
      }

      function renderGalleryView(d) {
        const g = document.getElementById("modal-gallery-view");
        document.getElementById("modal-single-view").style.display = "none";
        g.classList.add("active");
        g.innerHTML = "";
        const hero = getHeroById(d.heroId);
        const imgs = [
          {
            l: "Splash",
            s: d.splashArt || d.imageUrl,
            fallback: hero ? hero.splashArt || hero.imageUrl : null,
          },
          {
            l: "Portrait",
            s: d.portrait,
            fallback: hero ? hero.portrait || hero.imageUrl : null,
          },
          {
            l: "Icon",
            s: d.icon || d.headIconUrl,
            fallback: hero ? hero.icon || hero.headIconUrl : null,
          },
        ];
        imgs.forEach((i) => {
          if (i.s) {
            g.innerHTML += `<div class="gallery-row"><h5>${i.l}</h5><img src="${i.s}" class="gallery-img"></div>`;
          } else if (i.fallback) {
            g.innerHTML += `<div class="gallery-row"><h5>${i.l}</h5><img src="${i.fallback}" class="gallery-img" style="filter: grayscale(100%) opacity(0.5);"></div>`;
          } else {
            g.innerHTML += `<div class="gallery-row"><h5>${i.l}</h5><div style="width: 100%; height: 200px; background-color: var(--bg-light); display: flex; align-items: center; justify-content: center; border-radius: 0.5rem;"><span style="color: var(--text-med); font-weight: 500;">${i.l} unavailable</span></div></div>`;
          }
        });
      }
