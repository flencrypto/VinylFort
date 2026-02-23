// Futuristic Feature Functions for VinylVault Pro

// AI Mood Analysis

// Mapping of genre keywords to mood profiles
const MOOD_MAP = [
  { keywords: ["rock", "punk", "grunge", "indie"], mood: "Energetic", emoji: "⚡", color: "#f97316" },
  { keywords: ["metal", "heavy", "thrash", "doom"], mood: "Intense", emoji: "🔥", color: "#ef4444" },
  { keywords: ["jazz", "bebop", "swing", "bossa"], mood: "Sophisticated", emoji: "🎷", color: "#8b5cf6" },
  { keywords: ["classical", "orchestral", "symphony", "baroque", "opera"], mood: "Contemplative", emoji: "🎻", color: "#6366f1" },
  { keywords: ["blues"], mood: "Melancholic", emoji: "🌧️", color: "#3b82f6" },
  { keywords: ["electronic", "techno", "house", "ambient", "synth", "electro"], mood: "Hypnotic", emoji: "🌐", color: "#06b6d4" },
  { keywords: ["pop", "disco"], mood: "Upbeat", emoji: "✨", color: "#f59e0b" },
  { keywords: ["soul", "gospel", "r&b", "rnb", "funk"], mood: "Passionate", emoji: "❤️", color: "#ec4899" },
  { keywords: ["hip hop", "hip-hop", "rap", "trap"], mood: "Confident", emoji: "🎤", color: "#a855f7" },
  { keywords: ["folk", "acoustic", "country", "bluegrass", "americana"], mood: "Nostalgic", emoji: "🍂", color: "#84cc16" },
  { keywords: ["reggae", "ska", "dub"], mood: "Laid-back", emoji: "🌴", color: "#10b981" },
  { keywords: ["latin", "salsa", "samba", "cumbia", "bossa nova"], mood: "Vibrant", emoji: "💃", color: "#fb923c" },
  { keywords: ["new age", "meditation", "spiritual"], mood: "Serene", emoji: "🌙", color: "#67e8f9" },
  { keywords: ["world", "afrobeat", "afro"], mood: "Adventurous", emoji: "🌍", color: "#fbbf24" },
];

function detectMoodForRecord(record) {
  const haystack = [record.genre, record.style, record.title, record.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const entry of MOOD_MAP) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry;
    }
  }
  return { mood: "Eclectic", emoji: "🎵", color: "#9ca3af" };
}

function openMoodAnalysis() {
  // Use Joyride flare for mood analysis
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "executeCommand",
      args: [
        "joyride.runCode",
        `
(flares/flare!+ {:html [:div {:style {:padding "20px" :background "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" :color "white" :border-radius "10px"}}
                        [:h2 "🎵 AI Mood Analysis"]
                        [:p "Analyzing the emotional vibe of your vinyl collection..."]
                        [:div {:class "ai-thinking" :style {:width "50px" :height "50px" :background "rgba(255,255,255,0.2)" :border-radius "50%" :margin "20px auto"}}]
                        [:p {:style {:font-size "0.9em" :opacity "0.8"}} "Detecting genres, moods, and musical characteristics..."]]
                 :title "Mood Analysis"
                 :key :mood-analysis})
`,
      ],
    });
  } else {
    showMoodAnalysisModal();
  }
}

