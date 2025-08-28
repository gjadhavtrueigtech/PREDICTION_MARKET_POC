const puppeteer = require("puppeteer");

class KalshiScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.delay = options.delay || 1000;
    this.timeout = options.timeout || 30000;
    this.browser = null;
    this.page = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }

  async createPage() {
    await this.init();
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    return this.page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrape(url, options = {}) {
    const page = await this.createPage();

    // Forward in-page console markers to Node console
    try {
      page.on("console", (msg) => {
        const text = msg.text();
        if (
          typeof text === "string" &&
          (text.startsWith("[KALSHI_OPTION]") ||
            text.startsWith("[KALSHI_DEBUG]"))
        ) {
          // Echo our debug messages
          // eslint-disable-next-line no-console
          console.log(text);
        }
      });
    } catch (_) {}

    try {
      console.log("🌐 Navigating to", url);
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: this.timeout,
      });

      console.log("⏳ Waiting for content to load...");
      await page.waitForTimeout(5000);

      // Wait for questions to load
      await page.waitForFunction(
        () => document.querySelectorAll("span.line-clamp-2").length > 0,
        { timeout: 10000 }
      );

      console.log("✅ Found elements using selector: span.line-clamp-2");
      console.log("🔍 Extracting prediction markets data...");

      // First pass: Extract basic market data without prices
      const marketData = await page.evaluate(() => {
        console.log("[KALSHI_DEBUG] Starting page evaluation...");

        // Helper: resolve actual image URL from Next.js optimized src
        const resolveImageUrl = (imgEl) => {
          if (!imgEl) return "";
          let src = imgEl.getAttribute("src") || "";
          if (!src) return "";
          try {
            // If Next.js optimized image like /_next/image?...&url=ENCODED
            if (src.startsWith("/_next/image")) {
              const u = new URL(src, location.origin);
              const original = u.searchParams.get("url");
              if (original) return decodeURIComponent(original);
              return new URL(src, location.origin).href;
            }
            // If relative path, make absolute
            if (src.startsWith("/")) return new URL(src, location.origin).href;
            return src;
          } catch (_) {
            return src;
          }
        };

        // Helper: find nearest <img> around a given element
        const findNearestImage = (startEl) => {
          if (!startEl) return null;
          // 1) Inside same container
          let container = startEl.closest("div") || startEl.parentElement;
          if (container) {
            let img = container.querySelector("img");
            if (img) return img;
          }
          // 2) Walk previous siblings in the same parent chain
          let current = container;
          for (let depth = 0; depth < 5 && current; depth++) {
            let sib = current.previousElementSibling;
            while (sib) {
              const img = sib.querySelector && sib.querySelector("img");
              if (img) return img;
              sib = sib.previousElementSibling;
            }
            current = current.parentElement;
            if (current) {
              const imgUp =
                current.querySelector && current.querySelector("img");
              if (imgUp) return imgUp;
            }
          }
          return null;
        };

        // Get all market cards (parent containers of market links)
        const marketLinks = Array.from(
          document.querySelectorAll('a[href*="/markets/"]')
        );
        const marketCards = [];

        marketLinks.forEach((link) => {
          const card = link.closest("div");
          if (!card) return;

          // Find question span in this card
          const questionSpan = card.querySelector("span.line-clamp-2");
          if (!questionSpan) return;

          const question = questionSpan.textContent.trim();
          if (!question) return; // Skip empty questions

          // Find nearest image
          const nearestImg = findNearestImage(questionSpan);
          const imageUrl = resolveImageUrl(nearestImg);

          // Extract options (label + percentage)
          const options = [];
          const seen = new Set();
          const pctRegex = /\d{1,3}%/;

          // Process transition-colors spans in pairs (label, percentage)
          const transitionSpans = Array.from(
            card.querySelectorAll("span.transition-colors")
          );

          // Debug: Log what we found
          try {
            console.log(
              `[KALSHI_DEBUG] Card "${question}" - Found ${transitionSpans.length} transition-colors spans`
            );
            transitionSpans.forEach((l, i) => {
              console.log(
                `[KALSHI_DEBUG] transition-colors ${i}: "${l.textContent.trim()}"`
              );
            });
          } catch (_) {}

          // Process transition-colors spans in pairs (label, percentage)
          for (let i = 0; i < transitionSpans.length - 1; i += 2) {
            const labelSpan = transitionSpans[i];
            const pctSpan = transitionSpans[i + 1];

            const label = labelSpan.textContent.trim();
            const pctText = pctSpan.textContent.trim();
            const pctMatch = pctText.match(pctRegex);

            // Debug: Log what we're processing
            try {
              console.log(
                `[KALSHI_DEBUG] Processing pair ${i}: label="${label}", pctText="${pctText}", pctMatch=${
                  pctMatch ? pctMatch[0] : "null"
                }`
              );
            } catch (_) {}

            if (label && pctMatch) {
              const percentage = pctMatch[0];
              const key = `${label}::${percentage}`;
              if (!seen.has(key)) {
                seen.add(key);

                // Options are successfully extracted with label and percentage

                options.push({
                  label,
                  percentage,
                });
                try {
                  console.log(`[KALSHI_OPTION] ${label} -> ${percentage}`);
                } catch (_) {}
              }
            }
          }

          // Log options found
          if (options.length > 0) {
            try {
              console.log(
                `[KALSHI_OPTION] Card: "${question}" options found: ${options.length}`
              );
            } catch (_) {}
          }

          // Add to results
          const marketCard = {
            question: question,
            text: link.textContent.trim(),
            href: link.href,
            imageUrl: imageUrl,
            options: options,
          };

          // If no options, find the percentage for the question itself
          if (options.length === 0) {
            // Look for percentage spans with specific styling (like your example)
            const styleSpans = Array.from(
              card.querySelectorAll('span[style*="font-size: 18px"]')
            );
            for (let span of styleSpans) {
              const text = span.textContent.trim();
              const pctMatch = text.match(/\d{1,3}%/);
              if (pctMatch) {
                marketCard.percentage = pctMatch[0];
                try {
                  console.log(
                    `[KALSHI_QUESTION_PCT] "${question}" -> ${pctMatch[0]} (styled span)`
                  );
                } catch (_) {}
                break;
              }
            }

            // If still not found, look for percentage anywhere in the card
            if (!marketCard.percentage) {
              const allSpans = Array.from(card.querySelectorAll("span"));
              for (let span of allSpans) {
                const text = span.textContent.trim();
                const pctMatch = text.match(/\d{1,3}%/);
                if (pctMatch) {
                  marketCard.percentage = pctMatch[0];
                  try {
                    console.log(
                      `[KALSHI_QUESTION_PCT] "${question}" -> ${pctMatch[0]} (any span)`
                    );
                  } catch (_) {}
                  break;
                }
              }
            }

            // Final fallback: look in text content of the entire card
            if (!marketCard.percentage) {
              const cardText = card.textContent;
              const pctMatch = cardText.match(/\d{1,3}%/);
              if (pctMatch) {
                marketCard.percentage = pctMatch[0];
                try {
                  console.log(
                    `[KALSHI_QUESTION_PCT] "${question}" -> ${pctMatch[0]} (card text)`
                  );
                } catch (_) {}
              }
            }
          }

          // Note: Yes/No prices are not extracted as they require user interaction (clicking)

          marketCards.push(marketCard);
        });

        return marketCards.filter((card) => card !== null);
      });

      console.log(
        `🎯 Found ${marketData.length} markets with ${marketData.reduce(
          (total, market) => total + market.options.length,
          0
        )} total options`
      );

      console.log("✅ Market data extraction completed successfully!");

      const result = {
        url: url,
        scrapedAt: new Date().toISOString(),
        totalMarketsFound: marketData.length,
        markets: marketData,
      };

      return result;
    } catch (error) {
      throw new Error(
        `Failed to scrape Kalshi prediction markets: ${error.message}`
      );
    } finally {
      try {
        await page.close();
      } catch (e) {
        // Ignore page close errors
      }
    }
  }
}

module.exports = { KalshiScraper };
