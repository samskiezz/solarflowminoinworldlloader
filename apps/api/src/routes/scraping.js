/**
 * SCRAPING API ROUTES - ALL TOOLS INTEGRATED
 */

import { ScrapingEngine } from '../scraping/ScrapingEngine.js';
import { z } from 'zod';

const scrapingEngine = new ScrapingEngine({
    outputDir: process.env.SCRAPING_OUTPUT_DIR || './data/scraping',
    timeout: 60000,
    concurrent: 10
});

export async function scrapingRoutes(fastify, options) {

    // SCRAPY ROUTES
    fastify.post('/scraping/scrapy/create', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            projectName: z.string().min(1),
            spiderName: z.string().min(1),
            startUrls: z.array(z.string().url())
        });
        
        const { projectName, spiderName, startUrls } = schema.parse(request.body);
        
        const result = await scrapingEngine.createScrapyProject(projectName, spiderName, startUrls);
        
        await fastify.auditLog(
            request.user.sub,
            'CREATE_SCRAPY_PROJECT',
            'scraping',
            result.sessionId,
            { projectName, spiderName, urlCount: startUrls.length },
            request
        );
        
        return result;
    });

    fastify.post('/scraping/scrapy/:sessionId/run', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const { outputFormat = 'json' } = request.body;
        
        const result = await scrapingEngine.runScrapySpider(sessionId, outputFormat);
        
        return result;
    });

    // PLAYWRIGHT ROUTES
    fastify.post('/scraping/playwright/session', { preHandler: [fastify.auth] }, async (request) => {
        const { headless = true, contextOptions = {} } = request.body;
        
        const result = await scrapingEngine.createPlaywrightSession({ headless, contextOptions });
        
        return result;
    });

    fastify.post('/scraping/playwright/:sessionId/scrape', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const schema = z.object({
            url: z.string().url(),
            selectors: z.record(z.object({
                selector: z.string(),
                type: z.enum(['text', 'html', 'attribute', 'multiple']),
                attribute: z.string().optional()
            })).optional().default({})
        });
        
        const { url, selectors } = schema.parse(request.body);
        
        const result = await scrapingEngine.playwrightScrape(sessionId, url, selectors);
        
        return result;
    });

    // PUPPETEER ROUTES
    fastify.post('/scraping/puppeteer/session', { preHandler: [fastify.auth] }, async (request) => {
        const { headless = true } = request.body;
        
        const result = await scrapingEngine.createPuppeteerSession({ headless });
        
        return result;
    });

    fastify.post('/scraping/puppeteer/:sessionId/scrape', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const schema = z.object({
            url: z.string().url(),
            actions: z.array(z.object({
                type: z.enum(['click', 'type', 'scroll', 'wait', 'extract']),
                selector: z.string().optional(),
                text: z.string().optional(),
                name: z.string().optional(),
                wait: z.number().optional(),
                timeout: z.number().optional()
            })).optional().default([])
        });
        
        const { url, actions } = schema.parse(request.body);
        
        const result = await scrapingEngine.puppeteerScrape(sessionId, url, actions);
        
        return result;
    });

    // GO TOOLS ROUTES
    fastify.post('/scraping/colly', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            urls: z.array(z.string().url()),
            parallelism: z.number().optional().default(2),
            depth: z.number().optional().default(1)
        });
        
        const { urls, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runCollySpider(urls, config);
        
        return result;
    });

    fastify.post('/scraping/ferret', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            query: z.string().min(1),
            urls: z.array(z.string().url())
        });
        
        const { query, urls } = schema.parse(request.body);
        
        const result = await scrapingEngine.runFerretQuery(query, urls);
        
        return result;
    });

    // RECONNAISSANCE ROUTES
    fastify.post('/recon/httpx', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            targets: z.array(z.string()),
            threads: z.number().optional(),
            ports: z.string().optional(),
            silent: z.boolean().optional()
        });
        
        const { targets, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runHttpx(targets, config);
        
        await fastify.auditLog(
            request.user.sub,
            'RUN_HTTPX',
            'recon',
            result.sessionId,
            { targetCount: targets.length },
            request
        );
        
        return result;
    });

    fastify.post('/recon/katana', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            targets: z.array(z.string().url()),
            depth: z.number().optional(),
            concurrency: z.number().optional(),
            extensions: z.string().optional(),
            silent: z.boolean().optional()
        });
        
        const { targets, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runKatana(targets, config);
        
        return result;
    });

    fastify.post('/recon/hakrawler', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            targets: z.array(z.string().url()),
            depth: z.number().optional(),
            subs: z.boolean().optional(),
            insecure: z.boolean().optional()
        });
        
        const { targets, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runHakrawler(targets, config);
        
        return result;
    });

    fastify.post('/recon/wayback', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            domains: z.array(z.string())
        });
        
        const { domains } = schema.parse(request.body);
        
        const result = await scrapingEngine.runWaybackurls(domains);
        
        return result;
    });

    fastify.post('/recon/gau', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            domains: z.array(z.string()),
            subs: z.boolean().optional(),
            providers: z.string().optional(),
            years: z.string().optional()
        });
        
        const { domains, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runGau(domains, config);
        
        return result;
    });

    // MASS SCANNING ROUTES
    fastify.post('/recon/masscan', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            targets: z.array(z.string()),
            ports: z.string(),
            rate: z.string().optional(),
            banners: z.boolean().optional()
        });
        
        const { targets, ports, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runMasscan(targets, ports, config);
        
        await fastify.auditLog(
            request.user.sub,
            'RUN_MASSCAN',
            'recon',
            result.sessionId,
            { targetCount: targets.length, ports },
            request
        );
        
        return result;
    });

    fastify.post('/recon/zmap', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            targets: z.array(z.string()),
            port: z.string(),
            bandwidth: z.string().optional(),
            interface: z.string().optional()
        });
        
        const { targets, port, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runZmap(targets, port, config);
        
        return result;
    });

    // CRAWLEE ROUTES
    fastify.post('/scraping/crawlee', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            startUrls: z.array(z.string().url()),
            maxRequests: z.number().optional()
        });
        
        const { startUrls, ...config } = schema.parse(request.body);
        
        const result = await scrapingEngine.runCrawlee(startUrls, config);
        
        return result;
    });

    // SESSION MANAGEMENT
    fastify.get('/scraping/sessions', { preHandler: [fastify.auth] }, async (request) => {
        const stats = scrapingEngine.getStats();
        
        return {
            ...stats,
            sessions: Array.from(scrapingEngine.sessions.entries()).map(([id, session]) => ({
                sessionId: id,
                type: session.type,
                status: session.status
            }))
        };
    });

    fastify.get('/scraping/session/:sessionId', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const session = scrapingEngine.getSession(sessionId);
        
        if (!session) {
            throw fastify.httpErrors.notFound('Session not found');
        }
        
        return { sessionId, ...session };
    });

    fastify.delete('/scraping/session/:sessionId', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const closed = await scrapingEngine.closeSession(sessionId);
        
        if (!closed) {
            throw fastify.httpErrors.notFound('Session not found');
        }
        
        return { success: true };
    });

    fastify.get('/scraping/results/:sessionId', { preHandler: [fastify.auth] }, async (request) => {
        const sessionId = request.params.sessionId;
        const results = scrapingEngine.getResults(sessionId);
        
        if (!results) {
            throw fastify.httpErrors.notFound('Results not found');
        }
        
        return { sessionId, results };
    });

    // BULK OPERATIONS
    fastify.post('/scraping/bulk/urls', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            urls: z.array(z.string().url()),
            tools: z.array(z.enum(['httpx', 'katana', 'hakrawler'])),
            config: z.object({}).optional()
        });
        
        const { urls, tools, config = {} } = schema.parse(request.body);
        
        const results = {};
        
        for (const tool of tools) {
            try {
                switch (tool) {
                    case 'httpx':
                        results[tool] = await scrapingEngine.runHttpx(urls, config);
                        break;
                    case 'katana':
                        results[tool] = await scrapingEngine.runKatana(urls, config);
                        break;
                    case 'hakrawler':
                        results[tool] = await scrapingEngine.runHakrawler(urls, config);
                        break;
                }
            } catch (error) {
                results[tool] = { error: error.message };
            }
        }
        
        return { bulkResults: results };
    });

    fastify.post('/scraping/bulk/domains', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            domains: z.array(z.string()),
            tools: z.array(z.enum(['wayback', 'gau', 'httpx'])),
            config: z.object({}).optional()
        });
        
        const { domains, tools, config = {} } = schema.parse(request.body);
        
        const results = {};
        
        for (const tool of tools) {
            try {
                switch (tool) {
                    case 'wayback':
                        results[tool] = await scrapingEngine.runWaybackurls(domains);
                        break;
                    case 'gau':
                        results[tool] = await scrapingEngine.runGau(domains, config);
                        break;
                    case 'httpx':
                        results[tool] = await scrapingEngine.runHttpx(domains, config);
                        break;
                }
            } catch (error) {
                results[tool] = { error: error.message };
            }
        }
        
        return { bulkResults: results };
    });

    // PIPELINE CREATION
    fastify.post('/scraping/pipeline', { preHandler: [fastify.auth] }, async (request) => {
        const schema = z.object({
            name: z.string(),
            steps: z.array(z.object({
                tool: z.string(),
                config: z.object({}).optional(),
                inputFrom: z.string().optional() // previous step name
            })),
            initialInput: z.object({
                urls: z.array(z.string().url()).optional(),
                domains: z.array(z.string()).optional(),
                targets: z.array(z.string()).optional()
            })
        });
        
        const { name, steps, initialInput } = schema.parse(request.body);
        
        const pipelineId = require('crypto').randomUUID();
        const results = { pipelineId, name, steps: [] };
        
        let currentData = initialInput;
        
        for (const [index, step] of steps.entries()) {
            try {
                let stepResult;
                
                // Use output from previous step if specified
                if (step.inputFrom && results.steps.length > 0) {
                    const previousStep = results.steps.find(s => s.name === step.inputFrom);
                    if (previousStep) {
                        currentData = previousStep.output;
                    }
                }
                
                switch (step.tool) {
                    case 'httpx':
                        stepResult = await scrapingEngine.runHttpx(
                            currentData.targets || currentData.urls || currentData.domains,
                            step.config || {}
                        );
                        break;
                    case 'katana':
                        stepResult = await scrapingEngine.runKatana(
                            currentData.urls || [],
                            step.config || {}
                        );
                        break;
                    case 'wayback':
                        stepResult = await scrapingEngine.runWaybackurls(
                            currentData.domains || []
                        );
                        break;
                    default:
                        throw new Error(`Unknown tool: ${step.tool}`);
                }
                
                results.steps.push({
                    step: index + 1,
                    tool: step.tool,
                    status: 'completed',
                    output: stepResult.results,
                    sessionId: stepResult.sessionId
                });
                
                currentData = stepResult.results;
                
            } catch (error) {
                results.steps.push({
                    step: index + 1,
                    tool: step.tool,
                    status: 'failed',
                    error: error.message
                });
                break; // Stop pipeline on error
            }
        }
        
        await fastify.auditLog(
            request.user.sub,
            'RUN_SCRAPING_PIPELINE',
            'scraping',
            pipelineId,
            { name, stepCount: steps.length },
            request
        );
        
        return results;
    });
}