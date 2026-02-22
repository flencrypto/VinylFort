// Enhanced UX Functions

// Update progress steps
function updateProgressSteps(currentStep) {
  const steps = ["step1", "step2", "step3"];
  steps.forEach((stepId, index) => {
    const step = document.getElementById(stepId);
    const stepIcon = step.querySelector(".step-icon");

    step.classList.remove("active", "completed");

    if (index + 1 < currentStep) {
      step.classList.add("completed");
      stepIcon.className = "step-icon bg-green-500 text-white";
      stepIcon.textContent = "✓";
    } else if (index + 1 === currentStep) {
      step.classList.add("active");
      stepIcon.className = "step-icon bg-primary text-white";
      stepIcon.textContent = index + 1;
    } else {
      stepIcon.className = "step-icon bg-gray-600 text-gray-400";
      stepIcon.textContent = index + 1;
    }
  });
}

// Enhanced form validation
function validateForm() {
  const requiredFields = ["artistInput", "titleInput"];
  let isValid = true;

  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    const value = field.value.trim();

    if (!value) {
      field.classList.add("input-error");
      field.classList.remove("input-success");
      isValid = false;
    } else {
      field.classList.remove("input-error");
      field.classList.add("input-success");
    }
  });

  return isValid;
}

// Enhanced button loading states
function setButtonLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  const textSpan = button.querySelector("span");
  const spinner = button.querySelector(".animate-spin");

  if (loading) {
    button.disabled = true;
    button.classList.add("btn-loading");
    textSpan.textContent = "Processing...";
    if (spinner) spinner.classList.remove("hidden");
  } else {
    button.disabled = false;
    button.classList.remove("btn-loading");
    textSpan.textContent =
      buttonId === "generateListingBtn"
        ? "Generate Full Listing"
        : "Quick Preview";
    if (spinner) spinner.classList.add("hidden");
  }
}

// Enhanced toast notifications
function showToast(message, type = "info", duration = 4000) {
  const toastContainer =
    document.getElementById("toastContainer") || createToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type} fixed bottom-4 right-4 z-50`;
  toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i data-feather="${getToastIcon(type)}" class="w-5 h-5"></i>
            <span class="text-sm">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-400 hover:text-white">
                <i data-feather="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;

  toastContainer.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  // Animate in
  requestAnimationFrame(() => toast.classList.add("show"));

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    success: "check-circle",
    error: "alert-circle",
    warning: "alert-triangle",
    info: "info",
  };
  return icons[type] || "info";
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "fixed bottom-4 right-4 z-50 space-y-2";
  document.body.appendChild(container);
  return container;
}

// Simulate analysis with progress updates
async function simulateAnalysis() {
  const stages = [
    { text: "Analyzing images...", percent: 25 },
    { text: "Extracting text...", percent: 50 },
    { text: "Identifying record...", percent: 75 },
    { text: "Generating listing...", percent: 100 },
  ];

  for (const stage of stages) {
    updateAnalysisProgress(stage.percent, stage.text);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// Update analysis progress
function updateAnalysisProgress(percent, stageText) {
  const bar = document.getElementById("analysisBar");
  const percentText = document.getElementById("analysisPercent");
  const stageTextEl = document.getElementById("analysisStageText");

  if (bar) bar.style.width = `${percent}%`;
  if (percentText) percentText.textContent = `${percent}%`;
  if (stageTextEl) stageTextEl.textContent = stageText;
}

// DOM Elements
let uploadedPhotos = [];
let hostedPhotoUrls = [];
let photoObjectUrls = []; // Track object URLs for cleanup
const detectedPhotoTypes = new Set(); // Track inferred shot types for quick preview and checklist rendering
const dropZone = document.getElementById("dropZone");
const photoInput = document.getElementById("photoInput");
const photoGrid = document.getElementById("photoGrid");
const resultsSection = document.getElementById("resultsSection");
const emptyState = document.getElementById("emptyState");
// Event Listeners - Initialize after DOM is ready
function updateDropZoneState(state) {
  const dz = document.getElementById("dropZone");
  if (!dz) return;

  if (state === "dragover") {
    dz.classList.add("drag-over");
  } else {
    dz.classList.remove("drag-over");
  }
}

function initDropZone() {
  const dz = document.getElementById("dropZone");
  const pInput = document.getElementById("photoInput");

  if (!dz || !pInput) {
    console.error("Drop zone elements not found");
    return;
  }

  // Store references on elements to prevent duplicate initialization
  if (dz._initialized) {
    console.log("Drop zone already initialized, skipping");
    return;
  }
  dz._initialized = true;

  // Click to browse - use event delegation pattern
  dz.addEventListener("click", (e) => {
    // Prevent triggering when clicking on child elements like the spinner
    if (e.target.closest("#uploadSpinner")) return;
    if (e.target.closest(".remove-btn")) return;
    e.preventDefault();
    e.stopPropagation();
    pInput.click();
  });

  // Drag over - show visual feedback
  dz.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateDropZoneState("dragover");
  });

  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateDropZoneState("dragover");
  });

  // Drag leave - remove visual feedback
  dz.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if we're actually leaving the dropzone, not entering a child
    if (!dz.contains(e.relatedTarget)) {
      updateDropZoneState("default");
    }
  });

  // Drop - handle files
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateDropZoneState("default");

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) {
      updateProgressSteps(2);
      addPhotos(files);
      showToast(
        `Successfully added ${files.length} photo${files.length > 1 ? "s" : ""}`,
        "success",
      );
    } else {
      showToast("Please drop image files only", "warning");
    }
  });

  // File input change
  pInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      updateProgressSteps(2);
      addPhotos(files);
      showToast(
        `Successfully added ${files.length} photo${files.length > 1 ? "s" : ""}`,
        "success",
      );
      // Reset input so same files can be selected again
      pInput.value = "";
    }
  });
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById("dropZone");
  if (dz) dz.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type.startsWith("image/"),
  );
  addPhotos(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addPhotos(files);
}
async function addPhotos(files) {
  if (!files || files.length === 0) return;

  uploadedPhotos.push(...files);
  renderPhotoGrid();
  updateEmptyState();

  // Auto-detect photo types first (uses filename heuristics)
  setTimeout(() => analyzePhotoTypes(), 100);

  // Auto-upload to imgbb if available
  if (localStorage.getItem("imgbb_api_key")) {
    setTimeout(() => uploadPhotosToImgBB(files), 200);
  }

  // Trigger OCR analysis if we have photos and API key
  if (
    uploadedPhotos.length > 0 &&
    (localStorage.getItem("openai_api_key") ||
      localStorage.getItem("deepseek_api_key"))
  ) {
    setTimeout(() => analyzePhotosWithOCR(), 500);
  } else if (
    uploadedPhotos.length > 0 &&
    !localStorage.getItem("openai_api_key") &&
    !localStorage.getItem("deepseek_api_key")
  ) {
    showToast("Add AI API key in Settings for auto-detection", "warning");
  }
}
async function uploadPhotosToImgBB(files) {
  const apiKey = localStorage.getItem("imgbb_api_key");

  if (!apiKey) {
    console.log("No imgBB API key configured, skipping upload");
    return;
  }

  const progressBar = document.getElementById("uploadBar");
  const progressContainer = document.getElementById("uploadProgress");
  const percentText = document.getElementById("uploadPercent");

  progressContainer.classList.remove("hidden");
  hostedPhotoUrls = []; // Reset hosted URLs
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const base64 = await fileToBase64(file);

    const formData = new FormData();
    formData.append("image", base64.split(",")[1]); // Remove data:image/*;base64, prefix
    formData.append("key", apiKey);
    formData.append(
      "name",
      `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`,
    );

    try {
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Store as object with all relevant URLs from API response
        hostedPhotoUrls.push({
          id: data.data.id,
          url: data.data.url,
          displayUrl: data.data.display_url,
          viewerUrl: data.data.url_viewer,
          deleteUrl: data.data.delete_url,
          thumb: data.data.thumb?.url || data.data.url,
          medium: data.data.medium?.url || data.data.display_url,
          filename: data.data.image?.filename || file.name,
          width: data.data.width,
          height: data.data.height,
          size: data.data.size,
          expiration: data.data.expiration,
        });
        console.log("Uploaded:", data.data.url);
      } else {
        console.error("Upload failed:", data.status, data);
        failedCount++;
      }
    } catch (error) {
      console.error("Upload failed:", error);
      failedCount++;
    }

    const progress = ((i + 1) / files.length) * 100;
    progressBar.style.width = `${progress}%`;
    percentText.textContent = `${Math.round(progress)}%`;
  }

  setTimeout(() => {
    progressContainer.classList.add("hidden");
    if (hostedPhotoUrls.length > 0) {
      showToast(
        `${hostedPhotoUrls.length} photos uploaded to imgBB`,
        "success",
      );
      console.log(
        "Hosted URLs:",
        hostedPhotoUrls.map((u) => ({ url: u.url, deleteUrl: u.deleteUrl })),
      );
    }
    if (failedCount > 0) {
      showToast(
        `${failedCount} photo${failedCount > 1 ? "s" : ""} failed to upload`,
        "error",
      );
    }
  }, 500);
}
async function analyzePhotoTypes() {
  if (uploadedPhotos.length === 0) return;

  detectedPhotoTypes.clear();

  // Always do basic filename analysis first
  uploadedPhotos.forEach((file) => {
    const name = file.name.toLowerCase();
    if (
      name.includes("front") ||
      name.includes("cover") ||
      name.includes("front")
    )
      detectedPhotoTypes.add("front");
    if (name.includes("back") || name.includes("rear"))
      detectedPhotoTypes.add("back");
    if (name.includes("spine")) detectedPhotoTypes.add("spine");
    if (
      name.includes("label") &&
      (name.includes("a") || name.includes("side1") || name.includes("side_1"))
    )
      detectedPhotoTypes.add("label_a");
    if (
      name.includes("label") &&
      (name.includes("b") || name.includes("side2") || name.includes("side_2"))
    )
      detectedPhotoTypes.add("label_b");
    if (name.includes("inner") || name.includes("sleeve"))
      detectedPhotoTypes.add("inner");
    if (name.includes("insert") || name.includes("poster"))
      detectedPhotoTypes.add("insert");
    if (name.includes("hype") || name.includes("sticker"))
      detectedPhotoTypes.add("hype");
    if (
      name.includes("vinyl") ||
      name.includes("record") ||
      name.includes("disc")
    )
      detectedPhotoTypes.add("vinyl");
    if (name.includes("corner") || name.includes("edge"))
      detectedPhotoTypes.add("corners");
    if (name.includes("barcode")) detectedPhotoTypes.add("barcode");
    if (
      name.includes("matrix") ||
      name.includes("runout") ||
      name.includes("deadwax")
    )
      detectedPhotoTypes.add("deadwax");
  });

  // Update UI immediately with filename-based detection
  renderShotList();

  // Try AI detection if available
  const service = getAIService();
  if (service && service.apiKey) {
    showToast("Analyzing photo types with AI...", "success");

    try {
      // Analyze each photo to determine what shot it is
      for (let i = 0; i < Math.min(uploadedPhotos.length, 4); i++) {
        // Limit to first 4 to save API calls
        try {
          const result = await identifyPhotoType(uploadedPhotos[i], service);
          if (result && result.type) {
            detectedPhotoTypes.add(result.type);
          }
        } catch (e) {
          console.error("Photo type analysis failed for image", i, e);
        }
      }
      renderShotList();
      showToast(`Detected ${detectedPhotoTypes.size} shot types`, "success");
    } catch (e) {
      console.error("AI photo type detection failed:", e);
    }
  }
}
async function identifyPhotoType(imageFile, service) {
  // Simple heuristic based on filename first
  const name = imageFile.name.toLowerCase();

  // If we can use AI vision, do so
  if (service && service.apiKey) {
    try {
      const base64 = await fileToBase64Clean(imageFile);
      const messages = [
        {
          role: "system",
          content: `You are analyzing a vinyl record photo. Identify which type of shot this is from this list:
