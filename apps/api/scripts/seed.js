import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create standards references
  const standards = [
    {
      code: 'AS/NZS 5033',
      edition: '2021',
      title: 'Installation and safety requirements for photovoltaic (PV) arrays',
      clauses: [
        { clause: '4.3.1', title: 'General installation requirements', category: 'installation' },
        { clause: '4.3.2', title: 'DC circuit requirements', category: 'electrical' },
        { clause: '5.3', title: 'Array frame earthing', category: 'earthing' },
        { clause: '6.4.3', title: 'DC isolation switch', category: 'safety' },
        { clause: '7.3', title: 'Cable protection', category: 'installation' }
      ],
      tags: ['solar', 'installation', 'safety', 'dc-circuits']
    },
    {
      code: 'AS/NZS 4777',
      edition: '2016',
      title: 'Grid connection of energy systems via inverters',
      clauses: [
        { clause: '3.3.4', title: 'Voltage rise limitations', category: 'grid-connection' },
        { clause: '4.2', title: 'Inverter certification requirements', category: 'equipment' },
        { clause: '5.1', title: 'Power quality requirements', category: 'grid-connection' },
        { clause: '6.3', title: 'Protection system requirements', category: 'protection' }
      ],
      tags: ['inverter', 'grid-connection', 'power-quality']
    },
    {
      code: 'AS/NZS 5139',
      edition: '2019',
      title: 'Electrical installations - Safety of battery systems for use with power conversion equipment',
      clauses: [
        { clause: '4.6', title: 'Battery location and clearances', category: 'installation' },
        { clause: '5.2', title: 'Ventilation requirements', category: 'safety' },
        { clause: '6.1', title: 'Fire safety provisions', category: 'fire-safety' },
        { clause: '7.4', title: 'Emergency shutdown systems', category: 'safety' }
      ],
      tags: ['battery', 'safety', 'installation', 'fire-safety']
    }
  ];

  for (const standard of standards) {
    await prisma.standardsReference.upsert({
      where: { code_edition: { code: standard.code, edition: standard.edition } },
      update: {},
      create: standard
    });
  }

  // Create sample CER products
  const cerProducts = [
    {
      manufacturer: 'SMA',
      model: 'SB 3.0-1AV-41',
      productType: 'inverter',
      cerNumber: 'A123456',
      approvalDate: new Date('2023-01-15'),
      technicalSpecs: {
        power: '3000W',
        voltage: '230V',
        efficiency: '97.1%',
        inputVoltage: '125-750V DC'
      },
      testReports: [
        { type: 'safety', url: '/reports/sma-sb30-safety.pdf' },
        { type: 'performance', url: '/reports/sma-sb30-performance.pdf' }
      ],
      source: 'cer-api',
      sourceVersion: '2024.1',
      sourceChecksum: 'sha256:abc123...'
    },
    {
      manufacturer: 'Trina Solar',
      model: 'TSM-440NEG21C.20',
      productType: 'panel',
      cerNumber: 'P789012',
      approvalDate: new Date('2023-03-20'),
      technicalSpecs: {
        power: '440W',
        voltage: '40.4V',
        current: '10.89A',
        efficiency: '21.3%',
        temperature: '-40°C to +85°C'
      },
      testReports: [
        { type: 'iec61215', url: '/reports/trina-440-iec61215.pdf' },
        { type: 'iec61730', url: '/reports/trina-440-iec61730.pdf' }
      ],
      source: 'cer-api',
      sourceVersion: '2024.1',
      sourceChecksum: 'sha256:def456...'
    },
    {
      manufacturer: 'Tesla',
      model: 'Powerwall 2',
      productType: 'battery',
      cerNumber: 'B345678',
      approvalDate: new Date('2022-11-10'),
      technicalSpecs: {
        capacity: '13.5kWh',
        voltage: '50.4V',
        power: '5kW continuous',
        chemistry: 'Lithium-ion',
        warranty: '10 years'
      },
      testReports: [
        { type: 'safety', url: '/reports/tesla-pw2-safety.pdf' },
        { type: 'performance', url: '/reports/tesla-pw2-performance.pdf' }
      ],
      limitations: ['Indoor installation only', 'Temperature range: -10°C to 50°C'],
      source: 'cer-api',
      sourceVersion: '2024.1',
      sourceChecksum: 'sha256:ghi789...'
    }
  ];

  for (const product of cerProducts) {
    await prisma.cERProduct.upsert({
      where: { cerNumber: product.cerNumber },
      update: {},
      create: product
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });