// Global variables
let marketsData = null;
let filteredMarkets = [];
let currentFilter = "all";
let currentSort = "default";

// Global variables for market creation
let currentSource = "news";
let newsData = [];
let aiSuggestions = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  loadMarketData();
});

// Load market data from API
async function loadMarketData() {
  showLoading(true);

  try {
    const response = await fetch("/api/markets");
    if (!response.ok) throw new Error("Failed to fetch market data");

    marketsData = await response.json();
    filteredMarkets = marketsData.markets || [];

    updateStats();
    renderMarkets();
    showLoading(false);

    console.log("Market data loaded:", marketsData);
  } catch (error) {
    console.error("Error loading market data:", error);
    showError("Failed to load market data. Please try refreshing the page.");
    showLoading(false);
  }
}

// Update statistics in hero section
function updateStats() {
  if (!marketsData) return;

  const totalMarkets = marketsData.markets?.length || 0;
  const totalOptions =
    marketsData.markets?.reduce(
      (sum, market) => sum + (market.options?.length || 0),
      0
    ) || 0;
  const lastUpdated = formatDate(marketsData.scrapedAt);

  document.getElementById("total-markets").textContent = totalMarkets;
  document.getElementById("total-options").textContent = totalOptions;
  document.getElementById("last-updated").textContent = lastUpdated;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  } catch (error) {
    return "Unknown";
  }
}

// Render markets grid
function renderMarkets() {
  const container = document.getElementById("markets-grid");
  const emptyState = document.getElementById("empty-state");

  if (!filteredMarkets || filteredMarkets.length === 0) {
    container.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  container.style.display = "grid";
  emptyState.style.display = "none";

  container.innerHTML = filteredMarkets
    .map((market) => createMarketCard(market))
    .join("");
}

// Create individual market card HTML
function createMarketCard(market) {
  const hasOptions = market.options && market.options.length > 0;
  const hasPercentage = market.percentage && market.percentage !== "-%";
  const hasAnyData = hasOptions || hasPercentage;

  const imageUrl = market.imageUrl || "/default-market-image.png";
  const title = truncateText(
    market.question || market.text || "Untitled Market",
    100
  );
  const text = truncateText(market.text || "", 60);

  // Create badge
  const badge = hasOptions
    ? `<span class="market-badge badge-options">${market.options.length} Options</span>`
    : hasAnyData
    ? `<span class="market-badge badge-binary">Yes/No</span>`
    : `<span class="market-badge badge-new">New Market</span>`;

  // Create market body content
  let bodyContent;
  if (hasOptions) {
    // Multi-choice market
    const optionsList = market.options
      .map((option) => {
        const hasOptionPercentage =
          option.percentage && option.percentage !== "-%";
        const displayPercentage = hasOptionPercentage
          ? option.percentage
          : "New";
        const isNew = !hasOptionPercentage;

        return `
             <div class="option-item">
                 <div class="option-left">
                     <span class="option-label">${escapeHtml(
                       option.label
                     )}</span>
                     <span class="option-percentage ${
                       isNew ? "status-new" : ""
                     }">${displayPercentage}</span>
                 </div>
                 <div class="option-buttons">
                     ${
                       !isNew
                         ? `
                       <button class="bet-button yes" onclick="placeBet('${escapeHtml(
                         option.label
                       )}', 'yes')">Yes</button>
                       <button class="bet-button no" onclick="placeBet('${escapeHtml(
                         option.label
                       )}', 'no')">No</button>
                     `
                         : `
                       <span class="coming-soon">Coming Soon</span>
                     `
                     }
                 </div>
             </div>
           `;
      })
      .join("");

    bodyContent = `
             <div class="options-market">
                 ${badge}
                 <div class="options-list">
                     ${optionsList}
                 </div>
             </div>
         `;
  } else {
    // Binary market
    const percentage = hasPercentage ? market.percentage : "New";
    const isNew = !hasPercentage;
    const questionId = escapeHtml(market.text || market.question || "");

    bodyContent = `
             <div class="binary-market">
                 ${badge}
                 <div class="binary-percentage ${
                   isNew ? "status-new" : ""
                 }">${percentage}</div>
                 <div class="binary-label">Probability</div>
                 ${
                   !isNew
                     ? `
                   <div class="binary-buttons">
                       <button class="bet-button yes" onclick="placeBet('${questionId}', 'yes')">Yes</button>
                       <button class="bet-button no" onclick="placeBet('${questionId}', 'no')">No</button>
                   </div>
                 `
                     : `
                   <div class="coming-soon-binary">Coming Soon</div>
                 `
                 }
             </div>
         `;
  }

  return `
        <div class="market-card" data-market-type="${
          hasOptions ? "options" : "binary"
        }">
            <div class="market-header">
                <img class="market-image" 
                     src="${imageUrl}" 
                     alt="Market Image"
                     onerror="this.style.display='none'">
                <div class="market-info">
                    <h3 class="market-title">${escapeHtml(title)}</h3>
                    ${
                      text
                        ? `<p class="market-text">${escapeHtml(text)}</p>`
                        : ""
                    }
                    ${
                      market.href
                        ? `
                         <a href="${market.href}" target="_blank" class="market-url">
                             <i class="fas fa-external-link-alt"></i>
                             View Market
                         </a>
                     `
                        : ""
                    }
                </div>
            </div>
            <div class="market-body">
                ${bodyContent}
            </div>
        </div>
    `;
}