- front: Front cover/album artwork
- back: Back cover/tracklist
- spine: Spine with text
- label_a: Side A label
- label_b: Side B label  
- deadwax: Deadwax/runout grooves showing matrix numbers (critical for pressing identification)
- inner: Inner sleeve
- insert: Insert or poster
- hype: Hype sticker on shrink
- vinyl: Vinyl in raking light showing condition
- corners: Close-up of sleeve corners/edges
- barcode: Barcode area

For deadwax photos, look for: hand-etched matrix numbers, stamped codes, "STERLING", "MASTERED BY", plant symbols, or any alphanumeric codes in the runout groove area.

Return ONLY a JSON object: {"type": "one_of_the_above", "confidence": "high|medium|low"}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "What type of record photo is this?" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: "low",
              },
            },
          ],
        },
      ];

      const response = await fetch(
        service.baseUrl || "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${service.apiKey}`,
          },
          body: JSON.stringify({
            model: service.model || "gpt-4o-mini",
            messages: messages,
            max_tokens: 100,
            temperature: 0.1,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|([\s\S]*)/);
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[2] : content;
        return JSON.parse(jsonStr.trim());
      }
    } catch (e) {
      console.log("AI photo type detection failed, using filename heuristics");
    }
  }

  return null;
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result); // Return full data URL including prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to get clean base64 without data URL prefix
function fileToBase64Clean(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function getAIService() {
  const provider = localStorage.getItem("ai_provider") || "openai";
  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    return window.deepseekService;
  }
  return window.ocrService;
}

function resolveOCRProvider() {
  const preferredProvider = localStorage.getItem("ai_provider") || "openai";
  const deepseekModel =
    localStorage.getItem("deepseek_model") || "deepseek-chat";
  const canUseDeepseekVision =
    preferredProvider === "deepseek" &&
    window.deepseekService?.isConfigured &&
    window.deepseekService.isVisionModel(deepseekModel);

  if (canUseDeepseekVision) {
    return { provider: "deepseek", fallbackReason: null };
  }

  if (preferredProvider === "deepseek") {
    return {
      provider: "openai",
      fallbackReason: window.deepseekService?.isConfigured
        ? `DeepSeek model \"${deepseekModel}\" does not support image analysis.`
        : "DeepSeek API key not configured.",
    };
  }

  return { provider: "openai", fallbackReason: null };
}
// Analysis progress state
let analysisProgressInterval = null;

function updateAnalysisProgress(stage, percent) {
  const stageText = document.getElementById("analysisStageText");
  const percentText = document.getElementById("analysisPercent");
  const progressBar = document.getElementById("analysisBar");

  if (stageText) stageText.textContent = stage;
  if (percentText) percentText.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
}

function startAnalysisProgressSimulation() {
  const stages = [
    { stage: "Preparing images...", target: 15 },
    { stage: "Uploading to AI service...", target: 35 },
    { stage: "Analyzing labels and covers...", target: 60 },
    { stage: "Extracting text with OCR...", target: 80 },
    { stage: "Identifying pressing details...", target: 95 },
    { stage: "Finalizing results...", target: 100 },
  ];

  let currentStage = 0;
  let currentPercent = 0;

  updateAnalysisProgress(stages[0].stage, 0);

  analysisProgressInterval = setInterval(() => {
    if (currentStage >= stages.length) {
      clearInterval(analysisProgressInterval);
      return;
    }

    const stage = stages[currentStage];
    const increment = Math.random() * 3 + 1; // Random increment between 1-4%
    currentPercent = Math.min(currentPercent + increment, stage.target);

    updateAnalysisProgress(stage.stage, Math.floor(currentPercent));

    if (currentPercent >= stage.target && currentStage < stages.length - 1) {
      currentStage++;
      currentPercent = stage.target;
    }
  }, 200);
}

function stopAnalysisProgress() {
  if (analysisProgressInterval) {
    clearInterval(analysisProgressInterval);
    analysisProgressInterval = null;
  }
  updateAnalysisProgress("Complete!", 100);
}

