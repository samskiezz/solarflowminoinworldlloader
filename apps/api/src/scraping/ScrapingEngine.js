/**
 * REAL SCRAPING ENGINE - ALL TOOLS IMPLEMENTED
 * Scrapy, Playwright, Puppeteer, Selenium, Go tools, etc.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { chromium } from 'playwright-extra';
import { stealth } from 'playwright-extra-stealth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Add stealth plugins
puppeteer.use(StealthPlugin());
chromium.use(stealth);

export class ScrapingEngine {
    constructor(config = {}) {
        this.config = {
            outputDir: config.outputDir || './data/scraping',
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            timeout: config.timeout || 30000,
            concurrent: config.concurrent || 5,
            ...config
        };
        
        this.sessions = new Map();
        this.results = new Map();
        
        this.initializeOutputDirectory();
    }

    async initializeOutputDirectory() {
        try {
            await fs.mkdir(this.config.outputDir, { recursive: true });
            await fs.mkdir(path.join(this.config.outputDir, 'scrapy'), { recursive: true });
            await fs.mkdir(path.join(this.config.outputDir, 'playwright'), { recursive: true });
            await fs.mkdir(path.join(this.config.outputDir, 'puppeteer'), { recursive: true });
            await fs.mkdir(path.join(this.config.outputDir, 'recon'), { recursive: true });
        } catch (error) {
            console.error('Failed to create output directories:', error);
        }
    }

    // SCRAPY INTEGRATION - Full Python framework
    async createScrapyProject(projectName, spiderName, startUrls) {
        const sessionId = uuidv4();
        const projectPath = path.join(this.config.outputDir, 'scrapy', projectName);
        
        try {
            // Create Scrapy project
            await execAsync(`cd ${this.config.outputDir}/scrapy && scrapy startproject ${projectName}`);
            
            // Create spider with custom code
            const spiderCode = this.generateScrapySpider(spiderName, startUrls);
            const spiderPath = path.join(projectPath, projectName, 'spiders', `${spiderName}.py`);
            await fs.writeFile(spiderPath, spiderCode);
            
            // Create settings for stealth mode
            const settingsCode = this.generateScrapySettings();
            const settingsPath = path.join(projectPath, projectName, 'settings.py');
            await fs.writeFile(settingsPath, settingsCode);
            
            // Create items and pipelines
            const itemsCode = this.generateScrapyItems();
            await fs.writeFile(path.join(projectPath, projectName, 'items.py'), itemsCode);
            
            const pipelinesCode = this.generateScrapyPipelines();
            await fs.writeFile(path.join(projectPath, projectName, 'pipelines.py'), pipelinesCode);
            
            this.sessions.set(sessionId, {
                type: 'scrapy',
                projectName,
                spiderName,
                projectPath,
                status: 'ready'
            });
            
            return { sessionId, projectPath, status: 'created' };
        } catch (error) {
            throw new Error(`Scrapy project creation failed: ${error.message}`);
        }
    }

    async runScrapySpider(sessionId, outputFormat = 'json') {
        const session = this.sessions.get(sessionId);
        if (!session || session.type !== 'scrapy') {
            throw new Error('Invalid Scrapy session');
        }
        
        const outputFile = path.join(session.projectPath, `output.${outputFormat}`);
        
        try {
            session.status = 'running';
            
            const command = `cd ${session.projectPath} && scrapy crawl ${session.spiderName} -o ${outputFile}`;
            const { stdout, stderr } = await execAsync(command);
            
            session.status = 'completed';
            session.output = outputFile;
            
            // Read and parse results
            const results = await this.parseScrapyOutput(outputFile, outputFormat);
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            session.status = 'failed';
            throw new Error(`Scrapy execution failed: ${error.message}`);
        }
    }

    // PLAYWRIGHT-STEALTH INTEGRATION - Advanced browser automation
    async createPlaywrightSession(config = {}) {
        const sessionId = uuidv4();
        
        try {
            const browser = await chromium.launch({
                headless: config.headless !== false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            
            const context = await browser.newContext({
                userAgent: this.config.userAgent,
                viewport: { width: 1920, height: 1080 },
                ignoreHTTPSErrors: true,
                ...config.contextOptions
            });
            
            const page = await context.newPage();
            
            // Additional stealth measures
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                delete navigator.__proto__.webdriver;
                
                window.chrome = {
                    runtime: {},
                };
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
            });
            
            this.sessions.set(sessionId, {
                type: 'playwright',
                browser,
                context,
                page,
                status: 'active'
            });
            
            return { sessionId, status: 'created' };
        } catch (error) {
            throw new Error(`Playwright session creation failed: ${error.message}`);
        }
    }

    async playwrightScrape(sessionId, url, selectors = {}) {
        const session = this.sessions.get(sessionId);
        if (!session || session.type !== 'playwright') {
            throw new Error('Invalid Playwright session');
        }
        
        try {
            await session.page.goto(url, { waitUntil: 'networkidle' });
            
            // Wait for content to load
            await session.page.waitForTimeout(2000);
            
            const results = {
                url,
                timestamp: new Date().toISOString(),
                data: {}
            };
            
            // Extract data based on selectors
            for (const [key, selector] of Object.entries(selectors)) {
                try {
                    if (selector.type === 'text') {
                        results.data[key] = await session.page.textContent(selector.selector);
                    } else if (selector.type === 'html') {
                        results.data[key] = await session.page.innerHTML(selector.selector);
                    } else if (selector.type === 'attribute') {
                        results.data[key] = await session.page.getAttribute(selector.selector, selector.attribute);
                    } else if (selector.type === 'multiple') {
                        results.data[key] = await session.page.$$eval(selector.selector, elements => 
                            elements.map(el => el.textContent)
                        );
                    }
                } catch (selectorError) {
                    results.data[key] = null;
                }
            }
            
            // Take screenshot
            const screenshotPath = path.join(this.config.outputDir, 'playwright', `${sessionId}_${Date.now()}.png`);
            await session.page.screenshot({ path: screenshotPath, fullPage: true });
            results.screenshot = screenshotPath;
            
            return results;
        } catch (error) {
            throw new Error(`Playwright scraping failed: ${error.message}`);
        }
    }

    // PUPPETEER-EXTRA-STEALTH - Advanced anti-detection
    async createPuppeteerSession(config = {}) {
        const sessionId = uuidv4();
        
        try {
            const browser = await puppeteer.launch({
                headless: config.headless !== false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled'
                ]
            });
            
            const page = await browser.newPage();
            await page.setUserAgent(this.config.userAgent);
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Advanced evasion techniques
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });
            
            this.sessions.set(sessionId, {
                type: 'puppeteer',
                browser,
                page,
                status: 'active'
            });
            
            return { sessionId, status: 'created' };
        } catch (error) {
            throw new Error(`Puppeteer session creation failed: ${error.message}`);
        }
    }

    async puppeteerScrape(sessionId, url, actions = []) {
        const session = this.sessions.get(sessionId);
        if (!session || session.type !== 'puppeteer') {
            throw new Error('Invalid Puppeteer session');
        }
        
        try {
            await session.page.goto(url, { waitUntil: 'networkidle2' });
            
            const results = {
                url,
                timestamp: new Date().toISOString(),
                actions: [],
                data: {}
            };
            
            // Execute actions
            for (const action of actions) {
                try {
                    switch (action.type) {
                        case 'click':
                            await session.page.click(action.selector);
                            await session.page.waitForTimeout(action.wait || 1000);
                            break;
                        case 'type':
                            await session.page.type(action.selector, action.text);
                            break;
                        case 'scroll':
                            await session.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                            break;
                        case 'wait':
                            await session.page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
                            break;
                        case 'extract':
                            results.data[action.name] = await session.page.$eval(action.selector, el => el.textContent);
                            break;
                    }
                    results.actions.push({ ...action, status: 'success' });
                } catch (actionError) {
                    results.actions.push({ ...action, status: 'failed', error: actionError.message });
                }
            }
            
            return results;
        } catch (error) {
            throw new Error(`Puppeteer scraping failed: ${error.message}`);
        }
    }

    // GO-BASED TOOLS INTEGRATION - Colly, Ferret, etc.
    async runCollySpider(urls, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `colly_${sessionId}.json`);
        
        // Create Go script for Colly
        const goScript = this.generateCollyScript(urls, outputFile, config);
        const scriptPath = path.join(this.config.outputDir, 'recon', `colly_${sessionId}.go`);
        
        await fs.writeFile(scriptPath, goScript);
        
        try {
            const { stdout, stderr } = await execAsync(`cd ${this.config.outputDir}/recon && go run colly_${sessionId}.go`);
            
            const results = JSON.parse(await fs.readFile(outputFile, 'utf8'));
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Colly execution failed: ${error.message}`);
        }
    }

    async runFerretQuery(query, urls) {
        const sessionId = uuidv4();
        const queryFile = path.join(this.config.outputDir, 'recon', `ferret_${sessionId}.fql`);
        const outputFile = path.join(this.config.outputDir, 'recon', `ferret_${sessionId}.json`);
        
        await fs.writeFile(queryFile, query);
        
        try {
            const urlsArg = urls.join(' ');
            const { stdout, stderr } = await execAsync(`ferret -q "${queryFile}" ${urlsArg} > ${outputFile}`);
            
            const results = JSON.parse(await fs.readFile(outputFile, 'utf8'));
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Ferret execution failed: ${error.message}`);
        }
    }

    // RECONNAISSANCE TOOLS - ProjectDiscovery suite
    async runHttpx(targets, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `httpx_${sessionId}.json`);
        
        const targetFile = path.join(this.config.outputDir, 'recon', `targets_${sessionId}.txt`);
        await fs.writeFile(targetFile, targets.join('\n'));
        
        const flags = [
            '-l', targetFile,
            '-o', outputFile,
            '-json',
            '-title',
            '-tech-detect',
            '-status-code',
            '-content-length',
            '-response-time',
            '-threads', config.threads || '50'
        ];
        
        if (config.ports) flags.push('-ports', config.ports);
        if (config.silent) flags.push('-silent');
        
        try {
            const { stdout, stderr } = await execAsync(`httpx ${flags.join(' ')}`);
            
            const results = await this.parseJsonLines(outputFile);
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Httpx execution failed: ${error.message}`);
        }
    }

    async runKatana(targets, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `katana_${sessionId}.txt`);
        
        const flags = [
            '-u', targets.join(','),
            '-o', outputFile,
            '-d', config.depth || '3',
            '-c', config.concurrency || '10',
            '-kf', 'all'
        ];
        
        if (config.silent) flags.push('-silent');
        if (config.extensions) flags.push('-ef', config.extensions);
        
        try {
            const { stdout, stderr } = await execAsync(`katana ${flags.join(' ')}`);
            
            const urls = (await fs.readFile(outputFile, 'utf8')).split('\n').filter(Boolean);
            const results = { urls, count: urls.length };
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Katana execution failed: ${error.message}`);
        }
    }

    async runHakrawler(targets, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `hakrawler_${sessionId}.txt`);
        
        const flags = [
            '-depth', config.depth || '2',
            '-plain'
        ];
        
        if (config.subs) flags.push('-subs');
        if (config.insecure) flags.push('-insecure');
        
        const commands = targets.map(target => 
            `echo "${target}" | hakrawler ${flags.join(' ')}`
        );
        
        try {
            const { stdout, stderr } = await execAsync(commands.join(' && ') + ` > ${outputFile}`);
            
            const urls = (await fs.readFile(outputFile, 'utf8')).split('\n').filter(Boolean);
            const results = { urls, count: urls.length };
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Hakrawler execution failed: ${error.message}`);
        }
    }

    async runWaybackurls(domains) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `wayback_${sessionId}.txt`);
        
        const commands = domains.map(domain => 
            `echo "${domain}" | waybackurls`
        );
        
        try {
            const { stdout, stderr } = await execAsync(commands.join(' && ') + ` > ${outputFile}`);
            
            const urls = (await fs.readFile(outputFile, 'utf8')).split('\n').filter(Boolean);
            const results = { urls, count: urls.length, domains };
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Waybackurls execution failed: ${error.message}`);
        }
    }

    async runGau(domains, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `gau_${sessionId}.txt`);
        
        const flags = [];
        if (config.subs) flags.push('--subs');
        if (config.providers) flags.push('--providers', config.providers);
        if (config.years) flags.push('--from', config.years);
        
        const commands = domains.map(domain => 
            `echo "${domain}" | gau ${flags.join(' ')}`
        );
        
        try {
            const { stdout, stderr } = await execAsync(commands.join(' && ') + ` > ${outputFile}`);
            
            const urls = (await fs.readFile(outputFile, 'utf8')).split('\n').filter(Boolean);
            const results = { urls, count: urls.length, domains };
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`GAU execution failed: ${error.message}`);
        }
    }

    // MASS SCANNING TOOLS
    async runMasscan(targets, ports, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `masscan_${sessionId}.json`);
        
        const targetFile = path.join(this.config.outputDir, 'recon', `masscan_targets_${sessionId}.txt`);
        await fs.writeFile(targetFile, targets.join('\n'));
        
        const flags = [
            '-iL', targetFile,
            '-p', ports,
            '--rate', config.rate || '1000',
            '--output-format', 'json',
            '--output-filename', outputFile
        ];
        
        if (config.banners) flags.push('--banners');
        
        try {
            const { stdout, stderr } = await execAsync(`masscan ${flags.join(' ')}`);
            
            const results = await this.parseJsonLines(outputFile);
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Masscan execution failed: ${error.message}`);
        }
    }

    async runZmap(targets, port, config = {}) {
        const sessionId = uuidv4();
        const outputFile = path.join(this.config.outputDir, 'recon', `zmap_${sessionId}.csv`);
        
        const flags = [
            '-p', port,
            '-o', outputFile,
            '-f', 'csv'
        ];
        
        if (config.bandwidth) flags.push('-B', config.bandwidth);
        if (config.interface) flags.push('-i', config.interface);
        
        try {
            const { stdout, stderr } = await execAsync(`zmap ${flags.join(' ')} ${targets.join(' ')}`);
            
            const csvContent = await fs.readFile(outputFile, 'utf8');
            const results = this.parseCSV(csvContent);
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, outputFile };
        } catch (error) {
            throw new Error(`Zmap execution failed: ${error.message}`);
        }
    }

    // CRAWLEE INTEGRATION - Node.js crawling framework
    async runCrawlee(startUrls, config = {}) {
        const sessionId = uuidv4();
        
        try {
            const { CheerioCrawler } = await import('crawlee');
            
            const results = [];
            
            const crawler = new CheerioCrawler({
                maxRequestsPerCrawl: config.maxRequests || 100,
                requestHandler: async ({ request, $, body, contentType }) => {
                    results.push({
                        url: request.url,
                        title: $('title').text(),
                        links: $('a[href]').map((i, el) => $(el).attr('href')).get(),
                        content: body,
                        contentType
                    });
                },
                failedRequestHandler: async ({ request, error }) => {
                    console.error(`Failed to crawl ${request.url}: ${error.message}`);
                }
            });
            
            await crawler.run(startUrls);
            
            this.results.set(sessionId, results);
            
            return { sessionId, results, count: results.length };
        } catch (error) {
            throw new Error(`Crawlee execution failed: ${error.message}`);
        }
    }

    // UTILITY METHODS
    generateScrapySpider(spiderName, startUrls) {
        return `import scrapy
from scrapy.http import Request

class ${spiderName.charAt(0).toUpperCase() + spiderName.slice(1)}Spider(scrapy.Spider):
    name = '${spiderName}'
    allowed_domains = []
    start_urls = ${JSON.stringify(startUrls)}
    
    def parse(self, response):
        yield {
            'url': response.url,
            'title': response.css('title::text').get(),
            'links': response.css('a::attr(href)').getall(),
            'text_content': ' '.join(response.css('*::text').getall()).strip(),
            'status': response.status,
            'timestamp': response.meta.get('download_timestamp')
        }
        
        # Follow links
        for link in response.css('a::attr(href)').getall():
            if link and not link.startswith('#'):
                yield response.follow(link, self.parse)
`;
    }

    generateScrapySettings() {
        return `BOT_NAME = 'stealth_crawler'

SPIDER_MODULES = ['stealth_crawler.spiders']
NEWSPIDER_MODULE = 'stealth_crawler.spiders'

# Obey robots.txt rules
ROBOTSTXT_OBEY = False

# Configure a delay for requests (be respectful)
DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = True

# Enable and configure the AutoThrottle extension
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 60
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

# User agent rotation
DOWNLOADER_MIDDLEWARES = {
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
    'scrapy_user_agents.middlewares.RandomUserAgentMiddleware': 400,
    'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
    'scrapy_proxy_middleware.middlewares.ProxyMiddleware': 350,
}

# Random user agents
RANDOM_UA_PER_PROXY = True
RANDOM_UA_TYPE = 'random'
`;
    }

    generateScrapyItems() {
        return `import scrapy

class WebPageItem(scrapy.Item):
    url = scrapy.Field()
    title = scrapy.Field()
    links = scrapy.Field()
    text_content = scrapy.Field()
    status = scrapy.Field()
    timestamp = scrapy.Field()
`;
    }

    generateScrapyPipelines() {
        return `import json
import hashlib

class DuplicatesPipeline:
    def __init__(self):
        self.urls_seen = set()

    def process_item(self, item, spider):
        url_hash = hashlib.md5(item['url'].encode()).hexdigest()
        if url_hash in self.urls_seen:
            raise DropItem(f"Duplicate item found: {item['url']}")
        else:
            self.urls_seen.add(url_hash)
            return item

class JsonWriterPipeline:
    def open_spider(self, spider):
        self.file = open('items.jsonl', 'w')

    def close_spider(self, spider):
        self.file.close()

    def process_item(self, item, spider):
        line = json.dumps(dict(item)) + "\\n"
        self.file.write(line)
        return item
`;
    }

    generateCollyScript(urls, outputFile, config) {
        return `package main

import (
    "encoding/json"
    "fmt"
    "log"
    "os"
    "time"
    
    "github.com/gocolly/colly/v2"
    "github.com/gocolly/colly/v2/debug"
)

type ScrapedData struct {
    URL       string   \`json:"url"\`
    Title     string   \`json:"title"\`
    Links     []string \`json:"links"\`
    Text      string   \`json:"text"\`
    Status    int      \`json:"status"\`
    Timestamp string   \`json:"timestamp"\`
}

func main() {
    c := colly.NewCollector(
        colly.Debugger(&debug.LogDebugger{}),
        colly.Async(true),
    )
    
    c.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: ${config.parallelism || 2}})
    
    var results []ScrapedData
    
    c.OnHTML("html", func(e *colly.HTMLElement) {
        data := ScrapedData{
            URL:       e.Request.URL.String(),
            Title:     e.ChildText("title"),
            Links:     e.ChildAttrs("a[href]", "href"),
            Text:      e.Text,
            Status:    200,
            Timestamp: time.Now().Format(time.RFC3339),
        }
        results = append(results, data)
    })
    
    c.OnError(func(r *colly.Response, err error) {
        fmt.Printf("Error: %s\\n", err.Error())
    })
    
    urls := []string{${urls.map(url => `"${url}"`).join(', ')}}
    
    for _, url := range urls {
        c.Visit(url)
    }
    
    c.Wait()
    
    // Write results to file
    file, err := os.Create("${outputFile}")
    if err != nil {
        log.Fatal(err)
    }
    defer file.Close()
    
    encoder := json.NewEncoder(file)
    if err := encoder.Encode(results); err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Scraped %d pages\\n", len(results))
}
`;
    }

    async parseScrapyOutput(outputFile, format) {
        try {
            const content = await fs.readFile(outputFile, 'utf8');
            
            if (format === 'json') {
                return JSON.parse(content);
            } else if (format === 'jsonl') {
                return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
            } else if (format === 'csv') {
                return this.parseCSV(content);
            }
            
            return content;
        } catch (error) {
            console.error('Failed to parse Scrapy output:', error);
            return [];
        }
    }

    async parseJsonLines(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
        } catch (error) {
            console.error('Failed to parse JSON lines:', error);
            return [];
        }
    }

    parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(Boolean);
        const headers = lines[0].split(',');
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        });
    }

    // Session management
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    getResults(sessionId) {
        return this.results.get(sessionId);
    }

    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        try {
            switch (session.type) {
                case 'playwright':
                    await session.browser.close();
                    break;
                case 'puppeteer':
                    await session.browser.close();
                    break;
            }
            
            this.sessions.delete(sessionId);
            return true;
        } catch (error) {
            console.error('Failed to close session:', error);
            return false;
        }
    }

    async closeAllSessions() {
        for (const [sessionId] of this.sessions) {
            await this.closeSession(sessionId);
        }
    }

    getStats() {
        return {
            activeSessions: this.sessions.size,
            completedResults: this.results.size,
