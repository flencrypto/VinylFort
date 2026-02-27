class AIChat extends HTMLElement {
  constructor() {
    super();
    this.messages = [];
    this.corrections = {};
    this.learningData = JSON.parse(
      localStorage.getItem("ai_learning_data") || "{}",
    );
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .chat-container {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 400px;
        }
        .chat-header {
          background: linear-gradient(135deg, #7c3aed20 0%, #06b6d420 100%);
          padding: 12px 16px;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .chat-header i {
          color: #7c3aed;
        }
        .chat-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .status-badge {
          margin-left: auto;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 9999px;
          background: #22c55e20;
          color: #22c55e;
        }
        .status-badge.thinking {
          background: #f59e0b20;
          color: #f59e0b;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message {
          max-width: 85%;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          position: relative;
        }
        .message.ai {
          align-self: flex-start;
          background: #0f172a;
          border: 1px solid #334155;
          color: #e2e8f0;
        }
        .message.user {
          align-self: flex-end;
          background: #7c3aed;
          color: white;
        }
        .message.correction {
          border-color: #f59e0b;
          background: #f59e0b10;
        }
        .message-meta {
          font-size: 10px;
          opacity: 0.6;
          margin-top: 6px;
        }
        .correction-form {
          margin-top: 10px;
          padding: 10px;
          background: #0f172a;
          border-radius: 8px;
          border: 1px dashed #475569;
        }
        .correction-form label {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .correction-input {
          width: 100%;
          padding: 8px 10px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .correction-input:focus {
          outline: none;
          border-color: #f59e0b;
        }
        .correction-actions {
          display: flex;
          gap: 8px;
        }
        .btn-small {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-confirm {
          background: #22c55e;
          color: white;
        }
        .btn-confirm:hover {
          background: #16a34a;
        }
        .btn-correct {
          background: #f59e0b;
          color: #0f172a;
        }
        .btn-correct:hover {
          background: #d97706;
        }
        .field-correction {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: #f59e0b15;
          border-radius: 6px;
          margin-top: 8px;
          font-size: 11px;
        }
        .field-correction .field-name {
          color: #f59e0b;
          font-weight: 500;
        }
        .field-correction .arrow {
          color: #64748b;
        }
        .field-correction .corrected {
          color: #22c55e;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .input-area {
          padding: 12px 16px;
          border-top: 1px solid #334155;
          background: #0f172a;
        }
        .input-row {
          display: flex;
          gap: 10px;
        }
        .chat-input {
          flex: 1;
          padding: 10px 14px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
        }
        .chat-input:focus {
          outline: none;
          border-color: #7c3aed;
        }
        .send-btn {
          padding: 10px 16px;
          background: #7c3aed;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .send-btn:hover {
          background: #6d28d9;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .quick-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .quick-btn {
          padding: 6px 12px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 16px;
          color: #94a3b8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-btn:hover {
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .detected-fields {
          margin-top: 12px;
          padding: 12px;
          background: #0f172a;
          border-radius: 8px;
          border: 1px solid #334155;
        }
        .detected-fields h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .field-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .field-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
        }
        .field-value {
          font-size: 12px;
          color: #e2e8f0;
          font-weight: 500;
        }
        .field-value.corrected {
          color: #22c55e;
        }
        .field-value.wrong {
          color: #ef4444;
          text-decoration: line-through;
        }
        .confidence-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: 6px;
        }
        .confidence-high {
          background: #22c55e20;
          color: #22c55e;
        }
        .confidence-medium {
          background: #f59e0b20;
          color: #f59e0b;
        }
        .confidence-low {
          background: #ef444420;
          color: #ef4444;
        }
        .learned-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 10px;
          background: #06b6d420;
          color: #06b6d4;
          margin-top: 8px;
        }
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 12px 14px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #7c3aed;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      </style>
      
      <div class="chat-container">
        <div class="chat-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <h3>AI Assistant</h3>
          <span class="status-badge" id="statusBadge">Ready</span>
          <button id="clearChatBtn" title="Clear chat" style="margin-left:8px;background:transparent;border:1px solid #475569;border-radius:6px;padding:3px 8px;color:#64748b;font-size:11px;cursor:pointer;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#64748b'">
            Clear
          </button>
        </div>
        
        <div class="messages-area" id="messagesArea">
          <div class="message ai">
            👋 <strong>Hello!</strong> I'm your vinyl record AI assistant.<br><br>
            📸 <strong>Upload photos</strong> of your record and I'll identify the artist, title, label, year, catalogue number, matrix, and more.<br><br>
            ✏️ If anything looks wrong, use the quick buttons below or type a correction like <em>"the artist is Black Sabbath"</em>.<br><br>
            🔗 You can also <strong>paste a Discogs URL</strong> to fetch exact release details.
          </div>
        </div>
        
        <div class="input-area">
          <div class="input-row">
            <input type="text" class="chat-input" id="chatInput" placeholder="Type a correction or question..." />
            <button class="send-btn" id="sendBtn" title="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="quick-actions" id="quickActions">
            <button class="quick-btn" data-action="confirm-all">✓ All Correct</button>
            <button class="quick-btn" data-action="wrong-artist">Wrong Artist</button>
            <button class="quick-btn" data-action="wrong-title">Wrong Title</button>
            <button class="quick-btn" data-action="wrong-year">Wrong Year</button>
            <button class="quick-btn" data-action="wrong-cat">Wrong Catalogue</button>
            <button class="quick-btn" data-action="wrong-matrix">Wrong Matrix No</button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const input = this.shadowRoot.getElementById("chatInput");
    const sendBtn = this.shadowRoot.getElementById("sendBtn");
    const quickActions = this.shadowRoot.getElementById("quickActions");
    const clearBtn = this.shadowRoot.getElementById("clearChatBtn");

    sendBtn.addEventListener("click", () => this.handleSend());
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSend();
    });

    quickActions.addEventListener("click", (e) => {
      if (e.target.classList.contains("quick-btn")) {
        this.handleQuickAction(e.target.dataset.action);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearChat());
    }
  }

  clearChat() {
    this.clear();
  }

  handleSend() {
    const input = this.shadowRoot.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    this.addMessage(message, "user");
    input.value = "";

    // Process the message
    this.processUserMessage(message);
  }

  handleQuickAction(action) {
    switch (action) {
      case "confirm-all":
        this.confirmAllFields();
        break;
      case "wrong-artist":
        this.requestCorrection("artist");
        break;
      case "wrong-title":
        this.requestCorrection("title");
        break;
      case "wrong-year":
        this.requestCorrection("year");
        break;
      case "wrong-cat":
        this.requestCorrection("catalogueNumber");
        break;
      case "wrong-matrix":
        this.requestMatrixCorrection();
        break;
    }
  }

  addMessage(text, sender, options = {}) {
    const messagesArea = this.shadowRoot.getElementById("messagesArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender} ${options.isCorrection ? "correction" : ""}`;

    let content = text;
    if (options.field && options.originalValue !== undefined) {
      content += `
        <div class="field-correction">
          <span class="field-name">${options.field}:</span>
          <span class="corrected">${options.originalValue}</span>
          <span class="arrow">→</span>
          <span>${options.newValue}</span>
        </div>
      `;
    }

    messageDiv.innerHTML = content;
    if (options.meta) {
      messageDiv.innerHTML += `<div class="message-meta">${options.meta}</div>`;
    }

    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    this.messages.push({ sender, text, ...options });
  }

  showTyping() {
    const messagesArea = this.shadowRoot.getElementById("messagesArea");
    const typingDiv = document.createElement("div");
    typingDiv.className = "message ai typing-indicator";
    typingDiv.id = "typingIndicator";
    typingDiv.innerHTML = "<span></span><span></span><span></span>";
    messagesArea.appendChild(typingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    this.setStatus("thinking");
  }

  hideTyping() {
    const typing = this.shadowRoot.getElementById("typingIndicator");
    if (typing) typing.remove();
    this.setStatus("ready");
  }

  setStatus(status) {
    const badge = this.shadowRoot.getElementById("statusBadge");
    badge.className = `status-badge ${status === "thinking" ? "thinking" : ""}`;
    badge.textContent = status === "thinking" ? "Analyzing..." : "Ready";
  }

  // Called when OCR results come in
  showDetectionResults(data) {
    this.currentDetection = data;
    this.corrections = {};

    const messagesArea = this.shadowRoot.getElementById("messagesArea");

    // Build detected fields display
    const fieldsHtml = `
      <div class="detected-fields">
        <h4>Detected Information 
          <span class="confidence-indicator confidence-${data.confidence || "medium"}">
            ${data.confidence || "medium"} confidence
          </span>
        </h4>
        <div class="field-grid">
          ${this.renderField("Artist", data.artist)}
          ${this.renderField("Title", data.title)}
          ${this.renderField("Year", data.year)}
          ${this.renderField("Catalogue #", data.catalogueNumber)}
          ${this.renderField("Label", data.label)}
          ${this.renderField("Country", data.country)}
          ${this.renderField("Format", data.format)}
          ${this.renderField("Genre", data.genre)}
        </div>
        ${
          this.hasLearnedCorrections()
            ? `
          <div class="learned-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Applied ${Object.keys(this.getRelevantLearnings(data)).length} learned corrections
          </div>
        `
            : ""
        }
      </div>
    `;

    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai";
    messageDiv.innerHTML = `
      I've analyzed your photos! Here's what I found:
      ${fieldsHtml}
      <p style="margin-top: 12px; font-size: 12px; color: #94a3b8;">
        Please review these details. If anything looks wrong, click "Wrong [Field]" or type a correction like "The artist is actually..."
      </p>
    `;

    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // Apply any learned corrections automatically
    this.applyLearnedCorrections(data);
  }

  renderField(label, value) {
    const corrected = this.corrections[label.toLowerCase()];
    const displayValue = corrected || value || "-";
    const isCorrected = !!corrected;

    return `
      <div class="field-item">
        <span class="field-label">${label}</span>
        <span class="field-value ${isCorrected ? "corrected" : ""} ${value === null ? "wrong" : ""}">
          ${displayValue}
        </span>
      </div>
    `;
  }

  requestCorrection(field) {
    const currentValue =
      this.corrections[field] || this.currentDetection?.[field] || "";

    this.addMessage(`What's the correct ${field}?`, "ai", {
      meta: "Type the correct value below",
    });

    // Store that we're waiting for this correction
    this.pendingCorrection = field;

    // Focus input
    this.shadowRoot.getElementById("chatInput").focus();
  }

  requestMatrixCorrection() {
    this.addMessage(
      "What's the correct matrix / runout number? You can enter side A, side B, or both (e.g. \"A: ILPS 9048 A-2  B: ILPS 9048 B-2\").",
      "ai",
      { meta: "Type the matrix / runout value below" },
    );
    this.pendingCorrection = "matrix";
    this.shadowRoot.getElementById("chatInput").focus();
  }

  extractDiscogsReleaseUrl(message) {
    if (!message) return null;
    // Match both short form (discogs.com/release/ID) and full form
    // (discogs.com/Artist-Title/release/ID) used by the Discogs website.
    const match = message.match(
      /https?:\/\/(?:www\.)?discogs\.com(?:\/[^\/\s]+)?\/release\/\d+[^\s]*/i,
    );
    return match ? match[0] : null;
  }

  isDiscogsCorrectionMessage(message) {
    const normalized = (message || "").toLowerCase();

    // Explicit correction-intent phrases (word "discogs" may appear only in URL).
    const patterns = [
      /\bthis is the correct\b/,
      /\buse this\b/,
      /\bcorrect discogs release\b/,
      /\bdiscogs\b.*\bcorrect release\b/,
      /\bhere'?s the correct\b/,
      /\bthe correct release\b/,
      /\bthis is it\b/,
      /\bfound it\b/,
    ];

    if (patterns.some((pattern) => pattern.test(normalized))) {
      return true;
    }

    // Treat a message that is primarily a Discogs URL as a correction intent
    // (e.g. user pastes just the URL, or "here: <url>").
    // Limit to at most one non-URL word to avoid false positives on questions
    // such as "What's this? <url>".
    const withoutUrl = normalized.replace(/https?:\/\/\S+/gi, "").trim();
    const words = withoutUrl.split(/\s+/).filter((w) => w.length > 0);
    return words.length <= 1;
  }

  processUserMessage(message) {
    // Check if this is a correction response
    if (this.pendingCorrection) {
      const field = this.pendingCorrection;
      this.pendingCorrection = null;

      // Matrix corrections are dispatched as a matrix-search event.
      // Parse optional side prefixes: "A: <val>  B: <val>", "A: <val>", "B: <val>".
      if (field === "matrix") {
        const sideAMatch = message.match(/\bA\s*:\s*(.+?)(?=\s+B\s*:|\s*$)/i);
        const sideBMatch = message.match(/\bB\s*:\s*(.+)$/i);

        if (sideAMatch && sideBMatch) {
          const sideA = sideAMatch[1].trim();
          const sideB = sideBMatch[1].trim();
          this.addMessage(
            `Got it! Searching Discogs for matrix side A "${this.escapeHtml(sideA)}" and side B "${this.escapeHtml(sideB)}" and updating the fields…`,
            "ai",
          );
          this.dispatchEvent(new CustomEvent("matrix-search", { detail: { value: sideA, side: "a" }, bubbles: true, composed: true }));
          this.dispatchEvent(new CustomEvent("matrix-search", { detail: { value: sideB, side: "b" }, bubbles: true, composed: true }));
        } else if (sideAMatch) {
          const sideA = sideAMatch[1].trim();
          this.addMessage(
            `Got it! Searching Discogs for matrix side A "${this.escapeHtml(sideA)}" and updating the fields…`,
            "ai",
          );
          this.dispatchEvent(new CustomEvent("matrix-search", { detail: { value: sideA, side: "a" }, bubbles: true, composed: true }));
        } else if (sideBMatch) {
          const sideB = sideBMatch[1].trim();
          this.addMessage(
            `Got it! Searching Discogs for matrix side B "${this.escapeHtml(sideB)}" and updating the fields…`,
            "ai",
          );
          this.dispatchEvent(new CustomEvent("matrix-search", { detail: { value: sideB, side: "b" }, bubbles: true, composed: true }));
        } else {
          this.addMessage(
            `Got it! Searching Discogs for matrix number "${this.escapeHtml(message.trim())}" and updating the fields…`,
            "ai",
          );
          this.dispatchEvent(new CustomEvent("matrix-search", { detail: { value: message.trim(), side: null }, bubbles: true, composed: true }));
        }
        return;
      }

      this.applyCorrection(field, message);
      return;
    }

    const discogsUrl = this.extractDiscogsReleaseUrl(message);
    if (discogsUrl && this.isDiscogsCorrectionMessage(message)) {
      this.addMessage(
        "Got it — I'll verify this Discogs release against the detected info and uploaded photos, including tracklist, notes, and barcode/matrix identifiers.",
        "ai",
        { meta: "Applying Discogs correction" },
      );

      this.dispatchEvent(
        new CustomEvent("discogs-release-correction", {
          detail: {
            url: discogsUrl,
            currentDetection: this.getCorrectedData(),
          },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    // "this is a 1973 repress/reppress" – extract year.
    // p{1,2} intentionally accepts the common typo "reppress" as well as "repress".
    const repressMatch = message.match(
      /(?:this\s+is\s+(?:a\s+)?|it'?s\s+(?:a\s+)?)?(19[0-9]{2}|20[0-2][0-9])\s+re-?p{1,2}ress(?:ing)?/i,
    );
    if (repressMatch) {
      this.applyCorrection("year", repressMatch[1]);
      return;
    }

    // Check for natural language corrections
    const correctionPatterns = [
      {
        regex: /(?:the\s+)?artist\s+(?:is|should be|was)\s+(.+)/i,
        field: "artist",
      },
      {
        regex: /(?:the\s+)?title\s+(?:is|should be|was)\s+(.+)/i,
        field: "title",
      },
      {
        regex: /(?:the\s+)?year\s+(?:is|should be|was)\s+(\d{4})/i,
        field: "year",
      },
      {
        regex:
          /(?:the\s+)?catalog(?:ue)?\s*(?:#|number)?\s+(?:is|should be|was)\s+(.+)/i,
        field: "catalogueNumber",
      },
      {
        regex: /(?:the\s+)?label\s+(?:is|should be|was)\s+(.+)/i,
        field: "label",
      },
      { regex: /wrong\s+artist/i, field: "artist", needsValue: true },
      { regex: /wrong\s+title/i, field: "title", needsValue: true },
      { regex: /wrong\s+year/i, field: "year", needsValue: true },
      { regex: /wrong\s+(?:catalogue|catalog|cat(?:\s*no?)?)/i, field: "catalogueNumber", needsValue: true },
      { regex: /wrong\s+matrix/i, field: "matrix", needsValue: true },
    ];

    for (const pattern of correctionPatterns) {
      const match = message.match(pattern.regex);
      if (match) {
        if (pattern.needsValue) {
          if (pattern.field === "matrix") {
            this.requestMatrixCorrection();
          } else {
            this.requestCorrection(pattern.field);
          }
        } else {
          this.applyCorrection(pattern.field, match[1].trim());
        }
        return;
      }
    }

    // Check for matrix number input
    const matrixPatterns = [
      {
        regex: /(?:the\s+)?matrix(?:\s+(?:number|code|is))?\s*(?:is|:)\s*(.+)/i,
        side: null,
      },
      {
        regex:
          /(?:the\s+)?matrix\s+(?:side\s+)?a\s*(?:is|:)\s*(.+)/i,
        side: "a",
      },
      {
        regex:
          /(?:the\s+)?matrix\s+(?:side\s+)?b\s*(?:is|:)\s*(.+)/i,
        side: "b",
      },
      {
        regex:
          /(?:runout|deadwax)\s+(?:a|side\s*a)\s*(?:is|:)\s*(.+)/i,
        side: "a",
      },
      {
        regex:
          /(?:runout|deadwax)\s*(?:b|side\s*b)\s*(?:is|:)\s*(.+)/i,
        side: "b",
      },
    ];

    for (const mp of matrixPatterns) {
      const match = message.match(mp.regex);
      if (match) {
        const matrixValue = match[1].trim();
        this.addMessage(
          `Got it! Searching Discogs for matrix number "${matrixValue}" and updating the fields…`,
          "ai",
        );
        this.dispatchEvent(
          new CustomEvent("matrix-search", {
            detail: { value: matrixValue, side: mp.side },
            bubbles: true,
            composed: true,
          }),
        );
        return;
      }
    }

    // Try to parse a full record description (e.g. "Black Sabbath - Paranoid Vinyl LP 1973 6360 011 Excellent Condition")
    const parsed = this.parseRecordDescription(message);
    if (Object.keys(parsed).length >= 2) {
      this.applyMultipleCorrections(parsed);
      return;
    }

    // Single standalone year (e.g. "1971" or "it came out in 1971").
    // Limit to short messages (≤ 6 words) so that a full description with a year
    // goes through parseRecordDescription instead of being treated as a year-only input.
    const yearOnlyMatch = message.match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
    if (yearOnlyMatch && message.trim().split(/\s+/).length <= 6) {
      this.applyCorrection("year", yearOnlyMatch[1]);
      return;
    }

    // Generic fallback – let the user know what we can do
    this.showTyping();
    setTimeout(() => {
      this.hideTyping();
      this.addMessage(
        "I'm not sure how to interpret that. You can:<br>" +
        "• Use the <strong>Wrong [Field]</strong> buttons to correct a specific field<br>" +
        "• Type a full description like <em>\"Artist – Title LP Year CatNo Condition\"</em><br>" +
        "• Say something like <em>\"the year is 1973\"</em> or <em>\"the artist is Black Sabbath\"</em><br>" +
        "• Paste a Discogs release URL to fetch the correct details<br>" +
        "Or click <strong>✓ All Correct</strong> if everything looks good!",
        "ai",
      );
    }, 800);
  }

  /**
   * Parse a free-form record description into individual field corrections.
   * Handles formats like:
   *   "Black Sabbath - Paranoid Vinyl LP 1973 6360 011 Excellent Condition"
   */
  parseRecordDescription(message) {
    const extracted = {};
    let remaining = message.trim();

    // Condition keywords (checked early so they don't pollute catNo parsing)
    const conditionRegex =
      /\b(Mint|Near\s+Mint|NM|Excellent|Very\s+Good\s+Plus|Very\s+Good|Good\s+Plus|Good|Fair|Poor|VG\+|VG|G\+|G|M-?)(?:\s+Condition)?\b/i;
    const conditionMatch = remaining.match(conditionRegex);
    if (conditionMatch) {
      extracted.condition = conditionMatch[0].replace(/\s*condition\s*/i, "").trim();
      remaining = remaining.replace(conditionMatch[0], " ").replace(/\s{2,}/g, " ").trim();
    }

    // Format keywords
    const formatRegex =
      /\b((?:Vinyl\s+)?(?:Double\s+LP|LP|EP|Single|12"|10"|7"|Album))\b/i;
    const formatMatch = remaining.match(formatRegex);
    if (formatMatch) {
      extracted.format = formatMatch[1].trim();
      remaining = remaining.replace(formatMatch[0], " ").replace(/\s{2,}/g, " ").trim();
    }

    // Year
    const yearMatch = remaining.match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
    if (yearMatch) {
      extracted.year = yearMatch[1];
      remaining = remaining.replace(yearMatch[0], " ").replace(/\s{2,}/g, " ").trim();
    }

    // "Artist – Title" split (dash variants, mandatory for a full-description parse)
    const dashMatch = remaining.match(/^(.+?)\s*[-–—]\s*(.+)/);
    if (dashMatch) {
      extracted.artist = dashMatch[1].trim();
      const afterTitle = dashMatch[2].trim();

      // Try to extract a catalogue number from the end of afterTitle.
      // We try progressively more general patterns so that the most specific wins.
      let titlePart = afterTitle;
      let catPart = null;

      // Evaluate catalogue-number patterns in priority order (short-circuit so we
      // only run as many regexes as needed).
      // Pattern 1 – two numeric groups: "6360 011", "RS 1 3321"
      const twoNumMatch = afterTitle.match(/^(.*?)\s+(\d{3,}\s+\d{2,})\s*$/);
      // Pattern 2 – label-prefix + digits: "SD 7208", "ILPS 9048"
      const labelNumMatch = !twoNumMatch && afterTitle.match(/^(.*?)\s+([A-Z]{1,6}[-\s]\d[\w]*)\s*$/);
      // Pattern 3 – standalone 4+ digit number at end: "90125"
      const bareNumMatch = !(twoNumMatch || labelNumMatch) && afterTitle.match(/^(.*?)\s+(\d{4,})\s*$/);

      if (twoNumMatch && twoNumMatch[1].trim().length > 0) {
        titlePart = twoNumMatch[1].trim();
        catPart = twoNumMatch[2].trim();
      } else if (labelNumMatch && labelNumMatch[1].trim().length > 0) {
        titlePart = labelNumMatch[1].trim();
        catPart = labelNumMatch[2].trim();
      } else if (bareNumMatch && bareNumMatch[1].trim().length > 0) {
        titlePart = bareNumMatch[1].trim();
        catPart = bareNumMatch[2].trim();
      }

      extracted.title = titlePart;
      if (catPart) extracted.catalogueNumber = catPart;
    }

    // Remove empty / falsy values
    for (const key of Object.keys(extracted)) {
      if (!extracted[key]) delete extracted[key];
    }

    return extracted;
  }

  /** Escape a string for safe insertion into innerHTML. */
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Apply several field corrections at once and show a single summary message.
   */
  applyMultipleCorrections(corrections) {
    const applied = [];

    for (const [field, value] of Object.entries(corrections)) {
      if (!value) continue;
      const originalValue = this.currentDetection?.[field];
      this.corrections[field] = value;
      this.learnFromCorrection(field, originalValue, value);
      applied.push({ field, originalValue, newValue: value });

      this.dispatchEvent(
        new CustomEvent("field-corrected", {
          detail: { field, value, originalValue },
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (applied.length === 0) {
      this.addMessage(
        "I couldn't extract any field values from that. Try using the <strong>Wrong [Field]</strong> buttons to correct individual fields.",
        "ai",
      );
      return;
    }

    const summary = applied
      .map(({ field, newValue }) => `<strong>${this.escapeHtml(field)}</strong>: "${this.escapeHtml(newValue)}"`)
      .join(", ");

    this.addMessage(
      `Got it! I've updated the following fields: ${summary}. Does everything look correct now?`,
      "ai",
      { isCorrection: true, meta: "Multiple corrections applied" },
    );

    this.updateDetectedFieldsDisplay();
  }

  applyCorrection(field, newValue) {
    const originalValue = this.currentDetection?.[field];
    this.corrections[field] = newValue;

    // Store learning data
    this.learnFromCorrection(field, originalValue, newValue);

    this.addMessage(`Thanks! I've corrected the ${field}.`, "ai", {
      isCorrection: true,
      field: field.charAt(0).toUpperCase() + field.slice(1),
      originalValue,
      newValue,
      meta: "Learning saved for future analyses",
    });

    // Update the displayed fields
    this.updateDetectedFieldsDisplay();

    // Dispatch event for parent to update form
    this.dispatchEvent(
      new CustomEvent("field-corrected", {
        detail: { field, value: newValue, originalValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  learnFromCorrection(field, originalValue, correctedValue) {
    if (!originalValue || !correctedValue) return;

    // Create a learning key based on context
    const context = this.buildContextKey();
    const key = `${context}:${field}`;

    if (!this.learningData[key]) {
      this.learningData[key] = [];
    }

    this.learningData[key].push({
      from: originalValue,
      to: correctedValue,
      timestamp: Date.now(),
      detection: this.currentDetection,
    });

    // Keep only last 50 corrections per key
    if (this.learningData[key].length > 50) {
      this.learningData[key] = this.learningData[key].slice(-50);
    }

    localStorage.setItem("ai_learning_data", JSON.stringify(this.learningData));
  }

  buildContextKey() {
    // Create a fuzzy context key from available data
    const d = this.currentDetection || {};
    const artist = (d.artist || "")
      .toLowerCase()
      .replace(/[^\w]/g, "")
      .slice(0, 10);
    const title = (d.title || "")
      .toLowerCase()
      .replace(/[^\w]/g, "")
      .slice(0, 10);
    return `${artist}_${title}`;
  }

  getRelevantLearnings(currentDetection) {
    const context = this.buildContextKey();
    const learnings = {};

    for (const [key, corrections] of Object.entries(this.learningData)) {
      if (key.startsWith(context)) {
        const field = key.split(":")[1];
        // Get most common correction
        const counts = {};
        corrections.forEach((c) => {
          const k = `${c.from}->${c.to}`;
          counts[k] = (counts[k] || 0) + 1;
        });
        const mostCommon = Object.entries(counts).sort(
          (a, b) => b[1] - a[1],
        )[0];
        if (mostCommon && mostCommon[1] >= 2) {
          // Need at least 2 occurrences
          const [from, to] = mostCommon[0].split("->");
          learnings[field] = { from, to, confidence: mostCommon[1] };
        }
      }
    }

    return learnings;
  }

  hasLearnedCorrections() {
    return (
      Object.keys(this.getRelevantLearnings(this.currentDetection)).length > 0
    );
  }

  applyLearnedCorrections(data) {
    const learnings = this.getRelevantLearnings(data);

    for (const [field, learning] of Object.entries(learnings)) {
      if (data[field] === learning.from) {
        this.corrections[field] = learning.to;
        console.log(
          `Applied learned correction: ${field} "${learning.from}" -> "${learning.to}"`,
        );
      }
    }
  }

  updateDetectedFieldsDisplay() {
    // Remove old detection display and show updated one
    const messages = this.shadowRoot.querySelectorAll(".message.ai");
    messages.forEach((m) => {
      if (m.querySelector(".detected-fields")) {
        m.remove();
      }
    });

    // Re-show with corrections applied
    const correctedData = { ...this.currentDetection, ...this.corrections };
    this.showDetectionResults(correctedData);
  }

  confirmAllFields() {
    this.addMessage(
      "Great! All information confirmed. I'll use these details for your listing.",
      "ai",
      { meta: "Proceeding with verified information" },
    );

    this.dispatchEvent(
      new CustomEvent("all-confirmed", {
        detail: {
          data: { ...this.currentDetection, ...this.corrections },
          corrections: this.corrections,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  getCorrectedData() {
    return { ...this.currentDetection, ...this.corrections };
  }

  clear() {
    this.messages = [];
    this.corrections = {};
    this.currentDetection = null;
    this.pendingCorrection = null;

    const messagesArea = this.shadowRoot.getElementById("messagesArea");
    messagesArea.innerHTML = `
      <div class="message ai">
        👋 <strong>Hello!</strong> I'm your vinyl record AI assistant.<br><br>
        📸 <strong>Upload photos</strong> of your record and I'll identify the artist, title, label, year, catalogue number, matrix, and more.<br><br>
        ✏️ If anything looks wrong, use the quick buttons below or type a correction like <em>"the artist is Black Sabbath"</em>.<br><br>
        🔗 You can also <strong>paste a Discogs URL</strong> to fetch exact release details.
      </div>
    `;
    this.setStatus("ready");
  }
}

customElements.define("ai-chat", AIChat);
