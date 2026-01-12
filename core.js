(function(){
  // Core finance module extracted from Index.html
  // Provides: pmt, LaundryCalculator, calculateDepreciation, calculateTaxes,
  // calcAgeRisk, getCashInvestedBases, calculateSnapshot, simulateYears, compute

  function pmt(rate, nper, pv) {
    if (rate === 0) return -(pv / nper);
    return -(pv * rate) / (1 - Math.pow(1 + rate, -nper));
  }

  class LaundryCalculator {
    static calculateEquipmentRevenue(washers, dryers, daysPerMonth) {
      let washRev = 0;
      washers.forEach(w => {
        washRev += w.count * w.vend * w.turns * daysPerMonth;
      });
      
      let dryRev = 0;
      dryers.forEach(d => {
        dryRev += d.count * d.pricePerMin * d.avgMins * d.cycles * daysPerMonth;
      });
      
      return { washRev, dryRev, total: washRev + dryRev };
    }
    
    static calculateUtilityCosts(washers, dryers, rates, daysPerMonth, effFactors = {}) {
      const effE = 1 - (effFactors.elec || 0);
      const effG = 1 - (effFactors.gas || 0);
      const effW = 1 - (effFactors.water || 0);
      
      let elec = 0, gas = 0, water = 0;
      
      washers.forEach(w => {
        const cycles = w.count * w.turns * daysPerMonth;
        elec += cycles * w.kwh * rates.elec * effE;
        gas += cycles * w.therms * rates.gas * effG;
        water += cycles * w.gals * rates.water * effW;
      });
      
      dryers.forEach(d => {
        const cycles = d.count * d.cycles * daysPerMonth;
        elec += cycles * d.kwh * rates.elec * effE;
        gas += cycles * d.therms * rates.gas * effG;
      });
      
      return { elec, gas, water, total: elec + gas + water };
    }
    
    static calculateMaintenanceCosts(baseRevenue, basePct, ageUpliftPct, washers, dryers) {
      const baseMaint = baseRevenue * basePct / 100;
      let totalUnits = 0, oldUnits = 0;
      
      washers.forEach(w => { totalUnits += w.count; if (w.age >= 9) oldUnits += w.count; });
      dryers.forEach(d => { totalUnits += d.count; if (d.age >= 9) oldUnits += d.count; });

      const ageShare = totalUnits ? oldUnits / totalUnits : 0;
      const ageAdj = baseRevenue * (ageUpliftPct / 100) * ageShare;
      return baseMaint + ageAdj;
    }
    
    static calculateIndustryLifts(baseRevenue, retoolBudget, brandBudget) {
      const retoolLiftPct = Math.min(retoolBudget / 1000 * 0.25, 20);
      const brandLiftPct = Math.min(brandBudget / 1000 * 0.5, 12);
      const totalLiftPct = Math.min(retoolLiftPct + brandLiftPct, 30);
      const actualRetoolPct = totalLiftPct > 30 ? retoolLiftPct * (30 / (retoolLiftPct + brandLiftPct)) : retoolLiftPct;
      const actualBrandPct = totalLiftPct > 30 ? brandLiftPct * (30 / (retoolLiftPct + brandLiftPct)) : brandLiftPct;
      
      const retoolLift = baseRevenue * actualRetoolPct / 100;
      const brandLift = baseRevenue * actualBrandPct / 100;
      const totalLift = retoolLift + brandLift;
      
      return { retoolLift, brandLift, totalLift, retoolLiftPct: actualRetoolPct, brandLiftPct: actualBrandPct };
    }
  }

  const macrsSchedule7Year = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446];
  function calculateDepreciation(costBasis, method, life, year) {
    if (method === 'macrs' && life === 7) {
      return (year >= 1 && year <= macrsSchedule7Year.length) ? costBasis * macrsSchedule7Year[year - 1] : 0;
    }
    return year <= life ? costBasis / life : 0;
  }

  function calculateTaxes(ebitdaAnnual, depreciationAnnual, interestAnnual, fedRatePct, stateRatePct, entityType) {
    const taxableIncome = ebitdaAnnual - depreciationAnnual - interestAnnual;
    if (taxableIncome <= 0) {
      return { fedTax: 0, stateTax: 0, totalTax: 0, afterTaxIncome: ebitdaAnnual - interestAnnual, taxableIncome };
    }
    const fedTax = taxableIncome * (fedRatePct / 100);
    const stateTax = taxableIncome * (stateRatePct / 100);
    const totalTax = fedTax + stateTax;
    const afterTaxIncome = ebitdaAnnual - interestAnnual - totalTax;
    return { fedTax, stateTax, totalTax, afterTaxIncome, taxableIncome };
  }

  function calcAgeRisk(washers, dryers) {
    let totalUnits = 0;
    let ageSum = 0;
    let oldest = 0;

    const add = (count, age) => {
      const c = +count || 0;
      const a = +age || 0;
      totalUnits += c;
      ageSum += c * a;
      if (c > 0) oldest = Math.max(oldest, a);
    };

    washers.forEach(w => add(w.count, w.age));
    dryers.forEach(d => add(d.count, d.age));

    const avgAge = totalUnits ? (ageSum / totalUnits) : 0;

    const baseSeverity = (() => {
      if (avgAge <= 6) return 0;
      if (avgAge <= 10) return (avgAge - 6) * 0.08;
      if (avgAge <= 15) return 0.32 + (avgAge - 10) * 0.15;
      return 1.07 + Math.pow((avgAge - 15), 1.35);
    })();

    const oldestKicker = Math.max(0, (oldest - 13)) * 0.12;
    const severity = baseSeverity + oldestKicker;
    const revPenalty = Math.min(0.60, severity * 0.18);
    const utilDrift  = Math.min(0.80, severity * 0.22);
    const reservePct = Math.min(0.25, severity * 0.08);
    const stressPct  = Math.min(0.50, severity * 0.15);
    let multiple      = 60 - severity * 12;
    multiple = Math.max(25, Math.min(60, multiple));

    const label = (() => {
      if (avgAge < 7) return "LOW";
      if (avgAge < 10) return "MODERATE";
      if (avgAge < 13) return "HIGH";
      if (avgAge < 17) return "SEVERE";
      return "DISTRESSED";
    })();

    return {
      avgAge,
      oldest,
      severity,
      label,
      revPenaltyPct: revPenalty * 100,
      utilDriftPct: utilDrift * 100,
      reservePct: reservePct * 100,
      stressPct: stressPct * 100,
      multiple
    };
  }

  function getCashInvestedBases() {
    const cashDown = +document.getElementById("cashInv").value || 0;
    const workingCap = +document.getElementById("workingCap").value || 0;

    const includeLiftsInProject = (+document.getElementById("includeLiftsInProject").value || 0) === 1;
    const retoolBudget = +document.getElementById("retoolBudget").value || 0;
    const brandBudget  = +document.getElementById("brandBudget").value || 0;

    const liftsCash = includeLiftsInProject ? 0 : (retoolBudget + brandBudget);

    const outOfPocket = Math.max(0, cashDown + workingCap + liftsCash);

    const projCost = +document.getElementById("projCost").value || 0;
    const minEquityFloorPct = 0.20;
    const equityFloor = projCost > 0 ? projCost * minEquityFloorPct : 0;

    const cashInvestedDisplayed = Math.max(outOfPocket, equityFloor);

    return {
      cashInvestedEquityOnly: Math.max(0, cashDown),
      cashInvestedOutOfPocket: outOfPocket,
      cashInvestedDisplayed,
      floor: { minEquityFloorPct, equityFloor, projCost },
      breakdown: { cashDown, workingCap, liftsCash, includeLiftsInProject }
    };
  }

  function calculateSnapshot() {
    const $ = (id) => document.getElementById(id);
    const days = +$("days").value;
    const rates = {
      elec: +document.getElementById("rateElec").value,
      gas: +document.getElementById("rateGas").value,
      water: +document.getElementById("rateWater").value
    };
    
    const washerDefs = window.washerDefs || [];
    const dryerDefs = window.dryerDefs || [];

    // Safety: warn and surface UI message when there are no machines defined
    try {
      const totalMachines = (washerDefs||[]).reduce((s,w)=>s + (+w.count||0),0) + (dryerDefs||[]).reduce((s,d)=>s + (+d.count||0),0);
      if (totalMachines === 0) {
        if (typeof document !== 'undefined' && document.getElementById && document.getElementById('constraintNote')) {
          document.getElementById('constraintNote').innerHTML = '<div style="color:#ef4444; font-weight:bold">No machines defined — equipment counts are zero. Check equipment table or re-import valid data.</div>';
        }
        console.warn('calculateSnapshot: totalMachines == 0, equipment revenue will be zero');
      }
    } catch(e) { /* non-fatal */ }

    const equipRev = LaundryCalculator.calculateEquipmentRevenue(washerDefs, dryerDefs, days);
    const wfoldPrice = +$("wfoldPrice").value;
    const wfoldLbs = +$("wfoldLbs").value;
    const wfoldRevenue = wfoldPrice * wfoldLbs * days;

    const vendRev = +$("vendRev").value;
    const vendCogsPct = +$("vendCogsPct").value / 100;
    const vendCogs = vendRev * vendCogsPct;

    const baseRevenue = equipRev.total + wfoldRevenue + vendRev;
    const ageRisk = calcAgeRisk(washerDefs, dryerDefs);

    let grossRevenue = baseRevenue;
    let totalLift = 0;
    const applyLifts = +$("applyLifts").value;
    
    if (applyLifts) {
      const retoolBudget = +$("retoolBudget").value;
      const brandBudget = +$("brandBudget").value;
      const lifts = LaundryCalculator.calculateIndustryLifts(baseRevenue, retoolBudget, brandBudget);
      totalLift = lifts.totalLift;
      grossRevenue += totalLift;
    }

    const grossRevenuePreRisk = grossRevenue;
    if (ageRisk.revPenaltyPct > 0) {
      grossRevenue = grossRevenue * (1 - ageRisk.revPenaltyPct / 100);
    }

    const washerLifeYears = (+$("lifeWasher")?.value || 13);
    const dryerLifeYears  = (+$("lifeDryer")?.value || 17);
    let washPPe = 0, dryPPe = 0;
    const equipCosts = window.equipCosts || {};
    washerDefs.forEach(w => { washPPe += (+w.count||0) * (equipCosts[w.name] || 0); });
    dryerDefs.forEach(d => { dryPPe  += (+d.count||0) * (equipCosts[d.name] || 0); });
    const baseReserve = ((washPPe / Math.max(1, washerLifeYears)) + (dryPPe / Math.max(1, dryerLifeYears))) / 12;
    const ageReserve = grossRevenue * (ageRisk.reservePct / 100);
    const replacementReserve = baseReserve + ageReserve;

    const rent = +$("rent").value;
    const laborHours = +$("laborHrsDay").value;
    const wage = +$("wage").value;
    const laborCost = laborHours * wage * days;

    const effElec = applyLifts ? +$("effElecPct").value / 100 : 0;
    const effGas = applyLifts ? +$("effGasPct").value / 100 : 0;
    const effWater = applyLifts ? +$("effWaterPct").value / 100 : 0;

    const utilities = LaundryCalculator.calculateUtilityCosts(
      washerDefs, dryerDefs, rates, days, 
      { elec: effElec, gas: effGas, water: effWater }
    );

    const hotShare = (+$("hotSharePct").value || 60) / 100;
    const dT = +$("deltaT").value || 65;
    const eff = (+$("heaterEffPct").value || 80) / 100;

    let washerGallonsMo = 0;
    washerDefs.forEach(w => { washerGallonsMo += w.count * w.turns * days * w.gals; });
    const hotGallonsMo = washerGallonsMo * hotShare;
    const thermsForHot = (hotGallonsMo * 8.34 * dT) / (100000 * eff);
    const hotGas$ = thermsForHot * rates.gas * (1 - effGas);

    utilities.gas += hotGas$;
    utilities.total += hotGas$;

    const hotWaterDisplay = document.getElementById("hotWaterCostDisplay");
    if (hotWaterDisplay) {
      const effDisplay = effGas > 0 ? ` (${((1-effGas)*100).toFixed(0)}% w/retool)` : '';
      hotWaterDisplay.textContent = `Hot water: ${hotGallonsMo.toFixed(0)} gal × ${(eff*100).toFixed(0)}% eff = ${thermsForHot.toFixed(2)} therms = $${hotGas$.toFixed(2)}/mo${effDisplay}`;
      hotWaterDisplay.style.display = 'block';
    }

    if (ageRisk.utilDriftPct > 0) {
      const drift = 1 + ageRisk.utilDriftPct / 100;
      utilities.elec *= drift;
      utilities.gas *= drift;
      utilities.water *= drift;
      utilities.total *= drift;
    }

    const maintBasePct = +$("maintBasePct").value;
    const maintAgeUpliftPct = +$("maintAgeUpliftPct").value;
    const maintenance = LaundryCalculator.calculateMaintenanceCosts(
      baseRevenue, maintBasePct, maintAgeUpliftPct, washerDefs, dryerDefs
    );
    
    const totalOpex = rent + laborCost + utilities.total + maintenance + vendCogs;
    const ebitda = grossRevenue - totalOpex;

    const projCost = +$("projCost").value;
    const cashInv = +$("cashInv").value;
    const aPct = +$("aPct").value / 100;
    const bPct = +$("bPct").value / 100;
    const aRate = +$("aRate").value / 100;
    const bRate = +$("bRate").value / 100;
    const aTerm = +$("aTerm").value;
    const bTerm = +$("bTerm").value;

    const totalLoan = Math.max(0, projCost - cashInv);
    const maxA = projCost * aPct;
    const maxB = projCost * bPct;
    const loanA = Math.min(totalLoan, maxA);
    const loanB = Math.min(Math.max(0, totalLoan - loanA), maxB);
    const totalDebt = loanA + loanB;

    const pmtA = loanA > 0 ? Math.abs(pmt(aRate / 12, aTerm * 12, loanA)) : 0;
    const pmtB = loanB > 0 ? Math.abs(pmt(bRate / 12, bTerm * 12, loanB)) : 0;
    const totalDebtService = pmtA + pmtB;

    const cashFlow = ebitda - totalDebtService - replacementReserve;
    const dscr = totalDebtService > 0 ? ebitda * 12 / (totalDebtService * 12) : 999;
    const stressedDSCR = totalDebtService > 0 ? (ebitda * (1 - ageRisk.stressPct/100)) / totalDebtService : 999;
    const cashBases = getCashInvestedBases();
    const cashOnCashEquityOnly = cashBases.cashInvestedEquityOnly > 0 ? (cashFlow * 12 / cashBases.cashInvestedEquityOnly) * 100 : 0;
    const cashOnCash = cashBases.cashInvestedDisplayed > 0 ? (cashFlow * 12 / cashBases.cashInvestedDisplayed) * 100 : 0;

    const valuationMultiple = ageRisk.multiple;
    const industryValuation = ebitda * valuationMultiple;

    return {
      baseRevenue,
      equipRev,
      wfoldRevenue,
      vendRevGross: vendRev,
      totalLift,
      grossRevenue,
      grossRevenuePreRisk,
      replacementReserve,
      ageRisk,
      stressedDSCR,
      valuationMultiple,
      rent,
      laborCost,
      utilities,
      maintenance,
      vendCogs,
      totalOpex,
      ebitda,
      projCost,
      cashInv,
      cashInvestedEquityOnly: cashBases.cashInvestedEquityOnly,
      cashInvestedOutOfPocket: cashBases.cashInvestedOutOfPocket,
      cashInvestedDisplayed: cashBases.cashInvestedDisplayed,
      loanA,
      loanB,
      pmtA,
      pmtB,
      totalDebtService,
      cashFlow,
      dscr,
      cashOnCash,
      industryValuation
    };
  }

  function simulateYears() {
    const $ = (id) => document.getElementById(id);
    const horizon = +$("horizon").value;
    const snapshot = calculateSnapshot();

    const years = [];
    const revenues = [];
    const ebitdas = [];
    const cashFlows = [];
    const afterTaxIncomes = [];
    const taxes = [];
    const cumulativeCash = [- (snapshot.cashInvestedDisplayed ?? snapshot.cashInvestedOutOfPocket ?? snapshot.cashInv)];
    const dscrs = [];

    const revGrowRate = (+$("revGrowPct").value || 2.5) / 100;
    const opexInflRate = (+$("opexInflPct").value || 3.0) / 100;

    const depMethod = ($("depreciationMethod")?.value) || "macrs";
    const equipLife = parseInt($("taxEquipLife")?.value || "7", 10);
    const bldgLife = parseInt($("taxBuildingLife")?.value || "39", 10);
    const fedRate = parseFloat($("fedTaxRate")?.value || "21");
    const stateRate = parseFloat($("stateTaxRate")?.value || "8.84");
    const entityType = ($("entityType")?.value) || "llc";

    const equipBasis = snapshot.projCost * 0.6;
    const bldgBasis  = snapshot.projCost * 0.4;

    for (let year = 1; year <= horizon; year++) {
      const annualRevenue = snapshot.grossRevenue * 12 * Math.pow(1 + revGrowRate, year - 1);
      const annualOpex = snapshot.totalOpex * 12 * Math.pow(1 + opexInflRate, year - 1);
      const annualEbitda = annualRevenue - annualOpex;

      const equipDep = calculateDepreciation(equipBasis, depMethod, equipLife, year);
      const bldgDep  = calculateDepreciation(bldgBasis, "straight_line", bldgLife, year);
      const depreciation = equipDep + bldgDep;

      const interestAnnual = (snapshot.totalDebtService * 12) * 0.7;
      
      const taxCalc = calculateTaxes(annualEbitda, depreciation, interestAnnual, fedRate, stateRate, entityType);
      const annualAfterTaxIncome = taxCalc.afterTaxIncome;

      const principalPayments = (snapshot.totalDebtService * 12) * 0.3;
      const annualCashFlow = annualAfterTaxIncome - principalPayments;
      const annualDscr = snapshot.totalDebtService > 0 ? annualEbitda / (snapshot.totalDebtService * 12) : 999;

      years.push(year);
      revenues.push(annualRevenue);
      ebitdas.push(annualEbitda);
      cashFlows.push(annualCashFlow);
      afterTaxIncomes.push(annualAfterTaxIncome);
      taxes.push(taxCalc.totalTax);
      dscrs.push(annualDscr);

      const prevCumulative = cumulativeCash[cumulativeCash.length - 1];
      cumulativeCash.push(prevCumulative + annualCashFlow);
    }

    let paybackYears = 0;
    for (let i = 0; i < cumulativeCash.length; i++) {
      if (cumulativeCash[i] >= 0) {
        paybackYears = i;
        break;
      }
    }
    if (paybackYears === 0 && cumulativeCash[cumulativeCash.length - 1] < 0) {
      paybackYears = -1;
    }

    const discountRate = 0.06;
    let npv = -snapshot.cashInv;
    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / Math.pow(1 + discountRate, i + 1);
    }

    return {
      years, revenues, ebitdas, cashFlows, cumulativeCash, dscrs, taxes, afterTaxIncomes, paybackYears, npv
    };
  }

  function compute() {
    if (typeof window.updateProjectCost === 'function') window.updateProjectCost();
    const snapshot = calculateSnapshot();
    const simulation = simulateYears();

    const horizonEl = document.getElementById('horizon');
    const projectionTextEl = document.getElementById('projectionYearsText');
    const chartTextEl = document.getElementById('chartYearsText');
    const accuracyTextEl = document.getElementById('accuracyYearsText');

    if (projectionTextEl) projectionTextEl.textContent = +horizonEl.value;
    if (chartTextEl) chartTextEl.textContent = +horizonEl.value;
    if (accuracyTextEl) accuracyTextEl.textContent = +horizonEl.value;

    if (typeof window.renderKPIs === 'function') window.renderKPIs(snapshot);
    if (typeof window.renderTables === 'function') window.renderTables(snapshot, simulation);
    if (typeof window.renderCharts === 'function') window.renderCharts(snapshot, simulation);
    if (typeof window.renderAccountantAnalysis === 'function') window.renderAccountantAnalysis(snapshot, simulation);

    setTimeout(() => {
      try {
        if (typeof window.analyzeBenchmarks === 'function') window.analyzeBenchmarks();
        if (typeof window.analyzeExitScenarios === 'function') window.analyzeExitScenarios();
      } catch (error) {
        console.error("Analytics error:", error);
      }
    }, 100);

    if (typeof window.checkConstraintsEnhanced === 'function') window.checkConstraintsEnhanced();
    if (typeof window.renderHeroZero === 'function') window.renderHeroZero(snapshot, simulation);
  }

  const CoreExports = {
    pmt, LaundryCalculator, calculateDepreciation, calculateTaxes, calcAgeRisk,
    getCashInvestedBases, calculateSnapshot, simulateYears, compute
  };

  if (typeof window !== 'undefined') window.Core = CoreExports;
  if (typeof module !== 'undefined' && module.exports) module.exports = CoreExports;
})();
