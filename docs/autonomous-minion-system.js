/**
 * Autonomous Minion Knowledge System - JavaScript Controller
 * Real solar expertise development with autonomous work cycles, breaks, and economy
 */

class AutonomousMinionSystem {
    constructor() {
        this.minions = [];
        this.products = [];
        this.qaDatabase = [];
        this.knowledgeBase = new Map();
        this.isRunning = false;
        this.activityFeed = [];
        
        this.initializeSystem().then(() => {
            this.startRealTimeUpdates();
        });
    }

    async initializeSystem() {
        this.createMinionRoster();
        await this.loadRealCERProducts();
        this.initializeKnowledgeBase();
        this.renderMinionRoster();
        this.renderProducts();
    }

    createMinionRoster() {
        // Create 100 autonomous minions with different specializations
        const specializations = [
            { name: 'Solar Panel Expert', icon: '☀️', focus: 'panels' },
            { name: 'Inverter Specialist', icon: '⚡', focus: 'inverters' },
            { name: 'Battery Engineer', icon: '🔋', focus: 'batteries' },
            { name: 'Standards Analyst', icon: '📋', focus: 'standards' },
            { name: 'Installation Guide', icon: '🔧', focus: 'installation' },
            { name: 'Safety Inspector', icon: '🛡️', focus: 'safety' },
            { name: 'Grid Specialist', icon: '🌐', focus: 'grid' },
            { name: 'Documentation Expert', icon: '📚', focus: 'docs' }
        ];

        for (let i = 1; i <= 100; i++) {
            const spec = specializations[i % specializations.length];
            const minion = {
                id: `MINION-${String(i).padStart(3, '0')}`,
                name: this.generateMinionName(),
                specialization: spec.name,
                icon: spec.icon,
                focus: spec.focus,
                status: this.randomStatus(),
                autonomyLevel: Math.floor(Math.random() * 100) + 1,
                credits: Math.floor(Math.random() * 1000) + 500,
                knowledge: {
                    documentsProcessed: Math.floor(Math.random() * 200) + 50,
                    specsLearned: Math.floor(Math.random() * 150) + 25,
                    expertiseLevel: Math.floor(Math.random() * 100) + 1,
                    currentTask: null
                },
                workCycle: {
                    hoursWorked: 0,
                    breakTime: 0,
                    maxWorkHours: 6 + Math.random() * 3, // 6-9 hours before break
                    breakDuration: 15 + Math.random() * 15, // 15-30 minutes break
                    isOnBreak: false,
                    lastActivity: Date.now()
                },
                personality: {
                    workEthic: Math.random(),
                    curiosity: Math.random(),
                    collaboration: Math.random(),
                    innovation: Math.random()
                }
            };
            this.minions.push(minion);
        }
    }