async function analyzePhotosWithOCR() {
  const spinner = document.getElementById("uploadSpinner");
  const dropZone = document.getElementById("dropZone");

  try {
    spinner.classList.remove("hidden");
    dropZone.classList.add("pointer-events-none");

    // Start progress simulation
    startAnalysisProgressSimulation();

    // Determine which AI service to use
    const { provider, fallbackReason } = resolveOCRProvider();
    const service =
      provider === "deepseek" ? window.deepseekService : window.ocrService;

    if (fallbackReason) {
      showToast(`${fallbackReason} Falling back to OpenAI for OCR.`, "warning");
    }

    // Update API keys
    if (provider === "openai") {
      const apiKey = localStorage.getItem("openai_api_key");
      if (!apiKey) throw new Error("OpenAI API key not configured");
      window.ocrService.updateApiKey(apiKey);
    } else {
      const apiKey = localStorage.getItem("deepseek_api_key");
      if (!apiKey) throw new Error("DeepSeek API key not configured");
      window.deepseekService.updateApiKey(apiKey);
      window.deepseekService.updateModel(
        localStorage.getItem("deepseek_model") || "deepseek-chat",
      );
    }

    const result = await service.analyzeRecordImages(uploadedPhotos);

    // Complete the progress bar
    stopAnalysisProgress();
    populateFieldsFromOCR(result);

    // Sync detection results into the AI chat so it can use them when the
    // user later pastes a Discogs URL for correction.
    const aiChatForOcr = document.getElementById("aiChatBox");
    if (aiChatForOcr?.showDetectionResults) {
      aiChatForOcr.showDetectionResults(result);
    }

    // Try to fetch additional data from Discogs with pressing-aware matching
    if (result.artist && result.title && window.discogsService) {
      try {
        const quickMatrixA = document
          .getElementById("matrixSideAInput")
          ?.value?.trim();
        const quickMatrixB = document
          .getElementById("matrixSideBInput")
          ?.value?.trim();
        const mergedOcrData = {
          ...result,
          matrixRunoutA: result.matrixRunoutA || quickMatrixA || null,
          matrixRunoutB: result.matrixRunoutB || quickMatrixB || null,
        };
        const match =
          await window.discogsService.matchReleaseFromOcr(mergedOcrData);
        if (match?.release) {
          populateFieldsFromDiscogs(match.release);
          updateDiscogsMatchPanel(match);
        } else {
          const discogsData = await window.discogsService.searchRelease(
            result.artist,
            result.title,
            result.catalogueNumber,
          );
          if (discogsData) {
            populateFieldsFromDiscogs(discogsData);
          }
        }
      } catch (e) {
        console.log("Discogs lookup failed:", e);
      }
    }

    const confidenceMsg =
      result.confidence === "high"
        ? "Record identified!"
        : result.confidence === "medium"
          ? "Record found (verify details)"
          : "Partial match found";
    showToast(
      confidenceMsg,
      result.confidence === "high" ? "success" : "warning",
    );
  } catch (error) {
    console.error("OCR Error:", error);
    if (
      error.message.includes("API key") ||
      error.message.includes("not configured")
    ) {
      const provider = localStorage.getItem("ai_provider") || "openai";
      showToast(
        `Please configure ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} API key in Settings`,
        "error",
      );
    } else {
      showToast(`Analysis failed: ${error.message}`, "error");
    }
  } finally {
    stopAnalysisProgress();
    // Small delay to show 100% before hiding
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      // Reset progress for next time
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
function populateFieldsFromDiscogs(discogsData) {
  if (!discogsData) return;

  // Update year if not already set or if Discogs has better data
  const yearInput = document.getElementById("yearInput");
  if (
    discogsData.year &&
    (!yearInput.value || yearInput.value === "[Verify]")
  ) {
    yearInput.value = discogsData.year;
    yearInput.classList.add("border-orange-500", "bg-orange-500/10");
    setTimeout(() => {
      yearInput.classList.remove("border-orange-500", "bg-orange-500/10");
    }, 3000);
  }

  // Store additional Discogs data for later use
  if (discogsData.id) {
    window.discogsReleaseId = discogsData.id;
  }

  // Show Discogs match indicator
  let panel = document.getElementById("detectedInfoPanel");
  if (panel) {
    const discogsBadge = document.createElement("div");
    discogsBadge.className = "mt-2 pt-2 border-t border-green-500/20";
    discogsBadge.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-feather="check-circle" class="w-4 h-4 text-orange-400"></i>
                <span class="text-sm text-orange-400">Matched on Discogs</span>
                <a href="https://www.discogs.com/release/${discogsData.id}" target="_blank" rel="noopener noreferrer" class="text-xs text-gray-400 hover:text-orange-400 underline">View →</a>
            </div>
        `;
    panel.appendChild(discogsBadge);
    if (typeof feather !== "undefined") feather.replace();
  }
}
function populateFieldsFromOCR(data) {
  if (!data) {
    console.error("No OCR data received");
    return;
  }

  const fields = {
    artistInput: data.artist,
    titleInput: data.title,
    catInput: data.catalogueNumber,
    yearInput: data.year,
    matrixSideAInput: data.matrixRunoutA,
    matrixSideBInput: data.matrixRunoutB,
  };

  let populatedCount = 0;

  Object.entries(fields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field && value && value !== "null" && value !== "undefined") {
      // Only populate if field is empty or user hasn't manually entered
      if (!field.value || field.dataset.userModified !== "true") {
        field.value = value;
        field.classList.add("border-green-500", "bg-green-500/10");
        setTimeout(() => {
          field.classList.remove("border-green-500", "bg-green-500/10");
        }, 3000);
        populatedCount++;
      }
    }
  });

  // Store additional data for later use
  if (data.label) window.detectedLabel = data.label;
  if (data.country) window.detectedCountry = data.country;
  if (data.format) window.detectedFormat = data.format;
  if (data.genre) window.detectedGenre = data.genre;
  if (data.pressingInfo) window.detectedPressingInfo = data.pressingInfo;
  if (data.conditionEstimate) window.detectedCondition = data.conditionEstimate;
  if (data.notes) window.detectedNotes = data.notes;
  if (data.barcode) window.detectedBarcode = data.barcode;
  if (data.matrixRunoutA) window.detectedMatrixRunoutA = data.matrixRunoutA;
  if (data.matrixRunoutB) window.detectedMatrixRunoutB = data.matrixRunoutB;
  if (data.labelCode) window.detectedLabelCode = data.labelCode;
  if (data.rightsSociety) window.detectedRightsSociety = data.rightsSociety;
  if (data.pressingPlant) window.detectedPressingPlant = data.pressingPlant;
  if (data.labelRimText) window.detectedLabelRimText = data.labelRimText;
  if (data.identifierStrings)
    window.detectedIdentifierStrings = data.identifierStrings;
  // Store pressing identification data
  if (data.pressingType) window.detectedPressingType = data.pressingType;
  if (data.isFirstPress) window.detectedIsFirstPress = data.isFirstPress;
  if (data.reissueYear) window.detectedReissueYear = data.reissueYear;
  if (data.originalYear) window.detectedOriginalYear = data.originalYear;

  // Update UI to show detected info
  updateDetectedInfoPanel(data);

  // Scroll to quick details section so user can verify
  if (populatedCount > 0) {
    const quickDetailsSection = document.querySelector(".md\\:w-80");
    if (quickDetailsSection) {
      setTimeout(() => {
        quickDetailsSection.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }
}
// Track user modifications to fields
document.addEventListener("DOMContentLoaded", () => {
  [
    "artistInput",
    "titleInput",
    "catInput",
    "yearInput",
    "matrixSideAInput",
    "matrixSideBInput",
  ].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      field.addEventListener("input", () => {
        field.dataset.userModified = "true";
      });
    }
  });
});
function updateDetectedInfoPanel(data) {
  if (!data) return;

  // Create or update detected info panel
  let panel = document.getElementById("detectedInfoPanel");
  const parent = document.querySelector("#dropZone")?.parentNode;
  if (!parent) return;

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "detectedInfoPanel";
    parent.appendChild(panel);
  }

  panel.className =
    "mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg";

  const infoItems = [];
  if (data.label && data.label !== "null")
    infoItems.push(`<span class="text-green-400">Label:</span> ${data.label}`);
  if (data.country && data.country !== "null")
    infoItems.push(
      `<span class="text-green-400">Country:</span> ${data.country}`,
    );
  if (data.format && data.format !== "null")
    infoItems.push(
      `<span class="text-green-400">Format:</span> ${data.format}`,
    );
  if (data.genre && data.genre !== "null")
    infoItems.push(`<span class="text-green-400">Genre:</span> ${data.genre}`);
  if (data.conditionEstimate && data.conditionEstimate !== "null")
    infoItems.push(
      `<span class="text-green-400">Est. Condition:</span> ${data.conditionEstimate}`,
    );
  if (data.pressingInfo && data.pressingInfo !== "null")
    infoItems.push(
      `<span class="text-green-400">Matrix:</span> ${data.pressingInfo}`,
    );
  if (data.matrixRunoutA && data.matrixRunoutA !== "null")
    infoItems.push(
      `<span class="text-green-400">Matrix A:</span> ${data.matrixRunoutA}`,
    );
  if (data.matrixRunoutB && data.matrixRunoutB !== "null")
    infoItems.push(
      `<span class="text-green-400">Matrix B:</span> ${data.matrixRunoutB}`,
    );
  if (data.barcode && data.barcode !== "null")
    infoItems.push(
      `<span class="text-green-400">Barcode:</span> ${data.barcode}`,
    );
  if (data.labelCode && data.labelCode !== "null")
    infoItems.push(
      `<span class="text-green-400">Label Code:</span> ${data.labelCode}`,
    );
  if (data.rightsSociety && data.rightsSociety !== "null")
    infoItems.push(
      `<span class="text-green-400">Rights Society:</span> ${data.rightsSociety}`,
    );
  if (data.pressingPlant && data.pressingPlant !== "null")
    infoItems.push(
      `<span class="text-green-400">Pressing Plant:</span> ${data.pressingPlant}`,
    );
  if (data.labelRimText && data.labelRimText !== "null")
    infoItems.push(
      `<span class="text-green-400">Label Rim:</span> ${data.labelRimText}`,
    );

  // Add pressing identification info
  if (data.isFirstPress !== undefined) {
    const pressBadge = data.isFirstPress
      ? '<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">FIRST PRESS</span>'
      : data.pressingType === "reissue"
        ? '<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">REISSUE</span>'
        : data.pressingType === "repress"
          ? '<span class="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">REPRESS</span>'
          : "";
    if (pressBadge) infoItems.push(pressBadge);
  }

  if (data.originalYear && data.originalYear !== data.year) {
    infoItems.push(
      `<span class="text-purple-400">Original Year:</span> ${data.originalYear}`,
    );
  }
  if (data.reissueYear && data.reissueYear !== data.year) {
    infoItems.push(
      `<span class="text-blue-400">Reissue Year:</span> ${data.reissueYear}`,
    );
  }

  const confidenceColor =
    data.confidence === "high"
      ? "text-green-400"
      : data.confidence === "medium"
        ? "text-yellow-400"
        : "text-orange-400";

  panel.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <i data-feather="check-circle" class="w-4 h-4 ${confidenceColor}"></i>
            <span class="text-sm font-medium ${confidenceColor}">AI Detected Information (${data.confidence || "unknown"} confidence)</span>
        </div>
        ${
          infoItems.length > 0
            ? `
            <div class="grid grid-cols-2 gap-2 text-sm">
                ${infoItems.map((item) => `<div class="text-gray-300">${item}</div>`).join("")}
            </div>
        `
            : '<p class="text-sm text-gray-500">Limited information detected. Try uploading clearer photos of labels and covers.</p>'
        }
        ${
          data.notes?.length
            ? `
            <div class="mt-2 pt-2 border-t border-green-500/20">
                <p class="text-xs text-gray-400 mb-1">Additional notes:</p>
                <ul class="text-xs text-gray-500 list-disc list-inside">
                    ${data.notes.map((n) => `<li>${n}</li>`).join("")}
                </ul>
            </div>
        `
            : ""
        }
        ${
          data.identifierStrings?.length
            ? `
            <div class="mt-2 pt-2 border-t border-green-500/20">
                <p class="text-xs text-gray-400 mb-1">Identifiers found:</p>
                <ul class="text-xs text-gray-500 list-disc list-inside">
                    ${data.identifierStrings.map((n) => `<li>${n}</li>`).join("")}
                </ul>
            </div>
        `
            : ""
        }
    `;
  if (typeof feather !== "undefined") feather.replace();
}

function updateDiscogsMatchPanel(match) {
  if (!match?.release) return;

  let panel = document.getElementById("discogsMatchPanel");
  const parent = document.querySelector("#dropZone")?.parentNode;
  if (!parent) return;

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "discogsMatchPanel";
    parent.appendChild(panel);
  }

  const confidenceColor =
    match.confidence === "high"
      ? "text-green-400"
      : match.confidence === "medium"
        ? "text-yellow-400"
        : "text-orange-400";

  const evidenceList = match.evidence?.length
    ? `<ul class="text-xs text-gray-400 list-disc list-inside">
                ${match.evidence.map((item) => `<li>${item}</li>`).join("")}
           </ul>`
    : '<p class="text-xs text-gray-500">No strong identifiers matched. Verify manually.</p>';

  // Build a thumbnail strip from the release images so the user can visually
  // compare the Discogs cover art with the photos they uploaded.
  const releaseImages = match.release.images || [];
  const thumbnailHtml = releaseImages.length
    ? `<div class="mt-2 pt-2 border-t border-blue-500/20">
           <p class="text-xs text-gray-400 mb-1">Compare with Discogs images:</p>
           <div class="flex gap-2 flex-wrap">
               ${releaseImages
                 .slice(0, 4)
                 .map(
                   (img) =>
                     `<img src="${img.uri150 || img.uri}" alt="Discogs release image" class="w-16 h-16 object-cover rounded border border-blue-500/30" loading="lazy" referrerpolicy="no-referrer">`,
                 )
                 .join("")}
           </div>
       </div>`
    : "";

  panel.className =
    "mt-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg";
  panel.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <i data-feather="disc" class="w-4 h-4 ${confidenceColor}"></i>
            <span class="text-sm font-medium ${confidenceColor}">Discogs Match (${match.confidence} confidence)</span>
        </div>
        <div class="text-xs text-gray-400 mb-2">Match score: ${match.score}</div>
        ${evidenceList}
        ${thumbnailHtml}
        <div class="mt-2 pt-2 border-t border-blue-500/20">
            <a href="https://www.discogs.com/release/${match.release.id}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-400 hover:underline">View matched release →</a>
        </div>
    `;
  if (typeof feather !== "undefined") feather.replace();
}

function getUploadedPhotoHints() {
  return uploadedPhotos.flatMap((file) => {
    if (!file?.name) return [];
    return file.name
      .split(/[^a-zA-Z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
  });
}

function mergeReleaseIntoDetection(currentDetection, release) {
  if (!release) return currentDetection || {};

  const artistName = release.artists?.[0]?.name?.replace(/\s*\(\d+\)$/, "") || null;
  const labelName = release.labels?.[0]?.name || null;
  const catalogueNumber =
    release.labels?.[0]?.catno || currentDetection?.catalogueNumber || null;
  const formatName = release.formats?.[0]?.name || null;
  const genre = Array.isArray(release.genres) ? release.genres.join(", ") : release.genres;

  return {
    ...(currentDetection || {}),
    artist: artistName || currentDetection?.artist || null,
    title: release.title || currentDetection?.title || null,
    year: release.year || currentDetection?.year || null,
    label: labelName || currentDetection?.label || null,
    catalogueNumber,
    country: release.country || currentDetection?.country || null,
    format: formatName || currentDetection?.format || null,
    genre: genre || currentDetection?.genre || null,
  };
}

async function applyDiscogsCorrectionFromUrl(url, currentDetection = {}) {
  if (!window.discogsService) {
    showToast("Discogs service is unavailable", "error");
    return;
  }

  // Enrich currentDetection with any OCR-derived window globals so the
  // scoring function has real data even when the AI chat hasn't been
  // explicitly populated yet (e.g. the user pastes a URL straight away).
  const enrichedDetection = {
    label: window.detectedLabel || null,
    country: window.detectedCountry || null,
    format: window.detectedFormat || null,
    genre: window.detectedGenre || null,
    barcode: window.detectedBarcode || null,
    matrixRunoutA: window.detectedMatrixRunoutA || null,
    matrixRunoutB: window.detectedMatrixRunoutB || null,
    pressingInfo: window.detectedPressingInfo || null,
    labelCode: window.detectedLabelCode || null,
    rightsSociety: window.detectedRightsSociety || null,
    pressingPlant: window.detectedPressingPlant || null,
    artist: document.getElementById("artistInput")?.value?.trim() || null,
    title: document.getElementById("titleInput")?.value?.trim() || null,
    catalogueNumber: document.getElementById("catInput")?.value?.trim() || null,
    year: document.getElementById("yearInput")?.value?.trim() || null,
    ...currentDetection,
  };

  const photoHints = getUploadedPhotoHints();
  const match = await window.discogsService.resolveReleaseCorrection(
    url,
    enrichedDetection,
    photoHints,
  );

  if (!match?.release) {
    showToast("Could not verify that Discogs release. Check URL and API credentials.", "warning");
    return;
  }

  window.discogsReleaseId = match.release.id;
  populateFieldsFromDiscogs(match.release);
  updateDiscogsMatchPanel(match);

  const mergedDetection = mergeReleaseIntoDetection(enrichedDetection, match.release);
  populateFieldsFromOCR({ ...mergedDetection, confidence: match.confidence });

  const aiChat = document.getElementById("aiChatBox");
  if (aiChat?.showDetectionResults) {
    aiChat.showDetectionResults({
      ...mergedDetection,
      confidence: match.confidence,
    });
  }

  showToast("Discogs correction applied and detection updated", "success");
}

function renderPhotoGrid() {
  if (uploadedPhotos.length === 0) {
    photoGrid.classList.add("hidden");
    // Revoke all object URLs when clearing grid
    photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    photoObjectUrls = [];
    return;
  }

  // Revoke old object URLs before creating new ones
  photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  photoObjectUrls = [];

  photoGrid.classList.remove("hidden");
  photoGrid.innerHTML = uploadedPhotos
    .map((file, idx) => {
      const objectUrl = URL.createObjectURL(file);
      photoObjectUrls.push(objectUrl);
      return `
        <div class="photo-thumb">
            <img src="${objectUrl}" alt="Photo ${idx + 1}">
            <button class="remove-btn" onclick="removePhoto(${idx})" title="Remove">
                <i data-feather="x" class="w-3 h-3"></i>
            </button>
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function removePhoto(idx) {
  // Also delete from imgBB if hosted
  if (hostedPhotoUrls[idx]) {
    const hosted = hostedPhotoUrls[idx];
    if (hosted.deleteUrl) {
      deleteHostedImage(hosted.deleteUrl);
    }
    hostedPhotoUrls.splice(idx, 1);
  }

  uploadedPhotos.splice(idx, 1);
  renderPhotoGrid();
  updateEmptyState();
}
function updateEmptyState() {
  if (uploadedPhotos.length > 0) {
    // Keep empty state visible until generation
  }
}

// Mock Discogs API integration for tracklist lookup
async function fetchDiscogsData(artist, title, catNo) {
  // In production, this would call the Discogs API
  // For demo, return mock data structure
  return {
    found: false,
    message: "Connect Discogs API for automatic tracklist lookup",
  };
}

// Generate listing analysis
async function generateListing() {
  // Validate form
  if (!validateForm()) {
    showToast("Please fill in the required fields (Artist and Title)", "error");
    return;
  }

  if (uploadedPhotos.length === 0) {
    showToast("Please upload at least one photo", "error");
    return;
  }

  // Set loading state
  setButtonLoading("generateListingBtn", true);
  updateProgressSteps(3);

  try {
    const artist = document.getElementById("artistInput").value.trim();
    const title = document.getElementById("titleInput").value.trim();
    const catNo = document.getElementById("catInput").value.trim();
    const year = document.getElementById("yearInput").value.trim();
    const cost = parseFloat(document.getElementById("costInput").value) || 0;
    const goal = document.getElementById("goalSelect").value;
    const market = document.getElementById("marketSelect").value;

    // Show analysis state
    dropZone.classList.add("analyzing");
    showToast("Analyzing your record...", "info");

    // Simulate analysis delay with progress updates
    await simulateAnalysis();

    dropZone.classList.remove("analyzing");
    performAnalysis({ artist, title, catNo, year, cost, goal, market });

    showToast("Listing generated successfully!", "success");
  } catch (error) {
    console.error("Generation error:", error);
    showToast("Failed to generate listing. Please try again.", "error");
  } finally {
    setButtonLoading("generateListingBtn", false);
  }
}
// performAnalysis function is defined below after checkCollectionImport

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
// Preview/Draft Analysis - quick analysis without full AI generation
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    const htmlOutput = document.getElementById("htmlOutput");
    if (htmlOutput) htmlOutput.value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    const tagsOutput = document.getElementById("tagsOutput");
    if (tagsOutput) {
      tagsOutput.innerHTML = previewTags
        .map(
          (t) => `
                <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
            `,
        )
        .join("");
    }

    // Update shot list
    renderShotList();

    // Show results
    const resultsSection = document.getElementById("resultsSection");
    const emptyState = document.getElementById("emptyState");
    if (resultsSection) resultsSection.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}

const LISTING_PROGRESS_CACHE_KEY = "vinyl_listing_progress_v1";
const LISTING_PROGRESS_FIELD_IDS = [
  "artistInput",
  "titleInput",
  "catInput",
  "yearInput",
  "matrixSideAInput",
  "matrixSideBInput",
  "costInput",
  "daysOwnedInput",
  "vinylConditionInput",
  "sleeveConditionInput",
  "goalSelect",
  "marketSelect",
];

function debounce(callback, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

function collectListingProgress() {
  const fields = {};
  LISTING_PROGRESS_FIELD_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      fields[id] = element.value;
    }
  });

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    fields,
    outputs: {
      titleOptionsHtml:
        document.getElementById("titleOptions")?.innerHTML || "",
      htmlOutput: document.getElementById("htmlOutput")?.value || "",
      tagsOutputHtml: document.getElementById("tagsOutput")?.innerHTML || "",
      pricingStrategyHtml:
        document.getElementById("pricingStrategy")?.innerHTML || "",
      feeFloorHtml: document.getElementById("feeFloor")?.innerHTML || "",
      shotListHtml: document.getElementById("shotList")?.innerHTML || "",
    },
  };
}

