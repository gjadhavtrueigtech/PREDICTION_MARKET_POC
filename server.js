const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const fetch = require("node-fetch");
const multer = require("multer");
const axios = require("axios");

require("dotenv").config();

const app = express();
const PORT = 3001;

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from public directory
app.use(express.static("public"));

// Set up file upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

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
  } catch (error) {
    console.error("Error starting scraping:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start scraping process",
    });
  }
});

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
app.get("/api/news", async (req, res) => {
  try {
    const response = await fetch(
      `https://content.guardianapis.com/search?api-key=${GUARDIAN_API_KEY}&section=us-news`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.post("/api/ai-suggestions", async (req, res) => {
  try {
    const prompt = `Generate 5 prediction market questions based on future events and sports, politics  in JSON format like this example:
        [{
            "question": "",
            "text": "",
            "imageUrl": ""
        }]
    user prompt: ${req.body?.prompt}`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    console.log("response", generatedText);
    let markets = JSON.parse(generatedText.replace(/```json|```/g, "").trim());

    res.json({
      markets,
      timestamp: new Date().toISOString(),
      totalPredictions: markets.length,
      source: "Gemini API",
    });
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    res.status(500).json({
      error: "Failed to get AI suggestions",
      details: error.message,
    });
  }
});

app.post("/api/markets", upload.single("image"), async (req, res) => {
  try {
    const newMarket = {
      ...JSON.parse(req.body.marketData),
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
    };

    // Read existing markets
    let markets = [];
    try {
      const data = await fs.readFile("kalshi-scraped-data.json", "utf8");
      markets = JSON.parse(data).markets || [];
    } catch (error) {
      console.warn("No existing markets file, creating new one");
    }

    // Add new market
    markets.unshift(newMarket);

    // Save updated markets
    await fs.writeFile(
      "kalshi-scraped-data.json",
      JSON.stringify(
        {
          markets,
          scrapedAt: new Date().toISOString(),
          totalMarketsFound: markets.length,
        },
        null,
        2
      )
    );

    res.json({ success: true, market: newMarket });
  } catch (error) {
    res.status(500).json({ error: "Failed to create market" });
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
  console.log(
    `🔄 Scrape endpoint: http://localhost:${PORT}/api/scrape (no timeout)`
  );
  console.log(`✅ Server is ready and listening...`);
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
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