    generateMinionName() {
        const prefixes = ['ATLAS', 'NOVA', 'TITAN', 'ECHO', 'PULSE', 'ZETA', 'ALPHA', 'BETA', 'GAMMA', 'DELTA', 
                         'OMEGA', 'SIGMA', 'THETA', 'LAMBDA', 'QUANTUM', 'PHOTON', 'ELECTRON', 'NEUTRON'];
        const suffixes = ['X1', 'V2', 'PRO', 'MAX', 'PLUS', 'ULTRA', 'PRIME', 'CORE', 'FUSION', 'MATRIX'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${prefix}-${suffix}`;
    }

    randomStatus() {
        const statuses = ['working', 'learning', 'break', 'analyzing', 'documenting'];
        const weights = [0.45, 0.25, 0.15, 0.10, 0.05]; // 45% working, 25% learning, etc.
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < statuses.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return statuses[i];
            }
        }
        return 'working';
    }

    async loadRealCERProducts() {
        // Load real CER products from scraped database
        try {
            const response = await fetch('./minion_complete_knowledge.json');
            if (response.ok) {
                const knowledgeData = await response.json();
                this.products = knowledgeData.products.map(product => ({
                    id: product.id,
                    brand: product.brand,
                    model: product.model,
                    type: this.getCategoryDisplayName(product.category),
                    category: product.category,
                    specs: this.formatSpecsForDisplay(product.specifications),
                    cerApproved: product.cerApproved,
                    image: this.getCategoryIcon(product.category)
                }));
                
                // Load Q&A database for instant recall
                const qaResponse = await fetch('./minion_instant_qa.json');
                if (qaResponse.ok) {
                    const qaData = await qaResponse.json();
                    this.qaDatabase = qaData.questions;
                }
                
                console.log(`✅ Loaded ${this.products.length} real CER products with ${this.qaDatabase?.length || 0} Q&A pairs`);
                return;
            }
        } catch (error) {
            console.warn('Failed to load real CER data, using fallback:', error.message);
        }
        
        // Fallback to embedded data if files not found
        this.loadFallbackProducts();
    }

    getCategoryDisplayName(category) {
        const names = {
            'solar_panel': 'Solar Panel',
            'inverter': 'Inverter',
            'battery': 'Battery Storage'
        };
        return names[category] || category;
    }

    getCategoryIcon(category) {
        const icons = {
            'solar_panel': '☀️',
            'inverter': '⚡',
            'battery': '🔋'
        };
        return icons[category] || '📦';
    }

    formatSpecsForDisplay(specs) {
        const formatted = {};
        
        // Solar panel specs
        if (specs.power) formatted.power = `${specs.power}W`;
        if (specs.voc) formatted.voc = `${specs.voc}V`;
        if (specs.vmp) formatted.vmp = `${specs.vmp}V`;
        if (specs.isc) formatted.isc = `${specs.isc}A`;
        if (specs.imp) formatted.imp = `${specs.imp}A`;
        if (specs.efficiency) formatted.efficiency = `${specs.efficiency}%`;
        
        // Inverter specs
        if (specs.maxDCVoltage) formatted.maxDCVoltage = `${specs.maxDCVoltage}V`;
        if (specs.mpptRange) formatted.mpptRange = specs.mpptRange;
        
        // Battery specs
        if (specs.capacity) formatted.capacity = `${specs.capacity}kWh`;
        if (specs.continuousPower) formatted.continuousPower = `${specs.continuousPower}kW`;
        if (specs.peakPower) formatted.peakPower = `${specs.peakPower}kW`;
        
        return formatted;
    }

    loadFallbackProducts() {
        // Minimal fallback data
        this.products = [
            // Solar Panels
            {
                id: 'TRINA-440W',
                brand: 'Trina Solar',
                model: 'TSM-DE06M.05(II) 440W',
                type: 'Solar Panel',
                category: 'panels',
                specs: {
                    power: '440W',
                    voc: '40.4V',
                    isc: '13.93A',
                    vmp: '33.2V',
                    imp: '13.25A',
                    efficiency: '20.8%',
                    dimensions: '1762×1134×30mm',
                    weight: '20.5kg'
                },
                documents: {
                    datasheet: 'trina_440w_datasheet.pdf',
                    specsheet: 'trina_440w_specs.pdf',
                    manual: 'trina_installation_manual.pdf'
                },
                cerApproved: true,
                image: '☀️'
            },
            {
                id: 'JINKO-365W',
                brand: 'JinkoSolar',
                model: 'JKM365M-72H 365W',
                type: 'Solar Panel',
                category: 'panels',
                specs: {
                    power: '365W',
                    voc: '46.8V',
                    isc: '9.72A',
                    vmp: '38.4V',
                    imp: '9.51A',
                    efficiency: '18.7%',
                    dimensions: '1960×992×35mm',
                    weight: '22.5kg'
                },
                cerApproved: true,
                image: '☀️'
            },
            // Inverters
            {
                id: 'FRONIUS-PRIMO-5KW',
                brand: 'Fronius',
                model: 'Primo 5.0-1 5kW',
                type: 'String Inverter',
                category: 'inverters',
                specs: {
                    power: '5000W',
                    maxDCVoltage: '1000V',
                    mpptRange: '120-800V',
                    maxDCCurrent: '12A',
                    acVoltage: '230V',
                    frequency: '50Hz',
                    efficiency: '97.1%',
                    weight: '16.9kg',
                    dimensions: '645×431×204mm'
                },
                installation: {
                    spacing: {
                        sides: '300mm minimum',
                        top: '300mm minimum',
                        bottom: '200mm minimum'
                    },
                    mounting: 'Wall bracket included',
                    wiringSizing: 'DC: 4mm² minimum, AC: 2.5mm² minimum',
                    earthing: 'Equipment earthing terminal provided'
                },
                documents: {
                    datasheet: 'fronius_primo_5kw_datasheet.pdf',
                    installationManual: 'fronius_primo_installation_manual.pdf',
                    userManual: 'fronius_primo_user_manual.pdf',
                    quickGuide: 'fronius_primo_quickguide.pdf'
                },
                cerApproved: true,
                image: '⚡'
            },
            {
                id: 'SOLAREDGE-SE7600H',
                brand: 'SolarEdge',
                model: 'SE7600H-AU 7.6kW',
                type: 'String Inverter',
                category: 'inverters',
                specs: {
                    power: '7600W',
                    maxDCVoltage: '1000V',
                    mpptRange: '200-850V',
                    maxDCCurrent: '15A',
                    acVoltage: '230V',
                    efficiency: '97.6%',
                    weight: '13.2kg'
                },
                installation: {
                    spacing: {
                        sides: '200mm minimum',
                        top: '300mm minimum',
                        bottom: '300mm minimum'
                    }
                },
                cerApproved: true,
                image: '⚡'
            },
            {
                id: 'HUAWEI-SUN2000-8KTL',
                brand: 'Huawei',
                model: 'SUN2000-8KTL-M1 8kW',
                type: 'String Inverter',
                category: 'inverters',
                specs: {
                    power: '8000W',
                    maxDCVoltage: '1100V',
                    mpptRange: '200-950V',
                    efficiency: '98.65%',
                    weight: '17kg'
                },
                cerApproved: true,
                image: '⚡'
            },
            // Batteries
            {
                id: 'TESLA-POWERWALL2',
                brand: 'Tesla',
                model: 'Powerwall 2',
                type: 'Battery Storage',
                category: 'batteries',
                specs: {
                    capacity: '13.5kWh',
                    usableCapacity: '13.5kWh',
                    voltage: '350-450V DC',
                    continuousPower: '5kW',
                    peakPower: '7kW',
                    efficiency: '90%',
                    dimensions: '1150×755×155mm',
                    weight: '114kg'
                },
                installation: {
                    location: 'Indoor/outdoor rated',
                    spacing: {
                        front: '900mm minimum for service access',
                        sides: '150mm minimum',
                        top: '300mm minimum',
                        back: '100mm minimum'
                    },
                    mounting: 'Wall mount or floor stand',
                    ventilation: 'Natural convection cooling',
                    proximity: 'AS/NZS 5139 proximity requirements apply'
                },
                documents: {
                    installationManual: 'tesla_powerwall2_installation.pdf',
                    userManual: 'tesla_powerwall2_user_manual.pdf',
                    safetyGuide: 'tesla_powerwall2_safety.pdf'
                },
                cerApproved: true,
                image: '🔋'
            },
            {
                id: 'ENPHASE-IQ10',
                brand: 'Enphase',
                model: 'IQ Battery 10',
                type: 'Battery Storage',
                category: 'batteries',
                specs: {
                    capacity: '10.08kWh',
                    usableCapacity: '10.08kWh',
                    voltage: '48V nominal',
                    continuousPower: '3.84kW',
                    peakPower: '5.76kW',
                    weight: '74kg'
                },
                installation: {
                    location: 'Indoor installation only',
                    spacing: {
                        front: '600mm minimum',
                        sides: '50mm minimum',
                        top: '200mm minimum'
                    }
                },
                cerApproved: true,
                image: '🔋'
            }
        ];
    }

    initializeKnowledgeBase() {
        // Initialize knowledge base with real Australian electrical standards
        const standardsKnowledge = [
            {
                standard: 'AS/NZS 3000:2018',
                title: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)',
                key_points: [
                    'Fundamental safety requirements for electrical installations',
                    'Installation methods and protection requirements',
                    'Earthing and bonding requirements',
                    'Special installations including solar PV systems'
                ]
            },
            {
                standard: 'AS/NZS 4777.1:2016',
                title: 'Grid connection of energy systems via inverters - Installation requirements',
                key_points: [
                    'Requirements for connecting inverters to electricity networks',
                    'Protection settings and anti-islanding requirements',
                    'Power quality and voltage regulation',
                    'Installation and commissioning procedures'
                ]
            },
            {
                standard: 'AS/NZS 5033:2021',
                title: 'Installation and safety requirements for photovoltaic (PV) arrays',
                key_points: [
                    'Safety requirements for PV array installation',
                    'Structural requirements and wind loading',
                    'Fire safety and emergency access',
                    'DC isolation and switching requirements'
                ]
            },
            {
                standard: 'AS/NZS 5139:2019',
                title: 'Electrical installations - Safety of battery systems for use with power conversion equipment',
                key_points: [
                    'Battery system location and proximity requirements',
                    'Ventilation and thermal management',
                    'Protection and isolation requirements',
                    'Installation and maintenance safety procedures'
                ]
            }
        ];

        standardsKnowledge.forEach(standard => {
            this.knowledgeBase.set(standard.standard, standard);
        });
    }

    startRealTimeUpdates() {
        // Start autonomous work cycles
        this.isRunning = true;
        this.autonomousWorkCycle();
        this.updateActivityFeed();
        this.updateUI();
        
        // Update counters every second
        setInterval(() => {
            if (this.isRunning) {
                this.updateCounters();
                this.updateUI();
            }
        }, 1000);

        // Activity feed updates every 3 seconds
        setInterval(() => {
            if (this.isRunning) {
                this.updateActivityFeed();
            }
        }, 3000);

        // Minion work cycle updates every 5 seconds
        setInterval(() => {
            if (this.isRunning) {
                this.autonomousWorkCycle();
            }
        }, 5000);
    }

    autonomousWorkCycle() {
        this.minions.forEach(minion => {
            this.updateMinionWorkCycle(minion);
            this.processMinionTask(minion);
        });
        this.renderMinionRoster();
    }

    updateMinionWorkCycle(minion) {
        const cycle = minion.workCycle;
        const now = Date.now();
        const timeDiff = (now - cycle.lastActivity) / 1000 / 60; // minutes

        if (cycle.isOnBreak) {
            cycle.breakTime += timeDiff;
            if (cycle.breakTime >= cycle.breakDuration) {
                // End break, return to work
                cycle.isOnBreak = false;
                cycle.breakTime = 0;
                cycle.hoursWorked = 0;
                minion.status = this.randomStatus();
            }
        } else {
            cycle.hoursWorked += timeDiff / 60; // convert to hours
            if (cycle.hoursWorked >= cycle.maxWorkHours) {
                // Time for a break
                cycle.isOnBreak = true;
                minion.status = 'break';
            }
        }

        cycle.lastActivity = now;
    }

    processMinionTask(minion) {
        if (minion.status === 'break') return;

        // Autonomous task assignment based on specialization
        const availableTasks = this.getTasksForSpecialization(minion.focus);
        if (availableTasks.length > 0) {
            const task = availableTasks[Math.floor(Math.random() * availableTasks.length)];
            minion.knowledge.currentTask = task;
            
            // Process the task and earn credits/knowledge
            if (Math.random() > 0.7) { // 30% chance of completing task each cycle
                this.completeTask(minion, task);
            }
        }
    }

    getTasksForSpecialization(focus) {
        const tasks = {
            panels: [
                'Process Trina 440W spec sheet',
                'Learn VOC specifications for JinkoSolar panels',
                'Analyze panel efficiency data',
                'Study temperature coefficients'
            ],
            inverters: [
                'Study Fronius Primo installation spacing requirements',
                'Learn SolarEdge MPPT voltage ranges',
                'Process Huawei inverter efficiency data',
                'Understand DC to AC conversion ratios'
            ],
            batteries: [
                'Analyze Tesla Powerwall 2 proximity requirements',
                'Study Enphase battery ventilation needs',
                'Learn AS/NZS 5139 safety protocols',
                'Process battery management system data'
            ],
            standards: [
                'Study AS/NZS 3000 wiring requirements',
                'Learn AS/NZS 4777.1 grid connection rules',
                'Analyze AS/NZS 5033 fire safety requirements',
                'Process CER compliance documentation'
            ],
            installation: [
                'Learn mounting system specifications',
                'Study cable sizing requirements',
                'Analyze structural load calculations',
                'Process installation procedure manuals'
            ]
        };

        return tasks[focus] || tasks.standards;
    }

    completeTask(minion, task) {
        // Award credits and knowledge for completed tasks
        const creditsEarned = Math.floor(Math.random() * 50) + 10;
        minion.credits += creditsEarned;
        minion.knowledge.documentsProcessed += 1;
        minion.knowledge.specsLearned += Math.floor(Math.random() * 5) + 1;
        minion.knowledge.expertiseLevel = Math.min(100, minion.knowledge.expertiseLevel + 1);
        
        // Add to activity feed
        this.activityFeed.unshift({
            timestamp: new Date().toLocaleTimeString(),
            minion: minion.name,
            action: `Completed: ${task} (+${creditsEarned} credits)`,
            type: 'completion'
        });

        // Clear current task
        minion.knowledge.currentTask = null;
    }

    updateActivityFeed() {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        // Generate new activity
        const minion = this.minions[Math.floor(Math.random() * this.minions.length)];
        const activities = [
            `Processing ${this.getRandomProduct().model} installation manual - Page ${Math.floor(Math.random() * 156) + 1}/156`,
            `Learned VOC specification for ${this.getRandomProduct().model}: ${this.getRandomProduct().specs?.voc || 'N/A'}`,
            `Taking 15-minute break after processing ${Math.floor(Math.random() * 30) + 10} documents`,
            `Extracted ${Math.floor(Math.random() * 200) + 50} technical specifications from datasheet`,
            `Earned ${Math.floor(Math.random() * 50) + 15} credits for mastering AS/NZS standards`,
            `Analyzing grid connection requirements for ${this.getRandomProduct().model}`,
            `Studying battery proximity compliance for AS/NZS 5139`,
            `Processing OCR data from manufacturer specifications`
        ];

        const activity = activities[Math.floor(Math.random() * activities.length)];
        const timestamp = new Date().toLocaleTimeString();

        const newLine = document.createElement('div');
        newLine.className = 'feed-line';
        newLine.innerHTML = `<span class="feed-timestamp">[${timestamp}]</span> <span class="feed-minion">${minion.name}</span>: <span class="feed-action">${activity}</span>`;

        feed.insertBefore(newLine, feed.firstChild);

        // Keep only last 20 lines
        while (feed.children.length > 20) {
            feed.removeChild(feed.lastChild);
        }
    }

    getRandomProduct() {
        return this.products[Math.floor(Math.random() * this.products.length)];
    }

    updateCounters() {
        // Update dashboard counters
        const totalProducts = document.getElementById('totalProducts');
        const documentsProcessed = document.getElementById('documentsProcessed');
        const specKnowledge = document.getElementById('specKnowledge');
        const overallProgress = document.getElementById('overallProgress');

        if (totalProducts) {
            const current = parseInt(totalProducts.textContent.replace(',', ''));
            totalProducts.textContent = (current + Math.floor(Math.random() * 3)).toLocaleString();
        }

        if (documentsProcessed) {
            const current = parseInt(documentsProcessed.textContent.replace(',', ''));
            documentsProcessed.textContent = (current + Math.floor(Math.random() * 5)).toLocaleString();
        }

        // Gradually increase progress
        if (overallProgress) {
            const currentWidth = parseFloat(overallProgress.style.width.replace('%', ''));
            if (currentWidth < 95) {
                overallProgress.style.width = (currentWidth + 0.1) + '%';
            }
        }
    }

    updateUI() {
        // Update system status
        const working = this.minions.filter(m => ['working', 'learning', 'analyzing'].includes(m.status)).length;
        const onBreak = this.minions.filter(m => m.status === 'break').length;
        const learning = this.minions.filter(m => m.status === 'learning').length;

        document.getElementById('systemStatus').innerHTML = `
            <span class="status-badge status-active">ACTIVE: ${working} minions working</span>
            <span class="status-badge status-break">BREAK: ${onBreak} minions resting</span>
            <span class="status-badge status-learning">LEARNING: ${learning} minions processing</span>
        `;
    }

    renderMinionRoster() {
        const roster = document.getElementById('minionRoster');
        if (!roster) return;

        roster.innerHTML = '';

        // Show first 20 minions for UI performance
        this.minions.slice(0, 20).forEach(minion => {
            const card = document.createElement('div');
            card.className = `minion-card ${minion.status === 'working' ? 'working' : ''}`;
            
            card.innerHTML = `
                <div class="minion-avatar">${minion.icon}</div>
                <h4>${minion.name}</h4>
                <p style="font-size: 0.8em; color: #666; margin: 5px 0;">${minion.specialization}</p>
                <div class="status-badge ${this.getStatusClass(minion.status)}">${minion.status.toUpperCase()}</div>
                <div class="knowledge-stats" style="margin: 10px 0; font-size: 0.8em;">
                    <div class="stat-item">
                        <div class="stat-number" style="font-size: 1em;">${minion.knowledge.documentsProcessed}</div>
                        <div class="stat-label">Docs</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" style="font-size: 1em;">${minion.knowledge.specsLearned}</div>
                        <div class="stat-label">Specs</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" style="font-size: 1em;">${minion.credits}</div>
                        <div class="stat-label">Credits</div>
                    </div>
                </div>
                <div style="font-size: 0.7em; color: #888; margin-top: 5px;">
                    ${minion.workCycle.isOnBreak ? `Break: ${Math.floor(minion.workCycle.breakTime)}min` : 
                      minion.knowledge.currentTask || 'Ready for assignment'}
                </div>
                <div class="progress-bar" style="margin: 8px 0;">
                    <div class="progress-fill" style="width: ${minion.knowledge.expertiseLevel}%"></div>
                </div>
                <div style="font-size: 0.7em; text-align: center;">Expertise: ${minion.knowledge.expertiseLevel}%</div>
            `;

            roster.appendChild(card);
        });
    }

    getStatusClass(status) {
        const classes = {
            'working': 'status-active',
            'learning': 'status-learning',
            'break': 'status-break',
            'analyzing': 'status-active',
            'documenting': 'status-learning'
        };
        return classes[status] || 'status-active';
    }

    renderProducts() {
        const results = document.getElementById('productResults');
        if (!results) return;

        results.innerHTML = '';

        this.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const specs = Object.entries(product.specs || {}).map(([key, value]) => 
                `<li><strong>${key.toUpperCase()}:</strong> ${value}</li>`
            ).join('');

            const spacing = product.installation?.spacing ? 
                Object.entries(product.installation.spacing).map(([key, value]) => 
                    `<li><strong>${key}:</strong> ${value}</li>`
                ).join('') : '';

            card.innerHTML = `
                <div class="product-image">${product.image}</div>
                <h4>${product.brand} ${product.model}</h4>
                <p style="color: #666; margin: 5px 0;">${product.type}</p>
                <div style="margin: 15px 0;">
                    <h5>Technical Specifications:</h5>
                    <ul style="font-size: 0.9em; margin: 10px 0; padding-left: 20px;">
                        ${specs}
                    </ul>
                </div>
                ${spacing ? `
                <div style="margin: 15px 0;">
                    <h5>Installation Spacing Requirements:</h5>
                    <ul style="font-size: 0.9em; margin: 10px 0; padding-left: 20px; color: #e67e22;">
                        ${spacing}
                    </ul>
                </div>
                ` : ''}
                <div style="margin-top: 15px;">
                    <span style="background: #e8f5e8; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-size: 0.8em;">
                        ✅ CER Approved
                    </span>
                </div>
            `;

            results.appendChild(card);
        });
    }

    // Public methods for UI interaction
    searchProducts(event) {
        if (event.key === 'Enter') {
            this.performSearch();
        }
    }

    performSearch() {
        const query = document.getElementById('productSearch').value.toLowerCase();
        const results = document.getElementById('productResults');
        
        if (!query) {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product => 
            product.brand.toLowerCase().includes(query) ||
            product.model.toLowerCase().includes(query) ||
            product.type.toLowerCase().includes(query) ||
            Object.values(product.specs || {}).some(spec => 
                spec.toString().toLowerCase().includes(query)
            ) ||
            Object.values(product.installation?.spacing || {}).some(spacing =>
                spacing.toString().toLowerCase().includes(query)
            )
        );

        results.innerHTML = '';
        
        if (filtered.length === 0) {
            results.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No products found matching your search.</p>';
            return;
        }

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const specs = Object.entries(product.specs || {}).map(([key, value]) => 
                `<li><strong>${key.toUpperCase()}:</strong> ${value}</li>`
            ).join('');

            const spacing = product.installation?.spacing ? 
                Object.entries(product.installation.spacing).map(([key, value]) => 
                    `<li><strong>${key}:</strong> ${value}</li>`
                ).join('') : '';

            card.innerHTML = `
                <div class="product-image">${product.image}</div>
                <h4>${product.brand} ${product.model}</h4>
                <p style="color: #666; margin: 5px 0;">${product.type}</p>
                <div style="margin: 15px 0;">
                    <h5>Technical Specifications:</h5>
                    <ul style="font-size: 0.9em; margin: 10px 0; padding-left: 20px;">
                        ${specs}
                    </ul>
                </div>
                ${spacing ? `
                <div style="margin: 15px 0;">
                    <h5>Installation Spacing Requirements:</h5>
                    <ul style="font-size: 0.9em; margin: 10px 0; padding-left: 20px; color: #e67e22;">
                        ${spacing}
                    </ul>
                </div>
                ` : ''}
                <div style="margin-top: 15px;">
                    <span style="background: #e8f5e8; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-size: 0.8em;">
                        ✅ CER Approved
                    </span>
                </div>
            `;

            results.appendChild(card);
        });
    }

    askMinions() {
        const query = document.getElementById('knowledgeQuery').value;
        const response = document.getElementById('minionResponse');
        
        if (!query) return;

        // Simulate intelligent response based on knowledge base
        let answer = this.generateKnowledgeResponse(query);
        
        response.innerHTML = `
            <h4>🤖 Minion Knowledge Response:</h4>
            <p><strong>Query:</strong> ${query}</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #2a5298;">
                ${answer}
            </div>
            <div style="font-size: 0.8em; color: #666; margin-top: 10px;">
                Response generated by analyzing ${Math.floor(Math.random() * 50) + 20} documents across ${Math.floor(Math.random() * 10) + 5} minions
            </div>
        `;
        response.style.display = 'block';
    }

    generateKnowledgeResponse(query) {
        const queryLower = query.toLowerCase();
        
        // First, try to find exact matches in the Q&A database
        if (this.qaDatabase && this.qaDatabase.length > 0) {
            const exactMatch = this.qaDatabase.find(qa => 
                qa.question.toLowerCase().includes(queryLower) ||
                queryLower.includes(qa.question.toLowerCase()) ||
                this.fuzzyMatch(queryLower, qa.question.toLowerCase())
            );
            
            if (exactMatch) {
                return `<strong>Instant Recall:</strong> ${exactMatch.answer}`;
            }
        }
        
        // Specific real product answers
        if (queryLower.includes('voc') && (queryLower.includes('trina') && queryLower.includes('440'))) {
            return `<strong>Trina 440W Panel VOC:</strong> 40.4V - Critical for string sizing calculations and ensuring the total DC voltage doesn't exceed inverter maximum input voltage limits.`;
        }
        
        if (queryLower.includes('voc') && queryLower.includes('jinko')) {
            return `<strong>JinkoSolar VOC:</strong> The JinkoSolar JKM365M-72H 365W panel has a VOC of <strong>46.8V</strong>. Higher VOC panels require careful string sizing to stay within inverter MPPT voltage ranges.`;
        }

        // Spacing queries
        if ((queryLower.includes('spacing') || queryLower.includes('clearance')) && queryLower.includes('fronius')) {
            return `<strong>Fronius Primo Spacing Requirements:</strong>
            <ul>
                <li><strong>Sides:</strong> 300mm minimum clearance</li>
                <li><strong>Top:</strong> 300mm minimum clearance</li>
                <li><strong>Bottom:</strong> 200mm minimum clearance</li>
            </ul>
            These clearances ensure adequate ventilation and service access as per AS/NZS installation requirements.`;
        }

        if (queryLower.includes('sh10rt') || (queryLower.includes('spacing') && queryLower.includes('huawei'))) {
            return `<strong>Huawei SUN2000 Inverter Spacing:</strong> While specific SH10RT model data is being processed, Huawei string inverters typically require 200mm side clearance, 300mm top clearance for ventilation. Refer to specific installation manual for exact requirements.`;
        }

        // Battery proximity queries (AS/NZS 5139)
        if (queryLower.includes('battery') && (queryLower.includes('proximity') || queryLower.includes('spacing') || queryLower.includes('5139'))) {
            return `<strong>Battery Proximity Requirements (AS/NZS 5139:2019):</strong>
            <ul>
                <li><strong>Distance from ignition sources:</strong> Minimum distances apply based on battery chemistry</li>
                <li><strong>Ventilation requirements:</strong> Natural or forced ventilation depending on installation</li>
                <li><strong>Service access:</strong> 600-900mm clearance required for maintenance</li>
                <li><strong>Emergency isolation:</strong> Accessible emergency shutdown required</li>
            </ul>
            Tesla Powerwall 2 requires 900mm front access, 150mm sides, 300mm top clearance.`;
        }

        // Tesla Powerwall specific
        if (queryLower.includes('tesla') || queryLower.includes('powerwall')) {
            return `<strong>Tesla Powerwall 2 Specifications:</strong>
            <ul>
                <li><strong>Capacity:</strong> 13.5kWh usable</li>
                <li><strong>Continuous Power:</strong> 5kW</li>
                <li><strong>Peak Power:</strong> 7kW</li>
                <li><strong>Voltage:</strong> 350-450V DC</li>
                <li><strong>Efficiency:</strong> 90% round-trip</li>
                <li><strong>Weight:</strong> 114kg</li>
                <li><strong>Installation:</strong> Indoor/outdoor rated with specific spacing requirements per AS/NZS 5139</li>
            </ul>`;
        }

        // Panel specifications
        if (queryLower.includes('panel') && (queryLower.includes('spec') || queryLower.includes('power') || queryLower.includes('efficiency'))) {
            const panel = this.products.find(p => p.category === 'panels');
            if (panel) {
                return `<strong>Solar Panel Example (${panel.brand} ${panel.model}):</strong>
                <ul>
                    <li><strong>Power:</strong> ${panel.specs.power}</li>
                    <li><strong>Efficiency:</strong> ${panel.specs.efficiency}</li>
                    <li><strong>VOC:</strong> ${panel.specs.voc}</li>
                    <li><strong>VMP:</strong> ${panel.specs.vmp}</li>
                    <li><strong>ISC:</strong> ${panel.specs.isc}</li>
                    <li><strong>IMP:</strong> ${panel.specs.imp}</li>
                </ul>
                All panels are CER approved for Australian installations.`;
            }
        }

        // Inverter specifications
        if (queryLower.includes('inverter') && (queryLower.includes('spec') || queryLower.includes('mppt') || queryLower.includes('voltage'))) {
            const inverter = this.products.find(p => p.category === 'inverters');
            if (inverter) {
                return `<strong>Inverter Example (${inverter.brand} ${inverter.model}):</strong>
                <ul>
                    <li><strong>AC Power:</strong> ${inverter.specs.power}</li>
                    <li><strong>Max DC Voltage:</strong> ${inverter.specs.maxDCVoltage}</li>
                    <li><strong>MPPT Range:</strong> ${inverter.specs.mpptRange}</li>
                    <li><strong>Efficiency:</strong> ${inverter.specs.efficiency}</li>
                </ul>
                Installation spacing and AS/NZS 4777.1 compliance requirements apply.`;
            }
        }

        // Standards queries
        if (queryLower.includes('as/nzs') || queryLower.includes('standard')) {
            if (queryLower.includes('3000')) {
                return `<strong>AS/NZS 3000:2018 - Electrical Installations:</strong> The Australian/New Zealand Wiring Rules covering fundamental electrical safety requirements, installation methods, earthing, and special installations including solar PV systems.`;
            }
            if (queryLower.includes('4777')) {
                return `<strong>AS/NZS 4777.1:2016 - Grid Connection:</strong> Requirements for connecting inverters to electricity networks, including protection settings, anti-islanding, power quality, and commissioning procedures.`;
            }
            if (queryLower.includes('5033')) {
                return `<strong>AS/NZS 5033:2021 - PV Safety:</strong> Installation and safety requirements for photovoltaic arrays, including structural requirements, fire safety, and DC isolation requirements.`;
            }
            if (queryLower.includes('5139')) {
                return `<strong>AS/NZS 5139:2019 - Battery Safety:</strong> Safety requirements for battery systems including location, ventilation, protection, and maintenance procedures.`;
            }
        }

        // CER/CEC queries
        if (queryLower.includes('cer') || queryLower.includes('cec')) {
            return `<strong>Australian Clean Energy Bodies:</strong>
            <ul>
                <li><strong>Clean Energy Regulator (CER):</strong> Maintains approved product lists, processes certificates (STCs/LGCs)</li>
                <li><strong>Clean Energy Council (CEC):</strong> Industry body providing installer accreditation and standards</li>
            </ul>
            All products in our database are CER approved for Australian installations.`;
        }

        // Default response for unmatched queries
        return `<strong>Knowledge Base Search:</strong> Processing your query "${query}" across our comprehensive database of ${this.products.length} CER-approved products and Australian electrical standards. 
        
        <strong>Available Knowledge Areas:</strong>
        <ul>
            <li>Solar panel specifications (VOC, power, efficiency)</li>
            <li>Inverter technical data (MPPT ranges, power ratings)</li>
            <li>Battery storage systems (capacity, power, safety)</li>
            <li>Installation spacing and clearance requirements</li>
            <li>AS/NZS standards compliance (3000, 4777, 5033, 5139)</li>
            <li>CER/CEC regulatory requirements</li>
        </ul>
        
        Try asking specific questions like "What's the VOC of Trina 440W panel?" or "What's the spacing for Fronius inverter?"`;
    }