function saveListingProgressToCache() {
  const snapshot = collectListingProgress();
  localStorage.setItem(LISTING_PROGRESS_CACHE_KEY, JSON.stringify(snapshot));
}

function restoreListingProgressFromCache() {
  const cached = localStorage.getItem(LISTING_PROGRESS_CACHE_KEY);
  if (!cached) return;

  try {
    const parsed = JSON.parse(cached);
    if (!parsed?.fields) return;

    Object.entries(parsed.fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element && typeof value === "string") {
        element.value = value;
      }
    });

    const outputs = parsed.outputs || {};
    if (outputs.titleOptionsHtml)
      document.getElementById("titleOptions").innerHTML =
        outputs.titleOptionsHtml;
    if (outputs.htmlOutput)
      document.getElementById("htmlOutput").value = outputs.htmlOutput;
    if (outputs.tagsOutputHtml)
      document.getElementById("tagsOutput").innerHTML = outputs.tagsOutputHtml;
    if (outputs.pricingStrategyHtml)
      document.getElementById("pricingStrategy").innerHTML =
        outputs.pricingStrategyHtml;
    if (outputs.feeFloorHtml)
      document.getElementById("feeFloor").innerHTML = outputs.feeFloorHtml;
    if (outputs.shotListHtml)
      document.getElementById("shotList").innerHTML = outputs.shotListHtml;

    const hasGeneratedOutput = Boolean(
      outputs.titleOptionsHtml || outputs.htmlOutput || outputs.tagsOutputHtml,
    );

    if (hasGeneratedOutput) {
      resultsSection?.classList.remove("hidden");
      emptyState?.classList.add("hidden");
      updateProgressSteps(3);
    } else {
      updateProgressSteps(1);
    }

    if (typeof feather !== "undefined") {
      feather.replace();
    }

    showToast("Restored your saved listing progress.", "info");
  } catch (error) {
    console.error("Failed to restore listing progress cache", error);
  }
}

function setupListingProgressAutosave() {
  const debouncedSave = debounce(saveListingProgressToCache, 400);
  LISTING_PROGRESS_FIELD_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("input", debouncedSave);
    element.addEventListener("change", debouncedSave);
  });

  [
    "titleOptions",
    "pricingStrategy",
    "feeFloor",
    "tagsOutput",
    "shotList",
  ].forEach((id) => {
    const target = document.getElementById(id);
    if (!target) return;

    const observer = new MutationObserver(() => debouncedSave());
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  const htmlOutput = document.getElementById("htmlOutput");
  if (htmlOutput) {
    htmlOutput.addEventListener("input", debouncedSave);
  }

  window.addEventListener("beforeunload", () => {
    saveListingProgressToCache();
  });

  restoreListingProgressFromCache();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();
  setupListingProgressAutosave();

  // Attach event listeners to buttons
  const generateBtn = document.getElementById("generateListingBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", generateListing);
  }

  const draftBtn = document.getElementById("draftAnalysisBtn");
  if (draftBtn) {
    draftBtn.addEventListener("click", draftAnalysis);
  }

  const helpBtn = document.getElementById("requestHelpBtn");
  if (helpBtn) {
    helpBtn.addEventListener("click", requestHelp);
  }

  const copyHTMLBtn = document.getElementById("copyHTMLBtn");
  if (copyHTMLBtn) {
    copyHTMLBtn.addEventListener("click", copyHTML);
  }

  const copyTagsBtn = document.getElementById("copyTagsBtn");
  if (copyTagsBtn) {
    copyTagsBtn.addEventListener("click", copyTags);
  }

  const analyzePhotoBtn = document.getElementById("analyzePhotoTypesBtn");
  if (analyzePhotoBtn) {
    analyzePhotoBtn.addEventListener("click", analyzePhotoTypes);
  }

  // Clear Collection Import Banner listeners
  const clearCollectionBtn = document.querySelector("#collectionBanner button");
  if (clearCollectionBtn) {
    clearCollectionBtn.addEventListener("click", clearCollectionImport);
  }

  const aiChat = document.getElementById("aiChatBox");
  if (aiChat) {
    aiChat.addEventListener("discogs-release-correction", async (event) => {
      try {
        const { url, currentDetection } = event.detail || {};
        if (!url) return;
        await applyDiscogsCorrectionFromUrl(url, currentDetection || {});
      } catch (error) {
        console.error("Failed to apply Discogs correction:", error);
        showToast(`Discogs correction failed: ${error.message}`, "error");
      }
    });
  }

  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});
// Collection Import functions (defined here to avoid reference errors)
function clearCollectionImport() {
  sessionStorage.removeItem("collectionListingRecord");
  const banner = document.getElementById("collectionBanner");
  if (banner) {
    banner.classList.add("hidden");
  }
  showToast("Collection import cleared", "success");
}

function checkCollectionImport() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("fromCollection") === "true") {
    const recordData = sessionStorage.getItem("collectionListingRecord");
    if (recordData) {
      const record = JSON.parse(recordData);
      populateFieldsFromCollection(record);
      const banner = document.getElementById("collectionBanner");
      if (banner) {
        banner.classList.remove("hidden");
      }
      const indicator = document.getElementById("collectionDataIndicator");
      if (indicator) {
        indicator.classList.remove("hidden");
      }
    }
  }
}

function populateFieldsFromCollection(record) {
  if (!record) return;

  const fields = {
    artistInput: record.artist,
    titleInput: record.title,
    catInput: record.catalogueNumber || record.matrixNotes,
    yearInput: record.year,
    costInput: record.purchasePrice,
    daysOwnedInput: record.daysOwned,
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field && value) {
      field.value = value;
    }
  });

  // Set conditions if available
  if (record.conditionVinyl) {
    const vinylCondition = document.getElementById("vinylConditionInput");
    if (vinylCondition) vinylCondition.value = record.conditionVinyl;
  }
  if (record.conditionSleeve) {
    const sleeveCondition = document.getElementById("sleeveConditionInput");
    if (sleeveCondition) sleeveCondition.value = record.conditionSleeve;
  }

  showToast(
    `Loaded ${record.artist} - ${record.title} from collection`,
    "success",
  );
}

