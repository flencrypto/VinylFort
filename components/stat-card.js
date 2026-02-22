class StatCard extends HTMLElement {
  static get observedAttributes() {
    return ["icon", "label", "value", "trend"];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const icon = this.getAttribute("icon") || "activity";
    const label = this.getAttribute("label") || "Stat";
    const value = this.getAttribute("value") || "-";
    const trend = this.getAttribute("trend") || "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s ease;
        }
        .card:hover {
          border-color: #7c3aed;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed20 0%, #06b6d420 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7c3aed;
        }
        .trend {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          background: #22c55e20;
          color: #22c55e;
        }
        .trend.neutral {
          background: #64748b20;
          color: #94a3b8;
        }
        .label {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-bottom: 0.25rem;
        }
        .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1f5f9;
        }
      </style>
      <div class="card">
        <div class="header">
          <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${this.getIconPath(icon)}
            </svg>
          </div>
          <span class="trend ${trend.includes("+") ? "" : "neutral"}">${trend}</span>
        </div>
        <p class="label">${label}</p>
        <p class="value">${value}</p>
      </div>
    `;
  }

  getIconPath(name) {
    const icons = {
      "check-circle":
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      "trending-up":
        '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      clock:
        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      "dollar-sign":
        '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    };
    return icons[name] || icons["activity"];
  }
}

customElements.define("stat-card", StatCard);
