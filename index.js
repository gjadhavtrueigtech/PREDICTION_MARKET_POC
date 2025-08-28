#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs-extra");
const path = require("path");

const { KalshiScraper } = require("./scrapers/kalshi-scraper");

program
  .name("web-scraper")
  .description("A powerful web scraping tool with multiple scraping methods")
  .version("1.0.0");

program
  .command("scrape")
  .description("Scrape a website")
  .argument("[url]", "URL to scrape (alternative to --url option)")
  .option("-u, --url <url>", "URL to scrape")
  .option("-m, --method <method>", "Scraping method (kalshi)", "kalshi")
  .option(
    "-s, --selector <selector>",
    "CSS selector to extract specific elements"
  )
  .option("-o, --output <file>", "Output file path", "scraped-data.json")
  .option("-f, --format <format>", "Output format (json|csv|txt)", "json")
  .option("-d, --delay <ms>", "Delay between requests in milliseconds", "1000")
  .option("--headless", "Run browser in headless mode (for puppeteer)", true)
  .option("--screenshot", "Take screenshot of the page (for puppeteer)")
  .action(async (url, options) => {
    // Use positional argument if --url option is not provided
    const targetUrl = options.url || url;
    if (!targetUrl) {
      console.error(
        chalk.red(
          "Error: URL is required. Use --url option or provide URL as argument."
        )
      );
      process.exit(1);
    }

    console.log(`🎯 Target URL: ${targetUrl}`);
    console.log(`🔧 Method: ${options.method}`);

    const spinner = ora("Initializing scraper...").start();

    try {
      let scraper;

      // Only support kalshi method
      scraper = new KalshiScraper({
        headless: options.headless,
        delay: parseInt(options.delay),
      });

      spinner.text = "Scraping website...";

      const data = await scraper.scrape(targetUrl, {
        selector: options.selector,
        screenshot: options.screenshot,
      });

      spinner.text = "Saving data...";

      const processedData = JSON.stringify(data, null, 2);

      await fs.ensureDir(path.dirname(options.output));
      await fs.writeFile(options.output, processedData);

      spinner.succeed(
        chalk.green(`Successfully scraped data from ${targetUrl}`)
      );
      console.log(chalk.blue(`Data saved to: ${options.output}`));

      if (data.length > 0) {
        console.log(chalk.yellow(`Scraped ${data.length} items`));
      }
    } catch (error) {
      spinner.fail(chalk.red("Scraping failed"));
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program.parse();