// Call check on load
checkCollectionImport();

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}
function generateTitles(base, catNo, year, goal) {
  const titles = [];
  const cat = catNo || "CAT#";
  const yr = year || "YEAR";
  const country = window.detectedCountry || "UK";
  const genre = window.detectedGenre || "Rock";
  const format = window.detectedFormat?.includes('7"')
    ? '7"'
    : window.detectedFormat?.includes('12"')
      ? '12"'
      : "LP";

  // Option 1: Classic collector focus
  titles.push(`${base} ${format} ${yr} ${country} 1st Press ${cat} EX/VG+`);

  // Option 2: Condition forward
  titles.push(`NM! ${base} Original ${yr} Vinyl ${format} ${cat} Nice Copy`);

  // Option 3: Rarity/hype with detected genre
  titles.push(
    `${base} ${yr} ${country} Press ${cat} Rare Vintage ${genre} ${format}`,
  );

  // Option 4: Clean searchable
  titles.push(`${base} Vinyl ${format} ${yr} ${cat} Excellent Condition`);

  // Option 5: Genre tagged
  titles.push(`${base} ${yr} ${format} ${genre} ${cat} VG+ Plays Great`);
  return titles.map((t, i) => ({
    text: t.length > 80 ? t.substring(0, 77) + "..." : t,
    chars: Math.min(t.length, 80),
    style: [
      "Classic Collector",
      "Condition Forward",
      "Rarity Focus",
      "Clean Search",
      "Genre Tagged",
    ][i],
  }));
}

function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    document.getElementById("htmlOutput").value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    document.getElementById("tagsOutput").innerHTML = previewTags
      .map(
        (t) => `
            <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
        `,
      )
      .join("");

    // Update shot list
    renderShotList();

    // Show results
    resultsSection.classList.remove("hidden");
    emptyState.classList.add("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});
function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
// Preview/Draft Analysis - quick analysis without full AI generation
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    const htmlOutput = document.getElementById("htmlOutput");
    if (htmlOutput) htmlOutput.value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    const tagsOutput = document.getElementById("tagsOutput");
    if (tagsOutput) {
      tagsOutput.innerHTML = previewTags
        .map(
          (t) => `
                <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
            `,
        )
        .join("");
    }

    // Update shot list
    renderShotList();

    // Show results
    const resultsSection = document.getElementById("resultsSection");
    const emptyState = document.getElementById("emptyState");
    if (resultsSection) resultsSection.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}
function generateTitles(base, catNo, year, goal) {
  const titles = [];
  const cat = catNo || "CAT#";
  const yr = year || "YEAR";
  const country = window.detectedCountry || "UK";
  const genre = window.detectedGenre || "Rock";
  const format = window.detectedFormat?.includes('7"')
    ? '7"'
    : window.detectedFormat?.includes('12"')
      ? '12"'
      : "LP";

  // Option 1: Classic collector focus
  titles.push(`${base} ${format} ${yr} ${country} 1st Press ${cat} EX/VG+`);

  // Option 2: Condition forward
  titles.push(`NM! ${base} Original ${yr} Vinyl ${format} ${cat} Nice Copy`);

  // Option 3: Rarity/hype with detected genre
  titles.push(
    `${base} ${yr} ${country} Press ${cat} Rare Vintage ${genre} ${format}`,
  );

  // Option 4: Clean searchable
  titles.push(`${base} Vinyl ${format} ${yr} ${cat} Excellent Condition`);

  // Option 5: Genre tagged
  titles.push(`${base} ${yr} ${format} ${genre} ${cat} VG+ Plays Great`);
  return titles.map((t, i) => ({
    text: t.length > 80 ? t.substring(0, 77) + "..." : t,
    chars: Math.min(t.length, 80),
    style: [
      "Classic Collector",
      "Condition Forward",
      "Rarity Focus",
      "Clean Search",
      "Genre Tagged",
    ][i],
  }));
}

function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    document.getElementById("htmlOutput").value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    document.getElementById("tagsOutput").innerHTML = previewTags
      .map(
        (t) => `
            <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
        `,
      )
      .join("");

    // Update shot list
    renderShotList();

    // Show results
    resultsSection.classList.remove("hidden");
    emptyState.classList.add("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}

function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
// Preview/Draft Analysis - quick analysis without full AI generation
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    const htmlOutput = document.getElementById("htmlOutput");
    if (htmlOutput) htmlOutput.value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    const tagsOutput = document.getElementById("tagsOutput");
    if (tagsOutput) {
      tagsOutput.innerHTML = previewTags
        .map(
          (t) => `
                <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
            `,
        )
        .join("");
    }

    // Update shot list
    renderShotList();

    // Show results
    const resultsSection = document.getElementById("resultsSection");
    const emptyState = document.getElementById("emptyState");
    if (resultsSection) resultsSection.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();

  // Attach event listeners to buttons
  const generateBtn = document.getElementById("generateListingBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", generateListing);
  }

  const draftBtn = document.getElementById("draftAnalysisBtn");
  if (draftBtn) {
    draftBtn.addEventListener("click", draftAnalysis);
  }

  const helpBtn = document.getElementById("requestHelpBtn");
  if (helpBtn) {
    helpBtn.addEventListener("click", requestHelp);
  }

  const copyHTMLBtn = document.getElementById("copyHTMLBtn");
  if (copyHTMLBtn) {
    copyHTMLBtn.addEventListener("click", copyHTML);
  }

  const copyTagsBtn = document.getElementById("copyTagsBtn");
  if (copyTagsBtn) {
    copyTagsBtn.addEventListener("click", copyTags);
  }

  const analyzePhotoBtn = document.getElementById("analyzePhotoTypesBtn");
  if (analyzePhotoBtn) {
    analyzePhotoBtn.addEventListener("click", analyzePhotoTypes);
  }

  // Clear Collection Import Banner listeners
  const clearCollectionBtn = document.querySelector("#collectionBanner button");
  if (clearCollectionBtn) {
    clearCollectionBtn.addEventListener("click", clearCollectionImport);
  }


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});
// Collection Import functions (defined here to avoid reference errors)
function clearCollectionImport() {
  sessionStorage.removeItem("collectionListingRecord");
  const banner = document.getElementById("collectionBanner");
  if (banner) {
    banner.classList.add("hidden");
  }
  showToast("Collection import cleared", "success");
}

function checkCollectionImport() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("fromCollection") === "true") {
    const recordData = sessionStorage.getItem("collectionListingRecord");
    if (recordData) {
      const record = JSON.parse(recordData);
      populateFieldsFromCollection(record);
      const banner = document.getElementById("collectionBanner");
      if (banner) {
        banner.classList.remove("hidden");
      }
      const indicator = document.getElementById("collectionDataIndicator");
      if (indicator) {
        indicator.classList.remove("hidden");
      }
    }
  }
}

function populateFieldsFromCollection(record) {
  if (!record) return;

  const fields = {
    artistInput: record.artist,
    titleInput: record.title,
    catInput: record.catalogueNumber || record.matrixNotes,
    yearInput: record.year,
    costInput: record.purchasePrice,
    daysOwnedInput: record.daysOwned,
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field && value) {
      field.value = value;
    }
  });

  // Set conditions if available
  if (record.conditionVinyl) {
    const vinylCondition = document.getElementById("vinylConditionInput");
    if (vinylCondition) vinylCondition.value = record.conditionVinyl;
  }
  if (record.conditionSleeve) {
    const sleeveCondition = document.getElementById("sleeveConditionInput");
    if (sleeveCondition) sleeveCondition.value = record.conditionSleeve;
  }

  showToast(
    `Loaded ${record.artist} - ${record.title} from collection`,
    "success",
  );
}

// Call check on load
checkCollectionImport();

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}
function generateTitles(base, catNo, year, goal) {
  const titles = [];
  const cat = catNo || "CAT#";
  const yr = year || "YEAR";
  const country = window.detectedCountry || "UK";
  const genre = window.detectedGenre || "Rock";
  const format = window.detectedFormat?.includes('7"')
    ? '7"'
    : window.detectedFormat?.includes('12"')
      ? '12"'
      : "LP";

  // Option 1: Classic collector focus
  titles.push(`${base} ${format} ${yr} ${country} 1st Press ${cat} EX/VG+`);

  // Option 2: Condition forward
  titles.push(`NM! ${base} Original ${yr} Vinyl ${format} ${cat} Nice Copy`);

  // Option 3: Rarity/hype with detected genre
  titles.push(
    `${base} ${yr} ${country} Press ${cat} Rare Vintage ${genre} ${format}`,
  );

  // Option 4: Clean searchable
  titles.push(`${base} Vinyl ${format} ${yr} ${cat} Excellent Condition`);

  // Option 5: Genre tagged
  titles.push(`${base} ${yr} ${format} ${genre} ${cat} VG+ Plays Great`);
  return titles.map((t, i) => ({
    text: t.length > 80 ? t.substring(0, 77) + "..." : t,
    chars: Math.min(t.length, 80),
    style: [
      "Classic Collector",
      "Condition Forward",
      "Rarity Focus",
      "Clean Search",
      "Genre Tagged",
    ][i],
  }));
}

function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    document.getElementById("htmlOutput").value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    document.getElementById("tagsOutput").innerHTML = previewTags
      .map(
        (t) => `
            <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
        `,
      )
      .join("");

    // Update shot list
    renderShotList();

    // Show results
    resultsSection.classList.remove("hidden");
    emptyState.classList.add("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}

function generateTitles(base, catNo, year, goal) {
  const titles = [];
  const cat = catNo || "CAT#";
  const yr = year || "YEAR";
  const country = window.detectedCountry || "UK";
  const genre = window.detectedGenre || "Rock";
  const format = window.detectedFormat?.includes('7"')
    ? '7"'
    : window.detectedFormat?.includes('12"')
      ? '12"'
      : "LP";

  // Option 1: Classic collector focus
  titles.push(`${base} ${format} ${yr} ${country} 1st Press ${cat} EX/VG+`);

  // Option 2: Condition forward
  titles.push(`NM! ${base} Original ${yr} Vinyl ${format} ${cat} Nice Copy`);

  // Option 3: Rarity/hype with detected genre
  titles.push(
    `${base} ${yr} ${country} Press ${cat} Rare Vintage ${genre} ${format}`,
  );

  // Option 4: Clean searchable
  titles.push(`${base} Vinyl ${format} ${yr} ${cat} Excellent Condition`);

  // Option 5: Genre tagged
  titles.push(`${base} ${yr} ${format} ${genre} ${cat} VG+ Plays Great`);

  return titles.map((t, i) => ({
    text: t.length > 80 ? t.substring(0, 77) + "..." : t,
    chars: Math.min(t.length, 80),
    style: [
      "Classic Collector",
      "Condition Forward",
      "Rarity Focus",
      "Clean Search",
      "Genre Tagged",
    ][i],
  }));
}
function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
// Preview/Draft Analysis - quick analysis without full AI generation
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    const htmlOutput = document.getElementById("htmlOutput");
    if (htmlOutput) htmlOutput.value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    const tagsOutput = document.getElementById("tagsOutput");
    if (tagsOutput) {
      tagsOutput.innerHTML = previewTags
        .map(
          (t) => `
                <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
            `,
        )
        .join("");
    }

    // Update shot list
    renderShotList();

    // Show results
    const resultsSection = document.getElementById("resultsSection");
    const emptyState = document.getElementById("emptyState");
    if (resultsSection) resultsSection.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});

