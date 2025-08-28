# Kalshi Prediction Markets Platform

A comprehensive Node.js platform for scraping and visualizing prediction market data from [Kalshi.com](https://kalshi.com). Features both command-line scraping tools and a beautiful web interface for exploring market data.

## Features

### 🌐 **Web Platform**
✅ **Beautiful UI** - Modern, responsive prediction market dashboard  
✅ **Real-time Data** - Live market visualization with auto-refresh  
✅ **Search & Filter** - Find markets by keywords, type, or sort by various criteria  
✅ **Interactive Cards** - Hover effects and detailed market information  
✅ **Live Scraping** - Trigger new data collection directly from the web interface  

### 🔧 **Scraping Engine**
✅ **Complete Market Questions** - Full prediction market questions with context  
✅ **Market Links** - Direct URLs to each market page  
✅ **Image URLs** - Properly resolved Next.js optimized images  
✅ **Options with Percentages** - Multi-choice market options (e.g., "Jannik Sinner" 46%)  
✅ **Question-Level Percentages** - Simple yes/no market probabilities (e.g., "SpaceX launch 85%")  
✅ **Clean JSON Output** - Well-structured data ready for analysis  
✅ **Fast Performance** - Efficiently extracts 40+ markets in ~30 seconds  

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd scrapping

# Install dependencies
yarn install
```

## Usage

### Quick Start (Recommended)
```bash
# Launch the web platform
yarn web

# Access the platform at: http://localhost:3000
```

### Scraping Commands
```bash
# Scrape Kalshi markets (outputs to kalshi-scraped-data.json)
yarn kalshi

# Alternative scraping command
yarn scrape:kalshi
```

### Manual Commands
```bash
# Scrape Kalshi markets directly
yarn start scrape https://kalshi.com

# Save to custom output file
yarn start scrape https://kalshi.com -o my-markets.json

# Run development server with auto-reload
yarn dev
```

## Output Structure

The scraper generates clean JSON with the following structure:

```json
{
  "url": "https://kalshi.com",
  "scrapedAt": "2025-08-26T12:33:47.292Z",
  "totalMarketsFound": 46,
  "markets": [
    {
      "question": "Full prediction market question with context...",
      "text": "Short market title",
      "href": "https://kalshi.com/markets/market-url",
      "imageUrl": "https://kalshi-images.com/image.webp",
      "options": [
        {
          "label": "Option A",
          "percentage": "46%"
        },
        {
          "label": "Option B", 
          "percentage": "36%"
        }
      ]
    },
    {
      "question": "Simple yes/no market question...",
      "text": "Market title",
      "href": "https://kalshi.com/markets/market-url",
      "imageUrl": "https://kalshi-images.com/image.webp",
      "options": [],
      "percentage": "85%"
    }
  ]
}
```

### Data Fields Explained

- **question**: Full descriptive text including news context
- **text**: Clean market title
- **href**: Direct link to the market page
- **imageUrl**: Market image URL (Next.js optimized)
- **options**: Array of options for multi-choice markets
  - **label**: Option name (e.g., "Jannik Sinner")
  - **percentage**: Current market percentage
- **percentage**: Overall market percentage for yes/no questions

## Sample Output

See `kalshi-sample-output.json` for real example data.

## Technical Details

- **Built with**: Node.js, Puppeteer
- **Target site**: Kalshi.com prediction markets
- **Method**: Browser automation with headless Chrome
- **Selectors**: CSS selectors for dynamic content extraction
- **Image handling**: Next.js optimized image URL resolution

## Dependencies

- `puppeteer` - Browser automation
- `commander` - CLI interface
- `chalk` - Colored console output
- `ora` - Loading spinners
- `fs-extra` - File operations

**Package Manager**: Yarn (yarn.lock included)

## Project Structure

```
├── 🌐 Web Platform
│   ├── server.js                # Express web server
│   └── public/
│       ├── index.html           # Main dashboard UI
│       ├── styles.css           # Modern CSS styling
│       └── script.js            # Interactive functionality
├── 🔧 Scraping Engine
│   ├── index.js                 # CLI entry point
│   └── scrapers/
│       └── kalshi-scraper.js    # Main Kalshi scraper
├── 📊 Data & Config
│   ├── package.json             # Dependencies and scripts  
│   ├── yarn.lock                # Yarn lockfile
│   ├── kalshi-sample-output.json    # Example output
│   ├── kalshi-scraped-data.json     # Latest scraped data
│   └── README.md                    # Documentation
```

## Performance

- **Speed**: ~30 seconds for full Kalshi homepage
- **Markets**: 40-50 markets typically found
- **Success Rate**: ~90% for market data, ~80% for percentages
- **Memory**: Low memory footprint with efficient processing

## Notes

- **JavaScript-heavy sites**: Uses Puppeteer for dynamic content
- **Rate limiting**: Built-in delays to respect server resources
- **Error handling**: Graceful failures with detailed logging
- **Image URLs**: Resolves Next.js optimized images to original sources

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Created for educational and research purposes. Please respect Kalshi's terms of service and rate limits.**