// Utility functions
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Filter markets
function setFilter(filterType) {
  currentFilter = filterType;

  // Update active button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filterType);
  });

  applyFilters();
}

function filterMarkets() {
  applyFilters();
}

function applyFilters() {
  if (!marketsData || !marketsData.markets) return;

  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();

  filteredMarkets = marketsData.markets.filter((market) => {
    // Text search
    const searchableText = [
      market.question || "",
      market.text || "",
      ...(market.options || []).map((opt) => opt.label || ""),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

    // Filter type
    let matchesFilter = true;
    if (currentFilter === "options") {
      matchesFilter = market.options && market.options.length > 0;
    } else if (currentFilter === "binary") {
      matchesFilter = !market.options || market.options.length === 0;
    }

    return matchesSearch && matchesFilter;
  });

  sortMarkets();
}

// Sort markets
function sortMarkets() {
  const sortValue = document.getElementById("sort-select").value;
  currentSort = sortValue;

  switch (sortValue) {
    case "name":
      filteredMarkets.sort((a, b) => {
        const nameA = (a.text || a.question || "").toLowerCase();
        const nameB = (b.text || b.question || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;

    case "options":
      filteredMarkets.sort((a, b) => {
        const optionsA = (a.options || []).length;
        const optionsB = (b.options || []).length;
        return optionsB - optionsA;
      });
      break;

    case "percentage":
      filteredMarkets.sort((a, b) => {
        const getMaxPercentage = (market) => {
          if (market.percentage) {
            return parseInt(market.percentage) || 0;
          }
          if (market.options && market.options.length > 0) {
            return Math.max(
              ...market.options.map((opt) => parseInt(opt.percentage) || 0)
            );
          }
          return 0;
        };

        return getMaxPercentage(b) - getMaxPercentage(a);
      });
      break;

    default:
      // Keep original order
      break;
  }

  renderMarkets();
}

// Refresh data
async function refreshData() {
  console.log("Refreshing market data...");
  await loadMarketData();
}

// Trigger scraping
async function triggerScrape() {
  showScrapeModal();

  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (result.success) {
      updateScrapeStatus("Scraping completed successfully!");
      setTimeout(() => {
        closeScrapeModal();
        refreshData();
      }, 2000);
    } else {
      updateScrapeStatus("Scraping failed: " + result.message);
      console.error("Scraping failed:", result);
    }

    if (result.output) {
      updateScrapeLog(result.output);
    }
  } catch (error) {
    console.error("Error triggering scrape:", error);
    updateScrapeStatus("Error starting scrape process");
  }
}

// Modal functions
function showScrapeModal() {
  const modal = document.getElementById("scrape-modal");
  modal.classList.add("show");
  updateScrapeStatus("Starting scrape process...");
  updateScrapeLog("");
}

function closeScrapeModal() {
  const modal = document.getElementById("scrape-modal");
  modal.classList.remove("show");
}

function updateScrapeStatus(message) {
  document.getElementById("scrape-status").textContent = message;
}

function updateScrapeLog(output) {
  document.getElementById("scrape-log").textContent = output;
}

// Loading state
function showLoading(show, isModal = false) {
  if (isModal) {
    const modalLoader = document.getElementById("modal-loading");
    if (modalLoader) {
      modalLoader.style.display = show ? "flex" : "none";
    }
  } else {
    const loading = document.getElementById("loading");
    const marketsGrid = document.getElementById("markets-grid");
    const emptyState = document.getElementById("empty-state");

    if (show) {
      loading.style.display = "block";
      marketsGrid.style.display = "none";
      emptyState.style.display = "none";
    } else {
      loading.style.display = "none";
    }
  }
}

// Error handling
function showError(message) {
  console.error(message);
  // You could implement a toast notification system here
  alert(message);
}

// Event listeners for modal
document.addEventListener("click", function (e) {
  const modal = document.getElementById("scrape-modal");
  if (e.target === modal) {
    closeScrapeModal();
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeScrapeModal();
  }
});

// Debounce search input
let searchTimeout;
document.getElementById("search-input").addEventListener("input", function () {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(filterMarkets, 300);
});

// Initialize sort
document.getElementById("sort-select").addEventListener("change", sortMarkets);

// Handle betting button clicks
function placeBet(option, betType) {
  // For demo purposes, show an alert
  // In a real app, this would connect to a betting API
  const message = `Demo: Would place ${betType.toUpperCase()} bet on "${option}"`;

  // Create a simple notification
  showNotification(message, betType === "yes" ? "success" : "error");
}

// Simple notification system
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
          ? "fa-times-circle"
          : "fa-info-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Add/modify these functions

async function showCreateMarketModal() {
  const modal = document.getElementById("create-market-modal");
  modal.classList.add("show");
  if (currentSource === "ai") {
    await loadAISuggestions();
  } else {
    await loadNewsData();
  }
}

function closeCreateMarketModal() {
  const modal = document.getElementById("create-market-modal");
  modal.classList.remove("show");
}

async function loadNewsData() {
  try {
    showLoading(true, true); // Show modal loader
    const response = await fetch("/api/news");
    const data = await response.json();
    newsData = data.response.results;
    renderNewsList();
  } catch (error) {
    console.error("Error loading news:", error);
    showError("Failed to load news data");
  } finally {
    showLoading(false, true); // Hide modal loader
  }
}

function renderNewsList() {
  const newsListElement = document.getElementById("news-list");
  newsListElement.innerHTML = newsData
    .map(
      (news, index) => `
        <div class="news-item" onclick="selectNews(${index})">
            <h4>${news.webTitle}</h4>
            <p>${news.sectionName} - ${formatDate(news.webPublicationDate)}</p>
        </div>
    `
    )
    .join("");
}

async function loadAISuggestions() {
  try {
    showLoading(true, true); // Show modal loader
    const response = await fetch("/api/ai-suggestions", {
      method: "POST",
    });
    aiSuggestions = await response.json();
    renderAISuggestions();
  } catch (error) {
    console.error("Error loading AI suggestions:", error);
    showError("Failed to load AI suggestions");
  } finally {
    showLoading(false, true); // Hide modal loader
  }
}

function renderAISuggestions() {
  const suggestionsElement = document.getElementById("ai-suggestions");
  if (!aiSuggestions || !aiSuggestions.markets) {
    suggestionsElement.innerHTML =
      '<p class="error-message">No suggestions available</p>';
    return;
  }

  const suggestionsHtml = aiSuggestions.markets
    .map(
      (market, index) => `
        <div class="suggestion-item" onclick="selectAISuggestion(${index})">
            <div class="suggestion-content">
                <h4>${market.question}</h4>
                <p>${market.text || ""}</p>
            </div>
        </div>
    `
    )
    .join("");

  suggestionsElement.innerHTML = suggestionsHtml;
}

function selectNews(index) {
  const news = newsData[index];
  showMarketForm(news.webTitle);
}

function selectAISuggestion(index) {
  const market = aiSuggestions.markets[index];
  showMarketForm(market.question);
}

function showMarketForm(title, options = []) {
  closeCreateMarketModal();
  const modal = document.getElementById("market-form-modal");
  modal.classList.add("show");

  document.getElementById("market-title").value = title;
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  if (options.length === 0) {
    addOptionPair(title);
  } else {
    options.forEach((option) => addOptionPair(option));
  }
}

function closeMarketFormModal() {
  const modal = document.getElementById("market-form-modal");
  modal.classList.remove("show");
}

function addOptionPair(title = "") {
  const container = document.getElementById("options-container");
  const pairDiv = document.createElement("div");
  pairDiv.className = "option-pair";

  pairDiv.innerHTML = `
        <input type="text" class="option-title" placeholder="Option Title" value="${title}">
        <input type="text" class="option-percentage" placeholder="Percentage" value="">
        <button type="button" class="remove-option" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  container.appendChild(pairDiv);
}

// Add event listener for form submission
document
  .getElementById("market-creation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();

    const marketData = {
      question: document.getElementById("market-title").value,
      options: Array.from(document.querySelectorAll(".option-pair")).map(
        (pair) => ({
          label: pair.querySelector(".option-title").value,
          percentage: pair.querySelector(".option-percentage").value + "%",
        })
      ),
      href: "https://kalshi.com/markets/kxusomensingles#kxusomensingles-25",
      text: document.getElementById("market-title").value,
    };

    formData.append("marketData", JSON.stringify(marketData));

    const imageFile = document.getElementById("market-image")?.files?.[0];
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const response = await fetch("/api/markets", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        closeMarketFormModal();
        showNotification("Market created successfully!", "success");
        refreshData();
      } else {
        throw new Error("Failed to create market");
      }
    } catch (error) {
      console.error("Error creating market:", error);
      showError("Failed to create market");
    }
  });

// Update the switchSource function
function switchSource(source) {
  currentSource = source;

  // Update button states
  document.querySelectorAll(".source-btn").forEach((btn) => {
    btn.classList.remove("active"); // Remove active from all
    if (btn.getAttribute("data-source") === source) {
      btn.classList.add("active"); // Add active to selected
    }
  });

  // Toggle content visibility
  document.getElementById("news-source-content").style.display =
    source === "news" ? "block" : "none";
  document.getElementById("ai-source-content").style.display =
    source === "ai" ? "block" : "none";

  // Load appropriate data
  if (source === "ai") {
    loadAISuggestions();
  } else {
    loadNewsData();
  }
}

// Add getAISuggestions function
async function getAISuggestions() {
  try {
    const prompt = document.getElementById("ai-prompt").value;
    showLoading(true);

    const response = await fetch("/api/ai-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    aiSuggestions = await response.json();
    renderAISuggestions();
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    showError("Failed to get AI suggestions");
  } finally {
    showLoading(false);
  }
}
