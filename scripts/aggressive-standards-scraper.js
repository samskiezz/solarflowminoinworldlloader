const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Aggressive AS/NZS Standards Information Scraper
// Looks for publicly available excerpts, summaries, and references

const targets = [
    // Educational and government sources
    'https://www.acma.gov.au',
    'https://www.cleanenergycouncil.org.au', 
    'https://www.smartenergy.org.au',
    'https://arena.gov.au',
    'https://www.energysafetycomm.gov.au',
    
    // Training and professional sources
    'https://www.neca.asn.au',
    'https://www.masterelectricians.com.au',
    'https://www.eeaa.asn.au',
    
    // Technical forums and wikis
    'https://www.whirlpool.net.au/wiki',
    'https://forums.whirlpool.net.au',
    
    // Industry publications
    'https://www.ecmag.com.au',
    'https://www.pv-magazine.com.au',
    'https://renew.org.au'
];

const standardsToFind = [
    'AS/NZS 3000',
    'AS/NZS 5033', 
    'AS/NZS 5139',
    'AS/NZS 4777',
    'AS 3100',
    'AS 1768',
    'AS 4509',
    'AS 4755'
];

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000
        };
        
        const req = client.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ url, status: res.statusCode, data }));
        });
        
        req.on('error', err => reject({ url, error: err.message }));
        req.on('timeout', () => reject({ url, error: 'timeout' }));
    });
}

function extractStandardsInfo(html, url) {
    const findings = [];
    
    for (const standard of standardsToFind) {
        // Look for standard mentions with context
        const regex = new RegExp(`${standard.replace('/', '\\/')}[^\\n]*`, 'gi');
        const matches = html.match(regex) || [];
        
        matches.forEach(match => {
            // Extract surrounding context (100 chars before and after)
            const index = html.indexOf(match);
            const start = Math.max(0, index - 100);
            const end = Math.min(html.length, index + match.length + 100);
            const context = html.substring(start, end);
            
            findings.push({
                standard,
                match: match.trim(),
                context: context.replace(/\\s+/g, ' ').trim(),
                source: url,
                timestamp: new Date().toISOString()
            });
        });
        
        // Look for specific technical terms
        const technicalTerms = [
            'DC isolator',
            'PV array',
            'battery installation',
            'grid connection',
            'electrical safety',
            'wiring rules',
            'AS.?3000',
            'AS.?5033',
            'AS.?5139',
            'earthing',
            'protection',
            'isolation'
        ];
        
        technicalTerms.forEach(term => {
            const termRegex = new RegExp(`[^\\n]*${term}[^\\n]*`, 'gi');
            const termMatches = html.match(termRegex) || [];
            
            termMatches.forEach(termMatch => {
                if (termMatch.toLowerCase().includes(standard.toLowerCase())) {
                    findings.push({
                        standard,
                        technical_term: term,
                        content: termMatch.trim(),
                        source: url,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });
    }
    
    return findings;
}

async function scrapeAll() {
    console.log('🔍 Starting aggressive AS/NZS standards information scraping...');
    
    const allFindings = [];
    const errors = [];
    
    for (const target of targets) {
        try {
            console.log(`📡 Scraping: ${target}`);
            const result = await makeRequest(target);
            
            if (result.status === 200) {
                const findings = extractStandardsInfo(result.data, target);
                allFindings.push(...findings);
                console.log(`✅ Found ${findings.length} standard references at ${target}`);
            } else {
                console.log(`⚠️ HTTP ${result.status} for ${target}`);
            }
            
            // Be respectful - small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log(`❌ Error scraping ${target}: ${error.error || error.message}`);
            errors.push({ target, error: error.error || error.message });
        }
    }
    
    // Save results
    const output = {
        scraped_at: new Date().toISOString(),
        total_sources: targets.length,
        successful_scrapes: targets.length - errors.length,
        total_findings: allFindings.length,
        standards_found: [...new Set(allFindings.map(f => f.standard))],
        findings: allFindings,
        errors: errors,
        summary: {
            by_standard: {},
            by_source: {}
        }
    };
    
    // Generate summary statistics
    allFindings.forEach(finding => {
        // By standard
        if (!output.summary.by_standard[finding.standard]) {
            output.summary.by_standard[finding.standard] = 0;
        }
        output.summary.by_standard[finding.standard]++;
        
        // By source
        if (!output.summary.by_source[finding.source]) {
            output.summary.by_source[finding.source] = 0;
        }
        output.summary.by_source[finding.source]++;
    });
    
    const outputPath = path.join(__dirname, '..', 'docs', 'scraped-standards-findings.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\\n📊 SCRAPING COMPLETE:`);
    console.log(`✅ Sources scraped: ${targets.length - errors.length}/${targets.length}`);
    console.log(`📋 Total findings: ${allFindings.length}`);
    console.log(`📄 Standards found: ${output.standards_found.length}`);
    console.log(`💾 Results saved to: ${outputPath}`);
    
    // Create a summary report
    const reportPath = path.join(__dirname, '..', 'docs', 'standards-scraping-report.md');
    const report = generateReport(output);
    fs.writeFileSync(reportPath, report);
    console.log(`📑 Report saved to: ${reportPath}`);
    
    return output;
}

function generateReport(data) {
    return `# AS/NZS Standards Scraping Report

**Generated:** ${data.scraped_at}
**Sources Scraped:** ${data.successful_scrapes}/${data.total_sources}
**Total Findings:** ${data.total_findings}

## Standards Found

${data.standards_found.map(std => `- ${std} (${data.summary.by_standard[std]} references)`).join('\\n')}

## Top Sources

${Object.entries(data.summary.by_source)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([source, count]) => `- ${source}: ${count} findings`)
  .join('\\n')}

## Sample Findings

${data.findings.slice(0, 20).map(finding => `
### ${finding.standard}
**Source:** ${finding.source}
**Content:** ${finding.match || finding.content || 'N/A'}
**Context:** ${finding.context ? finding.context.substring(0, 200) + '...' : 'N/A'}
`).join('\\n')}

## Scraping Errors

${data.errors.length > 0 ? 
  data.errors.map(err => `- ${err.target}: ${err.error}`).join('\\n') : 
  'No errors occurred during scraping.'}

---
*This report contains publicly available information about AS/NZS standards found on educational, government, and industry websites.*
`;
}

// Run the scraper
if (require.main === module) {
    scrapeAll().catch(console.error);
}

module.exports = { scrapeAll };