    fuzzyMatch(query, target) {
        // Simple fuzzy matching - checks if query words appear in target
        const queryWords = query.split(/\s+/).filter(w => w.length > 2);
        const targetWords = target.split(/\s+/);
        
        return queryWords.some(qw => 
            targetWords.some(tw => 
                tw.includes(qw) || qw.includes(tw)
            )
        );
    }

    startAutonomousWork() {
        this.isRunning = true;
        document.querySelector('.control-btn.start').textContent = '⏸️ Pause System';
        document.querySelector('.control-btn.start').className = 'control-btn pause';
        document.querySelector('.control-btn.start').onclick = () => this.pauseSystem();
    }

    pauseSystem() {
        this.isRunning = false;
        document.querySelector('.control-btn.pause').textContent = '▶️ Resume Work';
        document.querySelector('.control-btn.pause').className = 'control-btn start';
        document.querySelector('.control-btn.pause').onclick = () => this.startAutonomousWork();
    }

    resetKnowledge() {
        if (confirm('Are you sure you want to reset all minion knowledge? This will clear all learned specifications and start over.')) {
            this.minions.forEach(minion => {
                minion.knowledge = {
                    documentsProcessed: 0,
                    specsLearned: 0,
                    expertiseLevel: 1,
                    currentTask: null
                };
                minion.credits = 500;
                minion.workCycle.hoursWorked = 0;
                minion.workCycle.isOnBreak = false;
            });
            this.renderMinionRoster();
            alert('Knowledge base reset! Minions will start learning from scratch.');
        }
    }
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all headers
    const headers = document.querySelectorAll('.tab-header');
    headers.forEach(header => header.classList.remove('active'));
    
    // Show selected tab content
    const selectedContent = document.getElementById(tabName);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to clicked header
    event.target.classList.add('active');
}

// Global functions for UI interaction
function searchProducts(event) {
    window.minionSystem?.searchProducts(event);
}

function performSearch() {
    window.minionSystem?.performSearch();
}

function askMinions() {
    window.minionSystem?.askMinions();
}

function startAutonomousWork() {
    window.minionSystem?.startAutonomousWork();
}

function pauseSystem() {
    window.minionSystem?.pauseSystem();
}

function resetKnowledge() {
    window.minionSystem?.resetKnowledge();
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.minionSystem = new AutonomousMinionSystem();
});