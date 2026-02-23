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
        </div>
        
        <div class="messages-area" id="messagesArea">
          <div class="message ai">
            Hi! I'll analyze your record photos and help identify the details. If I get anything wrong, just correct me—I'll learn from it for next time!
          </div>
        </div>
        
        <div class="input-area">
          <div class="input-row">
            <input type="text" class="chat-input" id="chatInput" placeholder="Ask a question or correct a field..." />
            <button class="send-btn" id="sendBtn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="quick-actions" id="quickActions">
            <button class="quick-btn" data-action="confirm-all">✓ All Correct</button>
            <button class="quick-btn" data-action="wrong-artist">Wrong Artist</button>
            <button class="quick-btn" data-action="wrong-title">Wrong Title</button>
            <button class="quick-btn" data-action="wrong-year">Wrong Year</button>
            <button class="quick-btn" data-action="wrong-cat">Wrong Catalogue</button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const input = this.shadowRoot.getElementById("chatInput");
    const sendBtn = this.shadowRoot.getElementById("sendBtn");
    const quickActions = this.shadowRoot.getElementById("quickActions");

    sendBtn.addEventListener("click", () => this.handleSend());
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSend();
    });

    quickActions.addEventListener("click", (e) => {
      if (e.target.classList.contains("quick-btn")) {
        this.handleQuickAction(e.target.dataset.action);
      }
    });
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
      this.applyCorrection(this.pendingCorrection, message);
      this.pendingCorrection = null;
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
    ];

    for (const pattern of correctionPatterns) {
      const match = message.match(pattern.regex);
      if (match) {
        if (pattern.needsValue) {
          this.requestCorrection(pattern.field);
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

    // General question or confirmation
    this.showTyping();
    setTimeout(() => {
      this.hideTyping();
      this.addMessage(
        "I understand. You can tell me about any other corrections needed, or click 'All Correct' if everything looks good!",
        "ai",
      );
    }, 800);
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
        Hi! I'll analyze your record photos and help identify the details. If I get anything wrong, just correct me—I'll learn from it for next time!
      </div>
    `;
  }
}

customElements.define("ai-chat", AIChat);