function showMoodAnalysisModal() {
  // Load collection from localStorage
  let collection = [];
  try {
    const saved = localStorage.getItem("vinyl_collection");
    if (saved) collection = JSON.parse(saved);
  } catch (_e) {
    collection = [];
  }

  const totalRecords = collection.length;

  // Compute mood distribution
  const moodCounts = {};
  const moodMeta = {};
  collection.forEach((r) => {
    const entry = detectMoodForRecord(r);
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    moodMeta[entry.mood] = { emoji: entry.emoji, color: entry.color };
  });

  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  const dominantMood = sortedMoods.length ? sortedMoods[0] : null;

  // Genre classification breakdown
  const genreCounts = {};
  collection.forEach((r) => {
    const genre = r.genre || r.style || "Unknown";
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Annotate top genres with mood
  const genreRowsHtml = topGenres.length
    ? topGenres
        .map(([genre, count]) => {
          const pct = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
          const moodEntry = detectMoodForRecord({ genre });
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85em;margin-bottom:4px">
              <span style="display:flex;align-items:center;gap:6px">
                <span>${moodEntry.emoji}</span>
                <span style="color:#e2e8f0">${escapeHtml(genre)}</span>
                <span style="font-size:0.75em;color:${moodEntry.color};background:${moodEntry.color}22;padding:1px 6px;border-radius:4px">${escapeHtml(moodEntry.mood)}</span>
              </span>
              <span style="color:#9ca3af">${count} (${pct}%)</span>
            </div>
            <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px">
              <div style="background:${moodEntry.color};height:6px;border-radius:4px;width:${pct}%"></div>
            </div>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No collection data yet.</p>';

  // Mood distribution pills
  const moodDistHtml = sortedMoods.length
    ? sortedMoods
        .slice(0, 8)
        .map(([mood, count]) => {
          const meta = moodMeta[mood];
          const pct = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.85em">
            <span style="min-width:22px;text-align:center">${meta.emoji}</span>
            <span style="flex:1;color:#e2e8f0">${escapeHtml(mood)}</span>
            <div style="width:80px;background:rgba(255,255,255,0.08);border-radius:4px;height:6px">
              <div style="background:${meta.color};height:6px;border-radius:4px;width:${pct}%"></div>
            </div>
            <span style="width:32px;text-align:right;color:#9ca3af">${count}</span>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No collection data yet.</p>';

  // Top 5 records with mood labels
  const sampleRecords = collection.slice(0, 5);
  const recordRowsHtml = sampleRecords.length
    ? sampleRecords
        .map((r) => {
          const entry = detectMoodForRecord(r);
          return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85em">
            <span style="font-size:1.3em">${entry.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e2e8f0">${escapeHtml(r.artist || "Unknown")} — ${escapeHtml(r.title || "Unknown")}</div>
              <div style="color:#9ca3af;font-size:0.8em">${escapeHtml(r.genre || r.style || "Unknown genre")}</div>
            </div>
            <span style="white-space:nowrap;color:${entry.color};background:${entry.color}22;padding:2px 8px;border-radius:6px;font-size:0.8em">${escapeHtml(entry.mood)}</span>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No records yet. Add some vinyl to see mood analysis.</p>';

  const dominantHtml = dominantMood
    ? `<div style="display:flex;align-items:center;gap:12px;background:${moodMeta[dominantMood[0]].color}18;border:1px solid ${moodMeta[dominantMood[0]].color}44;border-radius:12px;padding:14px 18px">
        <span style="font-size:2.5em">${moodMeta[dominantMood[0]].emoji}</span>
        <div>
          <div style="font-size:0.75em;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Dominant Vibe</div>
          <div style="font-size:1.5em;font-weight:700;color:${moodMeta[dominantMood[0]].color}">${escapeHtml(dominantMood[0])}</div>
          <div style="font-size:0.8em;color:#9ca3af">${dominantMood[1]} of ${totalRecords} record${totalRecords !== 1 ? "s" : ""}</div>
        </div>
      </div>`
    : `<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px 18px;color:#9ca3af;font-size:0.9em">
        Add records to your collection to see your dominant vibe.
      </div>`;

  const modalHtml = `
    <div id="moodAnalysisModal"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px"
      data-mood-backdrop="true">
      <div style="background:#1e293b;border:1px solid rgba(139,92,246,0.3);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(139,92,246,0.2)">
        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="ai-thinking" style="width:32px;height:32px;flex-shrink:0"></div>
            <div>
              <h2 style="margin:0;font-size:1.2em;color:#a78bfa">🎵 AI Mood Analysis</h2>
              <p style="margin:2px 0 0;font-size:0.8em;color:#9ca3af">Emotional vibes &amp; genre classification</p>
            </div>
          </div>
          <button id="moodCloseBtn"
            style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:1.4em;line-height:1;padding:4px 8px"
            aria-label="Close">✕</button>
        </div>

        <!-- Scrollable body -->
        <div style="padding:20px 24px;overflow-y:auto;flex:1">

          <!-- Dominant vibe banner -->
          <div style="margin-bottom:20px">
            ${dominantHtml}
          </div>

          <!-- Genre classification + Mood distribution side by side -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
              <h3 style="margin:0 0 14px;font-size:0.9em;color:#e2e8f0">Genre Classification</h3>
              ${genreRowsHtml}
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
              <h3 style="margin:0 0 14px;font-size:0.9em;color:#e2e8f0">Mood Distribution</h3>
              ${moodDistHtml}
            </div>
          </div>

          <!-- Per-record mood -->
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
            <h3 style="margin:0 0 12px;font-size:0.9em;color:#e2e8f0">Record Vibes (first 5)</h3>
            ${recordRowsHtml}
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:flex-end">
          <button id="moodFooterCloseBtn"
            style="background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);color:#a78bfa;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:0.9em">
            Close
          </button>
        </div>
      </div>
    </div>`;

  // Remove any existing modal first
  const existing = document.getElementById("moodAnalysisModal");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Attach event listeners after DOM insertion (avoids inline onclick)
  const modal = document.getElementById("moodAnalysisModal");
  modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-mood-backdrop")) closeMoodAnalysisModal();
  });
  document.getElementById("moodCloseBtn").addEventListener("click", closeMoodAnalysisModal, { once: true });
  document.getElementById("moodFooterCloseBtn").addEventListener("click", closeMoodAnalysisModal, { once: true });
}

function closeMoodAnalysisModal() {
  const modal = document.getElementById("moodAnalysisModal");
  if (modal) modal.remove();
}

// VR Preview
function openVRPreview() {
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "executeCommand",
      args: [
        "joyride.runCode",
        `
(flares/flare!+ {:html [:div {:style {:padding "20px" :background "#000" :color "#00ff88" :font-family "monospace" :min-height "400px"}}
                        [:div {:class "vr-hologram"}
                         [:h2 "🕶️ Virtual Reality Listening Room"]
                         [:p "Welcome to the future of vinyl appreciation"]
                         [:div {:style {:border "2px solid #00ff88" :padding "20px" :margin "20px 0" :border-radius "10px"}}
                          [:p "🎧 Put on your VR headset"]
                          [:p "🎵 Experience 360° audio immersion"]
                          [:p "💿 Visualize record grooves in 3D"]
                          [:p "🌟 Feel the music come alive"]]
                         [:button {:style {:background "#00ff88" :color "black" :border "none" :padding "10px 20px" :border-radius "5px" :cursor "pointer" :margin-top "20px"}}
                          "Enter VR Mode (Coming Soon)"]]]
                 :title "VR Preview"
                 :key :vr-preview})
`,
      ],
    });
  } else {
    alert("VR Preview: Virtual reality features coming soon!");
  }
}

// Blockchain Authenticity
function openBlockchainAuth() {
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "executeCommand",
      args: [
        "joyride.runCode",
        `
(flares/flare!+ {:html [:div {:style {:padding "20px" :background "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" :color "white" :border-radius "10px"}}
                        [:h2 "⛓️ Blockchain Authenticity"]
                        [:div {:style {:background "rgba(255,255,255,0.1)" :padding "15px" :border-radius "8px" :margin "15px 0"}}
                         [:h3 "Record Certificate"]
                         [:p "🔐 Authenticity: Verified"]
                         [:p "📅 Minted: 2024-01-15"]
                         [:p "🏷️ Token ID: VX-001-2024"]
                         [:p "🎨 Artist: David Bowie"]
                         [:p "💿 Album: The Rise and Fall of Ziggy Stardust"]]
                        [:div {:style {:display "flex" :gap "10px" :margin-top "20px"}}
                         [:button {:style {:background "#10b981" :color "white" :border "none" :padding "8px 16px" :border-radius "5px"}}
                          "View on Blockchain"]
                         [:button {:style {:background "#f59e0b" :color "white" :border "none" :padding "8px 16px" :border-radius "5px"}}
                          "Transfer Ownership"]]]
                 :title "Blockchain Auth"
                 :key :blockchain-auth})
`,
      ],
    });
  } else {
    alert(
      "Blockchain Authenticity: Secure your collection with crypto certificates!",
    );
  }
}

// Quantum Analytics
function openQuantumAnalytics() {
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "executeCommand",
      args: [
        "joyride.runCode",
        `
(flares/flare!+ {:html [:div {:style {:padding "20px" :background "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" :color "#06b6d4" :border-radius "10px" :min-height "500px"}}
                        [:h2 "⚛️ Quantum Analytics Dashboard"]
                        [:div {:class "cyber-grid" :style {:height "300px" :border-radius "8px" :margin "20px 0" :position "relative"}}
                         [:div {:style {:position "absolute" :top "20px" :left "20px"}}
                          [:h3 "Market Predictions"]
                          [:div {:style {:display "flex" :gap "20px" :margin-top "10px"}}
                           [:div {:style {:text-align "center"}}
                            [:div {:style {:font-size "2em" :color "#10b981"}} "+23%"]
                            [:div {:style {:font-size "0.8em" :opacity "0.7"}} "Growth"]]
                           [:div {:style {:text-align "center"}}
                            [:div {:style {:font-size "2em" :color "#f59e0b"}} "£45.67"]
                            [:div {:style {:font-size "0.8em" :opacity "0.7"}} "Predicted"]]]]
                         [:div {:class "quantum-loader" :style {:position "absolute" :bottom "20px" :right "20px" :width "40px" :height "40px"}}]]
                        [:div {:style {:display "flex" :gap "10px" :margin-top "20px"}}
                         [:button {:style {:background "#06b6d4" :color "black" :border "none" :padding "8px 16px" :border-radius "5px"}}
                          "Run Analysis"]
                         [:button {:style {:background "#7c3aed" :color "white" :border "none" :padding "8px 16px" :border-radius "5px"}}
                          "Export Report"]]]
                 :title "Quantum Analytics"
                 :key :quantum-analytics})
`,
      ],
    });
  } else {
    showQuantumAnalyticsModal();
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showQuantumAnalyticsModal() {
  // Load collection from localStorage
  let collection = [];
  try {
    const saved = localStorage.getItem("vinyl_collection");
    if (saved) collection = JSON.parse(saved);
  } catch (_e) {
    collection = [];
  }

  // Compute stats
  const totalRecords = collection.length;
  const totalInvested = collection.reduce(
    (sum, r) => sum + (parseFloat(r.purchasePrice) || 0),
    0,
  );
  const totalValue = collection.reduce(
    (sum, r) =>
      sum +
      (parseFloat(r.estimatedValue) ||
        parseFloat(r.csvMarketData?.median) ||
        0),
    0,
  );
  const totalProfit = totalValue - totalInvested;
  const roi =
    totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

  // Genre breakdown
  const genreCounts = {};
  collection.forEach((r) => {
    const genre = r.genre || "Unknown";
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Condition breakdown
  const conditionCounts = {};
  collection.forEach((r) => {
    const cond = r.conditionVinyl || "Unknown";
    conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
  });

  // Top records by estimated value
  const topRecords = [...collection]
    .filter((r) => {
      const val =
        parseFloat(r.estimatedValue) ||
        parseFloat(r.csvMarketData?.median) ||
        0;
      return val > 0;
    })
    .sort(
      (a, b) =>
        (parseFloat(b.estimatedValue) ||
          parseFloat(b.csvMarketData?.median) ||
          0) -
        (parseFloat(a.estimatedValue) ||
          parseFloat(a.csvMarketData?.median) ||
          0),
    )
    .slice(0, 5);

  // Build genre rows HTML
  const genreRowsHtml = topGenres.length
    ? topGenres
        .map(([genre, count]) => {
          const pct =
            totalRecords > 0
              ? Math.round((count / totalRecords) * 100)
              : 0;
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:3px">
              <span>${escapeHtml(genre)}</span><span>${count} (${pct}%)</span>
            </div>
            <div style="background:rgba(124,58,237,0.2);border-radius:4px;height:6px">
              <div style="background:#7c3aed;height:6px;border-radius:4px;width:${pct}%"></div>
            </div>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No collection data yet.</p>';

  // Build condition rows HTML
  const conditionOrder = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P", "Unknown"];
  const conditionColors = {
    M: "#10b981",
    NM: "#06b6d4",
    "VG+": "#7c3aed",
    VG: "#f59e0b",
    "G+": "#f97316",
    G: "#ef4444",
    F: "#6b7280",
    P: "#374151",
    Unknown: "#4b5563",
  };
  const conditionRowsHtml = Object.keys(conditionCounts).length
    ? conditionOrder
        .filter((c) => conditionCounts[c])
        .map((cond) => {
          const count = conditionCounts[cond];
          const pct =
            totalRecords > 0
              ? Math.round((count / totalRecords) * 100)
              : 0;
          const color = conditionColors[cond] || "#7c3aed";
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.85em">
            <span style="width:36px;color:${color};font-weight:600">${escapeHtml(cond)}</span>
            <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:4px;height:6px">
              <div style="background:${color};height:6px;border-radius:4px;width:${pct}%"></div>
            </div>
            <span style="width:40px;text-align:right;color:#9ca3af">${count}</span>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No collection data yet.</p>';

  // Build top records HTML
  const topRecordsHtml = topRecords.length
    ? topRecords
        .map((r) => {
          const val =
            parseFloat(r.estimatedValue) ||
            parseFloat(r.csvMarketData?.median) ||
            0;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85em">
            <div style="flex:1;min-width:0">
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e2e8f0">${escapeHtml(r.artist || "Unknown")}</div>
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#9ca3af">${escapeHtml(r.title || "Unknown")}</div>
            </div>
            <div style="color:#10b981;font-weight:600;margin-left:12px">£${val.toFixed(2)}</div>
          </div>`;
        })
        .join("")
    : '<p style="color:#9ca3af;font-size:0.85em">No valued records yet. Run market analysis on your records.</p>';

  const roiColor = roi >= 0 ? "#10b981" : "#ef4444";
  const roiPrefix = roi >= 0 ? "+" : "";

  const modalHtml = `
    <div id="quantumAnalyticsModal"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px"
      data-qa-backdrop="true">
      <div style="background:#1e293b;border:1px solid rgba(6,182,212,0.3);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(6,182,212,0.2)">
        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="quantum-loader" style="width:32px;height:32px;flex-shrink:0"></div>
            <div>
              <h2 style="margin:0;font-size:1.2em;color:#06b6d4">⚛️ Quantum Analytics Dashboard</h2>
              <p style="margin:2px 0 0;font-size:0.8em;color:#9ca3af">Advanced market insights powered by AI</p>
            </div>
          </div>
          <button id="qaCloseBtn"
            style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:1.4em;line-height:1;padding:4px 8px"
            aria-label="Close">✕</button>
        </div>

        <!-- Scrollable body -->
        <div style="padding:20px 24px;overflow-y:auto;flex:1">

          <!-- Summary stats -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px">
            <div style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:1.8em;font-weight:700;color:#7c3aed">${totalRecords}</div>
              <div style="font-size:0.75em;color:#9ca3af;margin-top:2px">Total Records</div>
            </div>
            <div style="background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:1.8em;font-weight:700;color:#06b6d4">£${totalValue.toFixed(0)}</div>
              <div style="font-size:0.75em;color:#9ca3af;margin-top:2px">Est. Value</div>
            </div>
            <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:1.8em;font-weight:700;color:#f59e0b">£${totalInvested.toFixed(0)}</div>
              <div style="font-size:0.75em;color:#9ca3af;margin-top:2px">Invested</div>
            </div>
            <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:1.8em;font-weight:700;color:${roiColor}">${roiPrefix}${roi}%</div>
              <div style="font-size:0.75em;color:#9ca3af;margin-top:2px">ROI</div>
            </div>
          </div>

          <!-- Genre + Condition side by side -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
              <h3 style="margin:0 0 12px;font-size:0.9em;color:#e2e8f0">Genre Breakdown</h3>
              ${genreRowsHtml}
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
              <h3 style="margin:0 0 12px;font-size:0.9em;color:#e2e8f0">Condition Distribution</h3>
              ${conditionRowsHtml}
            </div>
          </div>

          <!-- Top records by value -->
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px">
            <h3 style="margin:0 0 12px;font-size:0.9em;color:#e2e8f0">Top Records by Estimated Value</h3>
            ${topRecordsHtml}
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:flex-end">
          <button id="qaFooterCloseBtn"
            style="background:rgba(6,182,212,0.2);border:1px solid rgba(6,182,212,0.4);color:#06b6d4;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:0.9em">
            Close
          </button>
        </div>
      </div>
    </div>`;

  // Remove any existing modal first
  const existing = document.getElementById("quantumAnalyticsModal");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Attach event listeners after DOM insertion (avoids inline onclick)
  const modal = document.getElementById("quantumAnalyticsModal");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeQuantumAnalyticsModal();
  });
  document.getElementById("qaCloseBtn").addEventListener("click", closeQuantumAnalyticsModal);
  document.getElementById("qaFooterCloseBtn").addEventListener("click", closeQuantumAnalyticsModal);
}

function closeQuantumAnalyticsModal() {
  const modal = document.getElementById("quantumAnalyticsModal");
  if (modal) modal.remove();
}