async function performAnalysis(data) {
  const { artist, title, catNo, year, cost, goal, market } = data;

  // Determine currency symbol
  const currency = market === "uk" ? "£" : market === "us" ? "$" : "€";

  // Mock comp research results
  const comps = {
    nm: { low: 45, high: 65, median: 52 },
    vgplus: { low: 28, high: 42, median: 34 },
    vg: { low: 15, high: 25, median: 19 },
  };

  // Calculate recommended price based on goal
  let recommendedBin, strategy;
  switch (goal) {
    case "quick":
      recommendedBin = Math.round(comps.vgplus.low * 0.9);
      strategy = "BIN + Best Offer (aggressive)";
      break;
    case "max":
      recommendedBin = Math.round(comps.nm.high * 1.1);
      strategy = "BIN only, no offers, long duration";
      break;
    default:
      recommendedBin = comps.vgplus.median;
      strategy = "BIN + Best Offer (standard)";
  }

  // Fee calculation (eBay UK approx)
  const ebayFeeRate = 0.13; // 13% final value fee
  const paypalRate = 0.029; // 2.9% + 30p
  const fixedFee = 0.3;
  const shippingCost = 4.5; // Estimated
  const packingCost = 1.5;

  const totalFees =
    recommendedBin * ebayFeeRate + recommendedBin * paypalRate + fixedFee;
  const breakEven = cost + totalFees + shippingCost + packingCost;
  const safeFloor = Math.ceil(breakEven * 1.05); // 5% buffer

  // Generate titles
  const baseTitle = `${artist || "ARTIST"} - ${title || "TITLE"}`;
  const titles = generateTitles(baseTitle, catNo, year, goal);

  // Render results
  renderTitleOptions(titles);
  renderPricingStrategy(recommendedBin, strategy, comps, currency, goal);
  renderFeeFloor(
    cost,
    totalFees,
    shippingCost,
    packingCost,
    safeFloor,
    currency,
  );
  await renderHTMLDescription(data, titles[0]);
  renderTags(artist, title, catNo, year);
  renderShotList();

  // Show results
  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });

  currentAnalysis = {
    titles,
    recommendedBin,
    strategy,
    breakEven,
    safeFloor,
    currency,
  };
}
function generateTitles(base, catNo, year, goal) {
  const titles = [];
  const cat = catNo || "CAT#";
  const yr = year || "YEAR";
  const country = window.detectedCountry || "UK";
  const genre = window.detectedGenre || "Rock";
  const format = window.detectedFormat?.includes('7"')
    ? '7"'
    : window.detectedFormat?.includes('12"')
      ? '12"'
      : "LP";

  // Option 1: Classic collector focus
  titles.push(`${base} ${format} ${yr} ${country} 1st Press ${cat} EX/VG+`);

  // Option 2: Condition forward
  titles.push(`NM! ${base} Original ${yr} Vinyl ${format} ${cat} Nice Copy`);

  // Option 3: Rarity/hype with detected genre
  titles.push(
    `${base} ${yr} ${country} Press ${cat} Rare Vintage ${genre} ${format}`,
  );

  // Option 4: Clean searchable
  titles.push(`${base} Vinyl ${format} ${yr} ${cat} Excellent Condition`);

  // Option 5: Genre tagged
  titles.push(`${base} ${yr} ${format} ${genre} ${cat} VG+ Plays Great`);
  return titles.map((t, i) => ({
    text: t.length > 80 ? t.substring(0, 77) + "..." : t,
    chars: Math.min(t.length, 80),
    style: [
      "Classic Collector",
      "Condition Forward",
      "Rarity Focus",
      "Clean Search",
      "Genre Tagged",
    ][i],
  }));
}

function renderTitleOptions(titles) {
  const container = document.getElementById("titleOptions");
  container.innerHTML = titles
    .map(
      (t, i) => `
        <div class="title-option ${i === 0 ? "selected" : ""}" onclick="selectTitle(this, '${t.text.replace(/'/g, "\\'")}')">
            <span class="char-count">${t.chars}/80</span>
            <p class="font-medium text-gray-200 pr-16">${t.text}</p>
            <p class="text-sm text-gray-500 mt-1">${t.style}</p>
        </div>
    `,
    )
    .join("");
}

