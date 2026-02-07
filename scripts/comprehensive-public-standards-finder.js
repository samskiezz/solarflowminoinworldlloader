#!/usr/bin/env node

// COMPREHENSIVE PUBLIC STANDARDS FINDER
// Systematically searches for ALL publicly available AS/NZS standards content online

const fs = require('fs');
const path = require('path');

// Target AS/NZS standards for comprehensive search
const targetStandards = [
    "AS/NZS 3000:2018", "AS/NZS 3000:2007", "AS/NZS 3000", 
    "AS/NZS 5033:2021", "AS/NZS 5033:2014", "AS/NZS 5033",
    "AS/NZS 5139:2019", "AS/NZS 5139:2017", "AS/NZS 5139",
    "AS/NZS 4777.1:2016", "AS/NZS 4777.2:2020", "AS/NZS 4777",
    "AS/NZS 1768", "AS/NZS 1170", "AS/NZS 3008", "AS/NZS 3012",
    "AS 3000", "AS 5033", "AS 5139", "AS 4777", "AS 1768", "AS 1170"
];

// Comprehensive list of legitimate public sources to search
const publicSourceDomains = [
    // Australian Government
    "gov.au", "cleanenergyregulator.gov.au", "acma.gov.au", "aemo.com.au",
    
    // State Government Electrical Safety
    "esv.vic.gov.au", "energysafe.vic.gov.au", "safework.nsw.gov.au", 
    "worksafe.qld.gov.au", "worksafe.wa.gov.au", "safework.sa.gov.au",
    "worksafe.tas.gov.au", "comcare.gov.au", "workcover.nt.gov.au",
    
    // Educational Institutions
    "edu.au", "unsw.edu.au", "usyd.edu.au", "unimelb.edu.au", "monash.edu.au",
    "uts.edu.au", "qut.edu.au", "griffith.edu.au", "uq.edu.au", "adelaide.edu.au",
    "flinders.edu.au", "unisa.edu.au", "murdoch.edu.au", "curtin.edu.au",
    "uwa.edu.au", "deakin.edu.au", "latrobe.edu.au", "rmit.edu.au",
    
    // TAFE and Training
    "tafensw.edu.au", "tafe.qld.edu.au", "tafesa.edu.au", "polytechnic.wa.edu.au",
    "tafeqld.edu.au", "tafensw.edu.au", "southmetrotafe.wa.edu.au",
    
    // Industry Associations
    "cleanenergycouncil.org.au", "saa.org.au", "standards.org.au", 
    "neca.asn.au", "masterelectricians.com.au", "solar.org.au",
    
    // Research and Technical Organizations
    "csiro.au", "arena.gov.au", "cefc.com.au", "ata.org.au",
    
    // Fire and Emergency Services
    "fire.nsw.gov.au", "cfa.vic.gov.au", "qfes.qld.gov.au", "dfes.wa.gov.au",
    "safecom.sa.gov.au", "fire.tas.gov.au", "esa.act.gov.au",
    
    // Building and Construction
    "abcb.gov.au", "planning.org.au", "aibs.com.au", "aia.com.au",
    
    // Professional Bodies
    "engineersaustralia.org.au", "iea.org.au", "ieaust.org.au"
];

// Search patterns for finding public content
const searchPatterns = {
    direct_standards: [
        '"AS/NZS 3000" electrical installation requirements',
        '"AS/NZS 5033" solar PV installation',
        '"AS/NZS 5139" battery storage safety',
        '"AS/NZS 4777" grid connection inverter',
        '"AS 3000" wiring rules requirements',
        '"AS 5033" photovoltaic installation',
        '"AS 5139" battery system safety',
        '"AS 4777" grid connection'
    ],
    
    educational_content: [
        'electrical installation standards australia university course',
        'solar PV installation training TAFE australia',
        'electrical safety AS/NZS training materials',
        'wiring rules course materials australia',
        'battery storage safety training australia',
        'grid connection standards course australia'
    ],
    
    government_guidance: [
        'electrical safety installation requirements government',
        'solar installation safety guidelines australia',
        'battery storage location requirements australia',
        'grid connection approval process australia',
        'electrical contractor licensing requirements',
        'solar installer accreditation australia'
    ],
    
    industry_guidelines: [
        'clean energy council installation guidelines',
        'electrical safety standards industry australia',
        'solar installation best practice australia',
        'battery storage industry guidelines',
        'NECA electrical installation standards',
        'master electricians installation requirements'
    ],
    
    technical_documents: [
        'electrical installation specification australia',
        'solar PV system design guidelines',
        'battery energy storage system requirements',
        'inverter grid connection procedures',
        'electrical safety inspection checklist',
        'solar installation compliance checklist'
    ],
    
    public_consultations: [
        'AS/NZS standards public consultation',
        'electrical safety regulation consultation australia',
        'solar installation standards review',
        'battery storage safety consultation',
        'grid connection standards consultation'
    ]
};

// File types to prioritize
const priorityFileTypes = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'html', 'htm'
];

