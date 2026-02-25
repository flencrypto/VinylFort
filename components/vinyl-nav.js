class VinylNav extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const currentPath = window.location.pathname;
    const isActive = (href) => {
      const page = href.replace(/^.*\//, "");
      return currentPath.endsWith(page) || (page === "index.html" && (currentPath === "/" || currentPath.endsWith("/")));
    };
    const linkClass = (href) =>
      `nav-link${isActive(href) ? " active" : ""}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #334155;
        }
        .nav-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
        }
        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .nav-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nav-link:hover {
          color: #e2e8f0;
        }
        .nav-link.active {
          color: #e2e8f0;
          border-bottom: 2px solid #7c3aed;
          padding-bottom: 2px;
        }
        .nav-link.primary {
          color: #7c3aed;
        }
        .nav-link.primary:hover {
          color: #a78bfa;
        }
        .nav-link.deal {
          color: #ec4899;
        }
        .nav-link.deal:hover {
          color: #f472b6;
        }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
        }
        .mobile-menu-btn:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
          border-radius: 4px;
        }
        /* Mobile drawer */
        .mobile-drawer {
          display: none;
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.98);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #334155;
          z-index: 49;
          padding: 1rem;
          transform: translateY(-100%);
          opacity: 0;
          transition: transform 0.25s ease, opacity 0.25s ease;
        }
        .mobile-drawer.open {
          transform: translateY(0);
          opacity: 1;
        }
        .mobile-drawer .drawer-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 0.5rem;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .mobile-drawer .drawer-link:hover {
          background: rgba(255,255,255,0.05);
          color: #e2e8f0;
        }
        .mobile-drawer .drawer-link.active {
          background: rgba(124, 58, 237, 0.15);
          color: #e2e8f0;
          border-left: 3px solid #7c3aed;
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
          .mobile-menu-btn {
            display: block;
          }
          .mobile-drawer {
            display: block;
          }
        }
      </style>
      <nav>
        <div class="nav-container">
          <a href="index.html" class="logo">
            <div class="logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span class="logo-text">VinylVault Pro</span>
          </a>
          <div class="nav-links">
            <a href="index.html" class="${linkClass("index.html")}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              New Listing
            </a>
            <a href="deals.html" class="${linkClass("deals.html")} deal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Deals
            </a>
            <a href="collection.html" class="${linkClass("collection.html")} primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              Collection
            </a>
            <a href="settings.html" class="${linkClass("settings.html")}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          </div>
          <button class="mobile-menu-btn" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobileDrawer">
            <svg class="icon-menu" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <svg class="icon-close" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </nav>
      <div class="mobile-drawer" id="mobileDrawer" role="navigation" aria-label="Mobile navigation">
        <a href="index.html" class="drawer-link ${isActive("index.html") ? "active" : ""}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          New Listing
        </a>
        <a href="deals.html" class="drawer-link ${isActive("deals.html") ? "active" : ""}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Deals
        </a>
        <a href="collection.html" class="drawer-link ${isActive("collection.html") ? "active" : ""}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          Collection
        </a>
        <a href="settings.html" class="drawer-link ${isActive("settings.html") ? "active" : ""}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </a>
      </div>
    `;

    const btn = this.shadowRoot.querySelector(".mobile-menu-btn");
    const drawer = this.shadowRoot.querySelector(".mobile-drawer");
    const iconMenu = this.shadowRoot.querySelector(".icon-menu");
    const iconClose = this.shadowRoot.querySelector(".icon-close");

    const toggleMenu = (open) => {
      drawer.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      iconMenu.style.display = open ? "none" : "";
      iconClose.style.display = open ? "" : "none";
    };

    this._toggleMenu = toggleMenu;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(!drawer.classList.contains("open"));
    });

    // Remove any previous handler before adding a new one (reconnection safety)
    if (this._outsideClickHandler) {
      document.removeEventListener("click", this._outsideClickHandler);
    }

    this._outsideClickHandler = (e) => {
      const path = typeof e.composedPath === "function" ? e.composedPath() : null;
      const clickInside =
        (this.shadowRoot && this.shadowRoot.contains(e.target)) ||
        (path && path.includes(this)) ||
        this.contains(e.target);
      if (!clickInside) {
        toggleMenu(false);
      }
    };
    document.addEventListener("click", this._outsideClickHandler);
  }

  disconnectedCallback() {
    if (this._outsideClickHandler) {
      document.removeEventListener("click", this._outsideClickHandler);
    }
  }
}

customElements.define("vinyl-nav", VinylNav);
