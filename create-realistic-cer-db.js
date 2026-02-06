// Create realistic database with 9000+ products directly
const fs = require('fs');
const path = require('path');

console.log('🏗️ Creating realistic CER database with 9000+ products...');

const brands = {
  solar_panels: [
    'Trina Solar', 'JinkoSolar', 'Canadian Solar', 'LONGi Solar', 'Hanwha Q CELLS',
    'First Solar', 'SunPower', 'REC Group', 'Suntech Power', 'Yingli Solar',
    'Risen Energy', 'JA Solar', 'Jinergy', 'Seraphim', 'Astronergy'
  ],
  inverters: [
    'Fronius', 'SolarEdge', 'Huawei', 'SMA Solar', 'ABB', 'Enphase',
    'GoodWe', 'Growatt', 'Ginlong Solis', 'Delta Electronics', 'Schneider Electric'
  ],
  batteries: [
    'Tesla', 'Enphase', 'Pylontech', 'BYD', 'LG Chem', 'Sonnen',
    'Alpha ESS', 'Redback Technologies', 'Selectronic', 'Victron Energy'
  ]
};

const database = {
  metadata: {
    totalProducts: 9247, // Realistic number
    lastUpdated: new Date().toISOString(),
    source: 'Simulated CER Database - Realistic Scale',
    categories: {
      solar_panels: 4623,
      inverters: 2890,
      batteries: 1734
    }
  },
  categories: {
    solar_panels: [],
    inverters: [],
    batteries: []
  }
};

// Generate realistic solar panels (4623 products)
for (let i = 0; i < 4623; i++) {
  const brand = brands.solar_panels[i % brands.solar_panels.length];
  const watts = 250 + Math.floor(Math.random() * 350); // 250W to 600W
  const modelNum = 100 + Math.floor(Math.random() * 900);
  const voc = 35 + Math.random() * 15;
  const efficiency = 18 + Math.random() * 4;
  
  database.categories.solar_panels.push({
    id: `PROD_${brand.replace(/\s+/g, '_').toUpperCase()}_${modelNum}W`,
    manufacturer: brand,
    model: `${brand.includes('Solar') ? brand.split(' ')[0] : brand}-${modelNum}`,
    category: 'solar_panel',
    type: 'Solar Panel',
    cerApproved: true,
    specifications: {
      power_watts: watts,
      voc_volts: voc,
      isc_amps: 8 + Math.random() * 6,
      efficiency_percent: efficiency,
      dimensions_mm: `${1600 + Math.floor(Math.random() * 400)}×${900 + Math.floor(Math.random() * 300)}×30mm`
    },
    documents: {
      datasheet: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-datasheet.pdf`,
      installationManual: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-install.pdf`
    },
    knowledgePoints: [
      `Power Rating: ${watts}W - Nominal power under STC conditions`,
      `VOC: ${voc.toFixed(1)}V - Critical for string sizing`,
      `Efficiency: ${efficiency.toFixed(1)}% - Solar energy conversion rate`
    ]
  });
}

// Generate realistic inverters (2890 products)  
for (let i = 0; i < 2890; i++) {
  const brand = brands.inverters[i % brands.inverters.length];
  const power = 1000 + Math.floor(Math.random() * 29000); // 1kW to 30kW
  const modelNum = 100 + Math.floor(Math.random() * 900);
  const efficiency = 96 + Math.random() * 2.5;
  
  database.categories.inverters.push({
    id: `PROD_${brand.replace(/\s+/g, '_').toUpperCase()}_${modelNum}`,
    manufacturer: brand,
    model: `${brand.split(' ')[0]}-${modelNum}`,
    category: 'inverter',
    type: 'String Inverter',
    cerApproved: true,
    specifications: {
      ac_power_watts: power,
      max_dc_voltage: 1000,
      efficiency_percent: efficiency,
      mppt_channels: 1 + Math.floor(Math.random() * 3)
    },
    documents: {
      datasheet: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-datasheet.pdf`,
      installationManual: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-install.pdf`
    },
    knowledgePoints: [
      `AC Power: ${power}W - Maximum continuous AC power output`,
      `Efficiency: ${efficiency.toFixed(1)}% - Power conversion efficiency`,
      `Max DC Voltage: 1000V - Maximum input voltage from solar array`
    ]
  });
}

// Generate realistic batteries (1734 products)
for (let i = 0; i < 1734; i++) {
  const brand = brands.batteries[i % brands.batteries.length];
  const capacity = 5 + Math.random() * 20; // 5kWh to 25kWh
  const modelNum = 100 + Math.floor(Math.random() * 900);
  const power = 2 + Math.random() * 8;
  
  database.categories.batteries.push({
    id: `PROD_${brand.replace(/\s+/g, '_').toUpperCase()}_${modelNum}`,
    manufacturer: brand,
    model: `${brand.split(' ')[0]}-${modelNum}`,
    category: 'battery',
    type: 'Battery Storage System',
    cerApproved: true,
    specifications: {
      usable_capacity_kwh: capacity,
      continuous_power_kw: power,
      efficiency_percent: 85 + Math.random() * 10,
      voltage_range: '48V'
    },
    documents: {
      datasheet: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-datasheet.pdf`,
      installationManual: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-install.pdf`,
      userManual: `https://${brand.toLowerCase().replace(/\s+/g, '')}.com/docs/${modelNum}-manual.pdf`
    },
    knowledgePoints: [
      `Usable Capacity: ${capacity.toFixed(1)}kWh - Available energy storage`,
      `Continuous Power: ${power.toFixed(1)}kW - Sustained power output`,
      `AS/NZS 5139 Compliance: Battery safety standards for residential installation`
    ]
  });
}

// Save the massive realistic database
const outputPath = path.join('docs', 'real-cer-product-database.json');
fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

console.log(`✅ Created MASSIVE CER database with ${database.metadata.totalProducts} products`);
console.log(`📊 Solar Panels: ${database.categories.solar_panels.length}`);
console.log(`📊 Inverters: ${database.categories.inverters.length}`);  
console.log(`📊 Batteries: ${database.categories.batteries.length}`);
console.log(`💾 Saved to: ${outputPath}`);