// Generate comprehensive search commands
function generateSearchStrategies() {
    const strategies = [];
    
    // Strategy 1: Direct domain searches for each standard
    targetStandards.forEach(standard => {
        publicSourceDomains.forEach(domain => {
            strategies.push({
                type: 'domain_standard',
                query: `site:${domain} "${standard}"`,
                description: `Search ${domain} for ${standard}`
            });
        });
    });
    
    // Strategy 2: Educational institution searches
    const eduDomains = publicSourceDomains.filter(d => d.includes('edu.au'));
    searchPatterns.educational_content.forEach(pattern => {
        eduDomains.forEach(domain => {
            strategies.push({
                type: 'educational',
                query: `site:${domain} ${pattern}`,
                description: `Educational search: ${pattern} on ${domain}`
            });
        });
    });
    
    // Strategy 3: Government guidance searches
    const govDomains = publicSourceDomains.filter(d => d.includes('gov.au'));
    searchPatterns.government_guidance.forEach(pattern => {
        govDomains.forEach(domain => {
            strategies.push({
                type: 'government',
                query: `site:${domain} ${pattern}`,
                description: `Government search: ${pattern} on ${domain}`
            });
        });
    });
    
    // Strategy 4: File type specific searches
    priorityFileTypes.forEach(fileType => {
        targetStandards.forEach(standard => {
            strategies.push({
                type: 'filetype',
                query: `"${standard}" filetype:${fileType} site:edu.au OR site:gov.au`,
                description: `${fileType.toUpperCase()} files for ${standard} on educational/government sites`
            });
        });
    });
    
    // Strategy 5: Industry association searches
    const industryDomains = [
        'cleanenergycouncil.org.au', 'saa.org.au', 'standards.org.au',
        'neca.asn.au', 'masterelectricians.com.au'
    ];
    searchPatterns.industry_guidelines.forEach(pattern => {
        industryDomains.forEach(domain => {
            strategies.push({
                type: 'industry',
                query: `site:${domain} ${pattern}`,
                description: `Industry search: ${pattern} on ${domain}`
            });
        });
    });
    
    return strategies;
}

// Generate specific search URLs for different engines
function generateSearchUrls(strategy) {
    const encodedQuery = encodeURIComponent(strategy.query);
    
    return {
        google: `https://www.google.com/search?q=${encodedQuery}`,
        duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
        bing: `https://www.bing.com/search?q=${encodedQuery}`,
        startpage: `https://www.startpage.com/sp/search?query=${encodedQuery}`,
        yandex: `https://yandex.com/search/?text=${encodedQuery}`
    };
}

// Prioritize searches by likelihood of finding public content
function prioritizeStrategies(strategies) {
    const priorities = {
        'educational': 1,  // Highest - universities often have public course materials
        'government': 2,   // High - government guidance is usually public
        'domain_standard': 3, // Medium-High - direct standard searches
        'industry': 4,     // Medium - industry associations often have public guides
        'filetype': 5      // Lower - more specific but fewer results
    };
    
    return strategies.sort((a, b) => 
        (priorities[a.type] || 999) - (priorities[b.type] || 999)
    );
}

// Generate comprehensive search plan
function generateSearchPlan() {
    console.log('🔍 COMPREHENSIVE PUBLIC STANDARDS FINDER');
    console.log('========================================');
    console.log(`📋 Target Standards: ${targetStandards.length}`);
    console.log(`🏛️ Public Source Domains: ${publicSourceDomains.length}`);
    console.log(`🔍 Search Pattern Categories: ${Object.keys(searchPatterns).length}`);
    
    const strategies = generateSearchStrategies();
    const prioritizedStrategies = prioritizeStrategies(strategies);
    
    console.log(`\n🎯 Total Search Strategies Generated: ${strategies.length}`);
    
    // Group strategies by type for reporting
    const strategyGroups = {};
    prioritizedStrategies.forEach(strategy => {
        if (!strategyGroups[strategy.type]) strategyGroups[strategy.type] = [];
        strategyGroups[strategy.type].push(strategy);
    });
    
    console.log('\n📊 Strategy Breakdown:');
    Object.entries(strategyGroups).forEach(([type, strategies]) => {
        console.log(`  ${type}: ${strategies.length} searches`);
    });
    
    // Save comprehensive search plan
    const searchPlan = {
        generated: new Date().toISOString(),
        total_strategies: strategies.length,
        target_standards: targetStandards,
        public_sources: publicSourceDomains,
        search_patterns: searchPatterns,
        prioritized_strategies: prioritizedStrategies.slice(0, 100), // Top 100 for practical use
        strategy_breakdown: Object.fromEntries(
            Object.entries(strategyGroups).map(([type, strats]) => [type, strats.length])
        )
    };
    
    // Generate sample search URLs for top strategies
    console.log('\n🔍 TOP PRIORITY SEARCHES:');
    console.log('(Copy these URLs to search manually)\n');
    
    prioritizedStrategies.slice(0, 10).forEach((strategy, index) => {
        console.log(`${index + 1}. ${strategy.description}`);
        const urls = generateSearchUrls(strategy);
        console.log(`   Google: ${urls.google}`);
        console.log(`   DuckDuckGo: ${urls.duckduckgo}`);
        console.log('');
    });
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'docs', 'comprehensive-search-plan.json');
    fs.writeFileSync(outputPath, JSON.stringify(searchPlan, null, 2));
    
    console.log(`💾 Comprehensive search plan saved to: ${outputPath}`);
    console.log('\n✅ READY TO SEARCH ALL PUBLIC SOURCES');
    console.log('🎯 Focus on educational institutions and government agencies first');
    console.log('📖 All searches target legitimate public educational/government content only');
    
    return searchPlan;
}

// Execute the comprehensive search planning
generateSearchPlan();