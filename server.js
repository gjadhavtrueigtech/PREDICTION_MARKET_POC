const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3001;

// Serve static files from public directory
app.use(express.static("public"));

// Route to get the latest scraped data
app.get("/api/markets", async (req, res) => {
  try {
    // Try to read the latest scraped data
    let data;
    try {
      const rawData = await fs.readFile("kalshi-scraped-data.json", "utf8");
      data = JSON.parse(rawData);
    } catch (error) {
      // Fallback to sample data if no scraped data exists
      const rawData = await fs.readFile("kalshi-sample-output.json", "utf8");
      data = JSON.parse(rawData);
    }

    res.json(data);
  } catch (error) {
    console.error("Error reading market data:", error);
    res.status(500).json({ error: "Failed to load market data" });
  }
});

// Route to trigger new scraping
app.post("/api/scrape", async (req, res) => {
  try {
    const { spawn } = require("child_process");

    // Run the scraping command
    const scrapeProcess = spawn("yarn", ["kalshi"], {
      stdio: "pipe",
    });

    let output = "";
    scrapeProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    scrapeProcess.stderr.on("data", (data) => {
      output += data.toString();
    });

    scrapeProcess.on("close", (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: "Scraping completed successfully",
          output: output,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Scraping failed",
          output: output,
        });
      }
    });

    // Set timeout for scraping process
    setTimeout(() => {
      scrapeProcess.kill();
      res.status(408).json({
        success: false,
        message: "Scraping timeout (45 seconds)",
        output: output,
      });
    }, 45000);
  } catch (error) {
    console.error("Error starting scraping:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start scraping process",
    });
  }
});

// Serve the main HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Prediction Market Platform running at http://localhost:${PORT}`
  );
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/markets`);
  console.log(`🔄 Scrape endpoint: http://localhost:${PORT}/api/scrape`);
  console.log(`✅ Server is ready and listening...`);
});

// Handle server errors
server.on("error", (error) => {
  console.error("❌ Server error:", error);
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

console.log("🔄 Starting server...");