function selectTitle(el, text) {
  document
    .querySelectorAll(".title-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  // Update clipboard copy
  navigator.clipboard.writeText(text);
  showToast("Title copied to clipboard!", "success");
}

function renderPricingStrategy(bin, strategy, comps, currency, goal) {
  const container = document.getElementById("pricingStrategy");

  const offerSettings =
    goal === "max"
      ? "Offers: OFF"
      : `Auto-accept: ${currency}${Math.floor(bin * 0.85)} | Auto-decline: ${currency}${Math.floor(bin * 0.7)}`;

  container.innerHTML = `
        <div class="pricing-card recommended">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">RECOMMENDED</span>
            </div>
            <p class="text-3xl font-bold text-white mb-1">${currency}${bin}</p>
            <p class="text-sm text-gray-400 mb-3">Buy It Now</p>
            <div class="space-y-2 text-sm">
                <p class="flex justify-between"><span class="text-gray-500">Strategy:</span> <span class="text-gray-300">${strategy}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Best Offer:</span> <span class="text-gray-300">${offerSettings}</span></p>
                <p class="flex justify-between"><span class="text-gray-500">Duration:</span> <span class="text-gray-300">30 days (GTC)</span></p>
            </div>
        </div>
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Sold Comps by Grade</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-green-400 font-medium">NM/NM-</span>
                    <span class="text-gray-300">${currency}${comps.nm.low}-${comps.nm.high} <span class="text-gray-500">(med: ${comps.nm.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg border border-accent/30">
                    <span class="text-accent font-medium">VG+/EX</span>
                    <span class="text-gray-300">${currency}${comps.vgplus.low}-${comps.vgplus.high} <span class="text-gray-500">(med: ${comps.vgplus.median})</span></span>
                </div>
                <div class="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span class="text-yellow-400 font-medium">VG/VG+</span>
                    <span class="text-gray-300">${currency}${comps.vg.low}-${comps.vg.high} <span class="text-gray-500">(med: ${comps.vg.median})</span></span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Based on last 90 days sold listings, same pressing. Prices exclude postage.</p>
        </div>
    `;
}

function renderFeeFloor(cost, fees, shipping, packing, safeFloor, currency) {
  const container = document.getElementById("feeFloor");
  container.innerHTML = `
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
            <p class="text-xl font-bold text-gray-300">${currency}${cost.toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
            <p class="text-xl font-bold text-red-400">${currency}${fees.toFixed(2)}</p>
            <p class="text-xs text-gray-600">~16% total</p>
        </div>
        <div class="text-center p-4 bg-surface rounded-lg">
            <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
            <p class="text-xl font-bold text-gray-300">${currency}${(shipping + packing).toFixed(2)}</p>
        </div>
        <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p class="text-xs text-green-500 uppercase mb-1">Safe Floor Price</p>
            <p class="text-2xl font-bold text-green-400">${currency}${safeFloor}</p>
            <p class="text-xs text-green-600/70">Auto-decline below this</p>
        </div>
    `;
}
async function renderHTMLDescription(data, titleObj) {
  const { artist, title, catNo, year } = data;
  // Use hosted URL if available, otherwise fallback to local object URL
  let heroImg = "";
  let galleryImages = [];

  if (hostedPhotoUrls.length > 0) {
    heroImg = hostedPhotoUrls[0].displayUrl || hostedPhotoUrls[0].url;
    galleryImages = hostedPhotoUrls
      .slice(1)
      .map((img) => img.displayUrl || img.url);
  } else if (uploadedPhotos.length > 0) {
    heroImg = URL.createObjectURL(uploadedPhotos[0]);
    galleryImages = uploadedPhotos
      .slice(1)
      .map((_, i) => URL.createObjectURL(uploadedPhotos[i + 1]));
  }

  // Use OCR-detected values if available
  const detectedLabel = window.detectedLabel || "[Verify from photos]";
  const detectedCountry = window.detectedCountry || "UK";
  const detectedFormat = window.detectedFormat || "LP • 33rpm";
  const detectedGenre = window.detectedGenre || "rock";
  const detectedCondition = window.detectedCondition || "VG+/VG+";
  const detectedPressingInfo = window.detectedPressingInfo || "";

  // Fetch tracklist and detailed info from Discogs if available
  let tracklistHtml = "";
  let pressingDetailsHtml = "";
  let provenanceHtml = "";

  if (window.discogsReleaseId && window.discogsService?.key) {
    try {
      const discogsData = await window.discogsService.fetchTracklist(
        window.discogsReleaseId,
      );
      if (discogsData && discogsData.tracklist) {
        // Build tracklist HTML
        const hasSideBreakdown = discogsData.tracklist.some(
          (t) =>
            t.position &&
            (t.position.startsWith("A") || t.position.startsWith("B")),
        );

        if (hasSideBreakdown) {
          // Group by sides
          const sides = {};
          discogsData.tracklist.forEach((track) => {
            const side = track.position ? track.position.charAt(0) : "Other";
            if (!sides[side]) sides[side] = [];
            sides[side].push(track);
          });

          tracklistHtml = Object.entries(sides)
            .map(
              ([side, tracks]) => `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Side ${side}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${tracks
                                  .map(
                                    (track) => `
                                    <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <span style="color: #1e293b; font-size: 13px;"><strong>${track.position}</strong> ${track.title}</span>
                                        ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `,
            )
            .join("");
        } else {
          // Simple list
          tracklistHtml = `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${discogsData.tracklist
                              .map(
                                (track) => `
                                <div style="flex: 1 1 200px; min-width: 200px; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <span style="color: #1e293b; font-size: 13px;">${track.position ? `<strong>${track.position}</strong> ` : ""}${track.title}</span>
                                    ${track.duration ? `<span style="color: #64748b; font-size: 12px; font-family: monospace;">${track.duration}</span>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }

        // Build pressing/variation details
        const identifiers = discogsData.identifiers || [];
        const barcodeInfo = identifiers.find((i) => i.type === "Barcode");
        const matrixInfo = identifiers.filter(
          (i) => i.type === "Matrix / Runout" || i.type === "Runout",
        );
        const pressingInfo = identifiers.filter(
          (i) => i.type === "Pressing Plant" || i.type === "Mastering",
        );

        if (matrixInfo.length > 0 || barcodeInfo || pressingInfo.length > 0) {
          pressingDetailsHtml = `
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 600;">Pressing & Matrix Information</h3>
                            <div style="font-family: monospace; font-size: 13px; line-height: 1.6; color: #15803d;">
                                ${barcodeInfo ? `<p style="margin: 4px 0;"><strong>Barcode:</strong> ${barcodeInfo.value}</p>` : ""}
                                ${matrixInfo.map((m) => `<p style="margin: 4px 0;"><strong>${m.type}:</strong> ${m.value}${m.description ? ` <em>(${m.description})</em>` : ""}</p>`).join("")}
                                ${pressingInfo.map((p) => `<p style="margin: 4px 0;"><strong>${p.type}:</strong> ${p.value}</p>`).join("")}
                            </div>
                            ${discogsData.notes ? `<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0; font-size: 12px; color: #166534; font-style: italic;">${discogsData.notes.substring(0, 300)}${discogsData.notes.length > 300 ? "..." : ""}</p>` : ""}
                        </div>
                    `;
        }

        // Build provenance data for buyer confidence
        const companies = discogsData.companies || [];
        const masteredBy = companies.find(
          (c) =>
            c.entity_type_name === "Mastered At" ||
            c.name.toLowerCase().includes("mastering"),
        );
        const pressedBy = companies.find(
          (c) =>
            c.entity_type_name === "Pressed By" ||
            c.name.toLowerCase().includes("pressing"),
        );
        const lacquerCut = companies.find(
          (c) => c.entity_type_name === "Lacquer Cut At",
        );

        if (masteredBy || pressedBy || lacquerCut) {
          provenanceHtml = `
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Provenance & Production
                            </h3>
                            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                ${masteredBy ? `<p style="margin: 4px 0;">✓ Mastered at <strong>${masteredBy.name}</strong></p>` : ""}
                                ${lacquerCut ? `<p style="margin: 4px 0;">✓ Lacquer cut at <strong>${lacquerCut.name}</strong></p>` : ""}
                                ${pressedBy ? `<p style="margin: 4px 0;">✓ Pressed at <strong>${pressedBy.name}</strong></p>` : ""}
                                ${discogsData.num_for_sale ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #bfdbfe; color: #3b82f6; font-size: 12px;">Reference: ${discogsData.num_for_sale} copies currently for sale on Discogs</p>` : ""}
                            </div>
                        </div>
                    `;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Discogs details for HTML:", e);
    }
  }

  // If no tracklist from Discogs, provide placeholder
  if (!tracklistHtml) {
    tracklistHtml = `<p style="color: #64748b; font-style: italic;">Tracklist verification recommended. Please compare with Discogs entry for accuracy.</p>`;
  }
  const galleryHtml =
    galleryImages.length > 0
      ? `
  <!-- PHOTO GALLERY -->
  <div style="margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${galleryImages.map((url) => `<img src="${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Record photo">`).join("")}
    </div>
  </div>
`
      : "";

  const html = `<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- HERO IMAGE -->
  <div style="margin-bottom: 24px;">
    <img src="${heroImg}" alt="${artist} - ${title}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  </div>
  
  ${galleryHtml}
<!-- BADGES -->
  <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px;">
    <span style="background: #7c3aed; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Original ${detectedCountry} Pressing</span>
    <span style="background: #059669; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${year || "1970s"}</span>
    <span style="background: #0891b2; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedFormat}</span>
    <span style="background: #d97706; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${detectedCondition}</span>
  </div>
<!-- AT A GLANCE -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Artist</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${artist || "See title"}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Title</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${title || "See title"}</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Label</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedLabel}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Catalogue</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${catNo || "[See photos]"}</code></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Country</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${detectedCountry}</td>
    </tr>
<tr>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600;">Year</td>
      <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">${year || "[Verify]"}</td>
    </tr>
  </table>

  <!-- CONDITION -->
  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">Condition Report</h3>
    <div style="display: grid; gap: 12px;">
      <div>
        <strong style="color: #713f12;">Vinyl:</strong> <span style="color: #854d0e;">VG+ — Light surface marks, plays cleanly with minimal surface noise. No skips or jumps. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Sleeve:</strong> <span style="color: #854d0e;">VG+ — Minor edge wear, light ring wear visible under raking light. No splits or writing. [Adjust based on actual inspection]</span>
      </div>
      <div>
        <strong style="color: #713f12;">Inner Sleeve:</strong> <span style="color: #854d0e;">Original paper inner included, small split at bottom seam. [Verify/Adjust]</span>
      </div>
    </div>
  </div>
  <!-- ABOUT -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">About This Release</h3>
  <p style="margin-bottom: 16px; color: #475569;">${detectedGenre ? `${detectedGenre.charAt(0).toUpperCase() + detectedGenre.slice(1)} release` : "Vintage vinyl release"}${detectedPressingInfo ? `. Matrix/Runout: ${detectedPressingInfo}` : ""}. [Add accurate description based on verified pressing details. Mention notable features: gatefold, insert, poster, hype sticker, etc.]</p>
<!-- TRACKLIST -->
  <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Tracklist</h3>
  <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
    ${tracklistHtml}
  </div>
  
  ${pressingDetailsHtml}
  
  ${provenanceHtml}
<!-- PACKING -->
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Packing & Postage</h3>
    <p style="margin: 0 0 12px 0; color: #1e3a8a;">Records are removed from outer sleeves to prevent seam splits during transit. Packed with stiffeners in a dedicated LP mailer. Royal Mail 48 Tracked or courier service.</p>
    <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Combined postage:</strong> Discount available for multiple purchases—please request invoice before payment.</p>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px;">
    <p style="margin: 0 0 8px 0; color: #475569; font-weight: 500;">Questions? Need more photos?</p>
    <p style="margin: 0; color: #64748b; font-size: 14px;">Message me anytime—happy to provide additional angles, audio clips, or pressing details.</p>
  </div>

</div>`;

  // Store reference to hosted images for potential cleanup
  window.currentListingImages = hostedPhotoUrls.map((img) => ({
    url: img.url,
    deleteUrl: img.deleteUrl,
  }));
  document.getElementById("htmlOutput").value = html;
}
function renderTags(artist, title, catNo, year) {
  const genre = window.detectedGenre || "rock";
  const format = window.detectedFormat?.toLowerCase().includes('7"')
    ? "7 inch"
    : window.detectedFormat?.toLowerCase().includes('12"')
      ? "12 inch single"
      : "lp";
  const country = window.detectedCountry?.toLowerCase() || "uk";

  const tags = [
    artist || "vinyl",
    title || "record",
    format,
    "vinyl record",
    "original pressing",
    `${country} pressing`,
    year || "vintage",
    catNo || "",
    genre,
    genre === "rock" ? "prog rock" : genre,
    genre === "rock" ? "psych" : "",
    "collector",
    "audiophile",
    format === "lp" ? "12 inch" : format,
    "33 rpm",
    format === "lp" ? "album" : "single",
    "used vinyl",
    "graded",
    "excellent condition",
    "rare vinyl",
    "classic rock",
    "vintage vinyl",
    "record collection",
    "music",
    "audio",
    window.detectedLabel || "",
  ].filter(Boolean);
  const container = document.getElementById("tagsOutput");
  container.innerHTML = tags
    .map(
      (t) => `
        <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
    `,
    )
    .join("");
}
function renderShotList() {
  // Map shot types to display info
  const shotDefinitions = [
    { id: "front", name: "Front cover (square, well-lit)", critical: true },
    { id: "back", name: "Back cover (full shot)", critical: true },
    { id: "spine", name: "Spine (readable text)", critical: true },
    { id: "label_a", name: "Label Side A (close, legible)", critical: true },
    { id: "label_b", name: "Label Side B (close, legible)", critical: true },
    { id: "deadwax", name: "Deadwax/runout grooves", critical: true },
    { id: "inner", name: "Inner sleeve (both sides)", critical: false },
    { id: "insert", name: "Insert/poster if included", critical: false },
    { id: "hype", name: "Hype sticker (if present)", critical: false },
    { id: "vinyl", name: "Vinyl in raking light (flaws)", critical: true },
    { id: "corners", name: "Sleeve corners/edges detail", critical: false },
    { id: "barcode", name: "Barcode area", critical: false },
  ];

  // Check if we have any photos at all
  const hasPhotos = uploadedPhotos.length > 0;

  const container = document.getElementById("shotList");
  container.innerHTML = shotDefinitions
    .map((shot) => {
      const have =
        detectedPhotoTypes.has(shot.id) ||
        (shot.id === "front" && hasPhotos) ||
        (shot.id === "back" && uploadedPhotos.length > 1);
      const statusClass = have ? "completed" : shot.critical ? "missing" : "";
      const iconColor = have
        ? "text-green-500"
        : shot.critical
          ? "text-yellow-500"
          : "text-gray-500";
      const textClass = have ? "text-gray-400 line-through" : "text-gray-300";
      const icon = have
        ? "check-circle"
        : shot.critical
          ? "alert-circle"
          : "circle";

      return `
        <div class="shot-item ${statusClass}">
            <i data-feather="${icon}" 
               class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
            <span class="text-sm ${textClass}">${shot.name}</span>
            ${shot.critical && !have ? '<span class="ml-auto text-xs text-yellow-500 font-medium">CRITICAL</span>' : ""}
        </div>
    `;
    })
    .join("");
  if (typeof feather !== "undefined") feather.replace();
}
function copyHTML() {
  const html = document.getElementById("htmlOutput");
  html.select();
  document.execCommand("copy");
  showToast("HTML copied to clipboard!", "success");
}

function copyTags() {
  const tags = Array.from(document.querySelectorAll("#tagsOutput span"))
    .map((s) => s.textContent)
    .join(", ");
  navigator.clipboard.writeText(tags);
  showToast("Tags copied to clipboard!", "success");
}
async function draftAnalysis() {
  if (uploadedPhotos.length === 0) {
    showToast("Upload photos first for preview", "error");
    return;
  }

  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();

  // Show loading state
  const dropZone = document.getElementById("dropZone");
  const spinner = document.getElementById("uploadSpinner");
  spinner.classList.remove("hidden");
  dropZone.classList.add("pointer-events-none");
  startAnalysisProgressSimulation();

  try {
    // Try OCR/AI analysis if available
    const service = getAIService();
    let ocrResult = null;

    if (service && service.apiKey && uploadedPhotos.length > 0) {
      try {
        ocrResult = await service.analyzeRecordImages(
          uploadedPhotos.slice(0, 2),
        ); // Limit to 2 photos for speed
        populateFieldsFromOCR(ocrResult);
      } catch (e) {
        console.log("Preview OCR failed:", e);
      }
    }

    // Generate quick preview results
    const catNo =
      document.getElementById("catInput").value.trim() ||
      ocrResult?.catalogueNumber ||
      "";
    const year =
      document.getElementById("yearInput").value.trim() ||
      ocrResult?.year ||
      "";
    const detectedArtist = artist || ocrResult?.artist || "Unknown Artist";
    const detectedTitle = title || ocrResult?.title || "Unknown Title";

    const baseTitle = `${detectedArtist} - ${detectedTitle}`;

    // Generate quick titles
    const quickTitles = [
      `${baseTitle} ${year ? `(${year})` : ""} ${catNo} VG+`.substring(0, 80),
      `${baseTitle} Original Pressing Vinyl LP`.substring(0, 80),
      `${detectedArtist} ${detectedTitle} ${catNo || "LP"}`.substring(0, 80),
    ].map((t, i) => ({
      text: t,
      chars: t.length,
      style: ["Quick", "Standard", "Compact"][i],
    }));

    // Quick pricing estimate based on condition
    const cost = parseFloat(document.getElementById("costInput").value) || 10;
    const vinylCond = document.getElementById("vinylConditionInput").value;
    const sleeveCond = document.getElementById("sleeveConditionInput").value;

    const conditionMultipliers = {
      M: 3,
      NM: 2.5,
      "VG+": 1.8,
      VG: 1.2,
      "G+": 0.8,
      G: 0.5,
    };
    const condMult =
      (conditionMultipliers[vinylCond] || 1) * 0.7 +
      (conditionMultipliers[sleeveCond] || 1) * 0.3;

    const estimatedValue = Math.round(cost * Math.max(condMult, 1.5));
    const suggestedPrice = Math.round(estimatedValue * 0.9);

    // Render preview results
    renderTitleOptions(quickTitles);

    // Quick pricing card
    document.getElementById("pricingStrategy").innerHTML = `
            <div class="pricing-card recommended">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">QUICK ESTIMATE</span>
                </div>
                <p class="text-3xl font-bold text-white mb-1">£${suggestedPrice}</p>
                <p class="text-sm text-gray-400 mb-3">Suggested Buy It Now</p>
                <div class="space-y-2 text-sm">
                    <p class="flex justify-between"><span class="text-gray-500">Est. Value:</span> <span class="text-gray-300">£${estimatedValue}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Your Cost:</span> <span class="text-gray-300">£${cost.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span class="text-gray-500">Condition:</span> <span class="text-gray-300">${vinylCond}/${sleeveCond}</span></p>
                </div>
            </div>
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview Notes</h4>
                <div class="p-3 bg-surface rounded-lg text-sm text-gray-400">
                    ${
                      ocrResult
                        ? `<p class="text-green-400 mb-2">✓ AI detected information from photos</p>`
                        : `<p class="text-yellow-400 mb-2">⚠ Add API key in Settings for auto-detection</p>`
                    }
                    <p>This is a quick estimate based on your cost and condition. Run "Generate Full Listing" for complete market analysis, sold comps, and optimized pricing.</p>
                </div>
                ${
                  ocrResult
                    ? `
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p class="text-xs text-green-400 font-medium mb-1">Detected from photos:</p>
                        <ul class="text-xs text-gray-400 space-y-1">
                            ${ocrResult.artist ? `<li>• Artist: ${ocrResult.artist}</li>` : ""}
                            ${ocrResult.title ? `<li>• Title: ${ocrResult.title}</li>` : ""}
                            ${ocrResult.catalogueNumber ? `<li>• Cat#: ${ocrResult.catalogueNumber}</li>` : ""}
                            ${ocrResult.year ? `<li>• Year: ${ocrResult.year}</li>` : ""}
                        </ul>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Simple fee floor
    const fees = suggestedPrice * 0.16;
    const safeFloor = Math.ceil(cost + fees + 6);

    document.getElementById("feeFloor").innerHTML = `
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Your Cost</p>
                <p class="text-xl font-bold text-gray-300">£${cost.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Est. Fees</p>
                <p class="text-xl font-bold text-red-400">£${fees.toFixed(2)}</p>
            </div>
            <div class="text-center p-4 bg-surface rounded-lg">
                <p class="text-xs text-gray-500 uppercase mb-1">Ship + Pack</p>
                <p class="text-xl font-bold text-gray-300">£6.00</p>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p class="text-xs text-green-500 uppercase mb-1">Safe Floor</p>
                <p class="text-2xl font-bold text-green-400">£${safeFloor}</p>
            </div>
        `;

    // Preview HTML description
    const previewHtml = `<!-- QUICK PREVIEW - Generated by VinylVault Pro -->
<div style="max-width: 700px; margin: 0 auto; font-family: sans-serif;">
    <h2 style="color: #333;">${detectedArtist} - ${detectedTitle}</h2>
    ${year ? `<p><strong>Year:</strong> ${year}</p>` : ""}
    ${catNo ? `<p><strong>Catalogue #:</strong> ${catNo}</p>` : ""}
    <p><strong>Condition:</strong> Vinyl ${vinylCond}, Sleeve ${sleeveCond}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #666;">[Full description will be generated with complete market analysis]</p>
</div>`;

    document.getElementById("htmlOutput").value = previewHtml;

    // Preview tags
    const previewTags = [
      detectedArtist,
      detectedTitle,
      "vinyl",
      "record",
      vinylCond,
      "lp",
      year || "vintage",
    ].filter(Boolean);

    document.getElementById("tagsOutput").innerHTML = previewTags
      .map(
        (t) => `
            <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
        `,
      )
      .join("");

    // Update shot list
    renderShotList();

    // Show results
    resultsSection.classList.remove("hidden");
    emptyState.classList.add("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast(
      'Quick preview ready! Click "Generate Full Listing" for complete analysis.',
      "success",
    );
  } catch (error) {
    console.error("Preview error:", error);
    showToast("Preview failed: " + error.message, "error");
  } finally {
    stopAnalysisProgress();
    setTimeout(() => {
      spinner.classList.add("hidden");
      dropZone.classList.remove("pointer-events-none");
      updateAnalysisProgress("Initializing...", 0);
    }, 300);
  }
}
async function callAI(messages, temperature = 0.7) {
  const provider = localStorage.getItem("ai_provider") || "openai";

  if (provider === "deepseek" && window.deepseekService?.isConfigured) {
    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_api_key")}`,
          },
          body: JSON.stringify({
            model: localStorage.getItem("deepseek_model") || "deepseek-chat",
            messages: messages,
            temperature: temperature,
            max_tokens: 2000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "DeepSeek API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`DeepSeek Error: ${error.message}`, "error");
      return null;
    }
  } else {
    // Fallback to OpenAI
    const apiKey = localStorage.getItem("openai_api_key");
    const model = localStorage.getItem("openai_model") || "gpt-4o";
    const maxTokens =
      parseInt(localStorage.getItem("openai_max_tokens")) || 2000;

    if (!apiKey) {
      showToast("OpenAI API key not configured. Go to Settings.", "error");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      showToast(`OpenAI Error: ${error.message}`, "error");
      return null;
    }
  }
}
// Legacy alias for backward compatibility
async function callOpenAI(messages, temperature = 0.7) {
  return callAI(messages, temperature);
}

// Delete hosted image from imgBB
async function deleteHostedImage(deleteUrl) {
  if (!deleteUrl) return false;

  try {
    const response = await fetch(deleteUrl, { method: "GET" });
    // imgBB delete URLs work via GET request
    return response.ok;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

// Get hosted photo URLs for eBay HTML description
function getHostedPhotoUrlsForEbay() {
  return hostedPhotoUrls.map((img) => ({
    full: img.url,
    display: img.displayUrl || img.url,
    thumb: img.thumb,
    medium: img.medium,
    viewer: img.viewerUrl,
  }));
}
async function generateListingWithAI() {
  const artist = document.getElementById("artistInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  const catNo = document.getElementById("catInput").value.trim();
  const year = document.getElementById("yearInput").value.trim();

  if (!artist || !title) {
    showToast("Please enter at least artist and title", "error");
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a vinyl record eBay listing expert. Generate optimized titles, descriptions, and pricing strategies. Always return JSON format with: titles (array), description (string), condition_notes (string), price_estimate (object with min, max, recommended), and tags (array).",
    },
    {
      role: "user",
      content: `Generate an eBay listing for: ${artist} - ${title}${catNo ? ` (Catalog: ${catNo})` : ""}${year ? ` (${year})` : ""}${document.getElementById("matrixSideAInput")?.value?.trim() ? ` (Matrix A: ${document.getElementById("matrixSideAInput").value.trim()})` : ""}${document.getElementById("matrixSideBInput")?.value?.trim() ? ` (Matrix B: ${document.getElementById("matrixSideBInput").value.trim()})` : ""}. Include optimized title options, professional HTML description, condition guidance, price estimate in GBP, and relevant tags.`,
    },
  ];
  const provider = localStorage.getItem("ai_provider") || "openai";
  showToast(
    `Generating listing with ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}...`,
    "success",
  );

  const result = await callAI(messages, 0.7);
  if (result) {
    try {
      const data = JSON.parse(result);
      // Populate the UI with AI-generated content
      if (data.titles) {
        renderTitleOptions(
          data.titles.map((t) => ({
            text: t.length > 80 ? t.substring(0, 77) + "..." : t,
            chars: Math.min(t.length, 80),
            style: "AI Generated",
          })),
        );
      }
      if (data.description) {
        document.getElementById("htmlOutput").value = data.description;
      }
      if (data.tags) {
        const tagsContainer = document.getElementById("tagsOutput");
        tagsContainer.innerHTML = data.tags
          .map(
            (t) => `
                    <span class="px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-full text-sm border border-pink-500/20">${t}</span>
                `,
          )
          .join("");
      }
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showToast("AI listing generated!", "success");
    } catch (e) {
      // If not valid JSON, treat as plain text description
      document.getElementById("htmlOutput").value = result;
      resultsSection.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }
  }
}

function requestHelp() {
  alert(`VINYL PHOTO GUIDE:

ESSENTIAL SHOTS (need these):
• Front cover - square, no glare, color accurate
• Back cover - full frame, readable text
• Both labels - close enough to read all text
• Deadwax/runout - for pressing identification

CONDITION SHOTS:
• Vinyl in raking light at angle (shows scratches)
• Sleeve edges and corners
• Any flaws clearly documented

OPTIONARY BUT HELPFUL:
• Inner sleeve condition
• Inserts, posters, extras
• Hype stickers
• Barcode area

TIPS:
- Use natural daylight or 5500K bulbs
- Avoid flash directly on glossy sleeves
- Include scale reference if unusual size
- Photograph flaws honestly - reduces returns`);
}
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const iconMap = {
    success: "check",
    error: "alert-circle",
    warning: "alert-triangle",
  };

  const colorMap = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type} flex items-center gap-3`;
  toast.innerHTML = `
        <i data-feather="${iconMap[type] || "info"}" class="w-5 h-5 ${colorMap[type] || "text-blue-400"}"></i>
        <span class="text-sm text-gray-200">${message}</span>
    `;
  document.body.appendChild(toast);
  if (typeof feather !== "undefined") feather.replace();

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup function to delete all hosted images for current listing
async function cleanupHostedImages() {
  if (window.currentListingImages) {
    for (const img of window.currentListingImages) {
      if (img.deleteUrl) {
        await deleteHostedImage(img.deleteUrl);
      }
    }
    window.currentListingImages = [];
  }
}
// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.__vinylVaultInitialized) return;
  window.__vinylVaultInitialized = true;
  console.log("VinylVault Pro initialized");

  // Initialize drop zone
  initDropZone();


  // Warn about unsaved changes when leaving page with hosted images
  window.addEventListener("beforeunload", (e) => {
    if (hostedPhotoUrls.length > 0 && !window.listingPublished) {
      // Optional: could add cleanup here or warn user
    }
  });
});
