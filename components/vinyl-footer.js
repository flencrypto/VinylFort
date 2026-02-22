class VinylFooter extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        footer {
          background: #0f172a;
          border-top: 1px solid #334155;
          padding: 3rem 1rem 2rem;
        }
        .footer-container {
          max-width: 1280px;
          margin: 0 auto;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .footer-section h4 {
          color: #e2e8f0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 1rem;
        }
        .footer-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-section li {
          margin-bottom: 0.5rem;
        }
        .footer-section a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s ease;
        }
        .footer-section a:hover {
          color: #7c3aed;
        }
        .footer-bottom {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 2rem;
          border-top: 1px solid #334155;
          text-align: center;
        }
        @media (min-width: 640px) {
          .footer-bottom {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .copyright {
          color: #64748b;
          font-size: 0.875rem;
        }
        .disclaimer {
          color: #475569;
          font-size: 0.75rem;
          max-width: 600px;
        }
        .social-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .social-links a {
          color: #94a3b8;
          transition: color 0.2s ease;
        }
        .social-links a:hover {
          color: #7c3aed;
        }
        .disabled-link {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
<footer>
        <div class="footer-container">
          <div class="footer-grid">
            <div class="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="index.html">New Listing</a></li>
                <li><a href="deals.html">Deal Finder</a></li>
                <li><a href="collection.html">My Collection</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Bulk Upload</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Price Tracker</a></li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Grading Guide</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Shipping Best Practices</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">eBay Policy Updates</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Discogs Integration</a></li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Help Center</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Contact Us</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Feature Request</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Report Bug</a></li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Privacy Policy</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Terms of Service</a></li>
                <li><a href="#" class="disabled-link" data-coming-soon="true">Cookie Policy</a></li>
              </ul>
            </div>
</div>
          <div class="footer-bottom">
            <p class="copyright">© 2024 VinylVault Pro. Built for record sellers.</p>
            <div class="social-links">
              <a href="#" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
              </a>
              <a href="#" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              </a>
            </div>
            <p class="disclaimer">Not affiliated with eBay Inc. or Discogs. Fee estimates are approximate—verify with current eBay policies.</p>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define("vinyl-footer", VinylFooter);
