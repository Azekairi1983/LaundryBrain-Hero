const C = require('./core.js');

// Minimal fake DOM: map IDs to values matching the user's preset
const values = Object.assign(Object.create(null), {
  days: '30',
  rateElec: '0.32',
  rateGas: '1.80',
  rateWater: '0.018',
  wfoldPrice: '1.90',
  wfoldLbs: '180',
  vendRev: '1200',
  vendCogsPct: '40',
  applyLifts: '1',
  retoolBudget: '65000',
  brandBudget: '35000',
  lifeWasher: '13',
  lifeDryer: '17',
  rent: '9500',
  laborHrsDay: '12',
  wage: '22',
  effElecPct: '8',
  effGasPct: '12',
  effWaterPct: '15',
  hotSharePct: '60',
  deltaT: '65',
  heaterEffPct: '80',
  maintBasePct: '8',
  maintAgeUpliftPct: '3',
  projCost: '1043735',
  cashInv: '260934',
  aPct: '65',
  bPct: '15',
  aRate: '7.25',
  bRate: '9.5',
  aTerm: '20',
  bTerm: '15',
  workingCap: '25000',
  includeLiftsInProject: '1',
  taxEquipLife: '7',
  fedTaxRate: '21',
  stateTaxRate: '8.84',
  depreciationMethod: 'macrs',
  entityType: 'llc',
  revGrowPct: '2.5',
  opexInflPct: '3.0',
  horizon: '10'
});

global.document = {
  getElementById(id){
    const val = values[id];
    // Provide simple element shapes the core expects
    if (id === 'hotWaterCostDisplay') {
      return { textContent: '', style: { display: 'none' } };
    }
    if (id === 'constraintNote' || id === 'hotWaterCostDisplay' || id === 'autoMarketStatus') {
      return { innerHTML: '', textContent: '', style: {} };
    }
    if (val === undefined) return { value: '' };
    return { value: String(val) };
  }
};

// make `window` available as a browser would
global.window = global;

// Inject equipment defs and costs matching Index.html
global.washerDefs = [
  { name:"20lb Top-Load", count:8, vend:3.25, turns:2.2, mins:28, kwh:0.4, therms:0, gals:20, age:5 },
  { name:"27lb Top-Load", count:6, vend:4.25, turns:2.3, mins:32, kwh:0.5, therms:0, gals:25, age:4 },
  { name:"40lb Front-Load", count:4, vend:6.00, turns:2.0, mins:35, kwh:0.3, therms:0, gals:35, age:3 },
  { name:"60lb Front-Load", count:2, vend:8.50, turns:1.8, mins:40, kwh:0.4, therms:0, gals:50, age:2 },
  { name:"80lb Front-Load", count:2, vend:11.00, turns:1.6, mins:45, kwh:0.6, therms:0, gals:70, age:1 }
];

global.dryerDefs = [
  { name:"Stack Dryer", count:12, pricePerMin:0.25, avgMins:35, cycles:3.8, kwh:0.3, therms:0.35, age:3 },
  { name:"Single Dryer", count:6, pricePerMin:0.25, avgMins:45, cycles:3.4, kwh:0.4, therms:0.25, age:4 }
];

global.equipCosts = {
  "20lb Top-Load": 4500,
  "27lb Top-Load": 5200,
  "40lb Front-Load": 12000,
  "60lb Front-Load": 20000,
  "80lb Front-Load": 28000,
  "Stack Dryer": 9000,
  "Single Dryer": 12000
};

// Run snapshot and simulation
const snapshot = C.calculateSnapshot();
const sim = C.simulateYears();

console.log('snapshot key metrics:');
console.log('Monthly EBITDA', snapshot.ebitda.toFixed(2));
console.log('Monthly Cash Flow', snapshot.cashFlow.toFixed(2));
console.log('Total Debt Service (annual)', (snapshot.totalDebtService*12).toFixed(2));
console.log('DSCR', snapshot.dscr.toFixed(2));
console.log('Stressed DSCR', snapshot.stressedDSCR.toFixed(2));
console.log('Cash-on-Cash (%)', snapshot.cashOnCash.toFixed(2));
console.log('Industry Valuation', snapshot.industryValuation.toFixed(2));

console.log('\nFirst 3 simulation years (revenues, ebitda, cashFlow, dscr):');
for (let i = 0; i < 3; i++){
  console.log(`${sim.years[i]}: ${sim.revenues[i].toFixed(0)}, ${sim.ebitdas[i].toFixed(0)}, ${sim.cashFlows[i].toFixed(0)}, ${sim.dscrs[i].toFixed(2)}`);
}

// Expose full snapshot for inspection if needed
console.log('\nFull snapshot keys:', Object.keys(snapshot));

process.exit(0);
