// Small UI helper functions that are testable in Node
function deepCopy(x){ return JSON.parse(JSON.stringify(x)); }

function applyImportedData(data, options = {}){
  const confirmFn = options.confirmFn || (typeof window !== 'undefined' && window.confirm ? window.confirm.bind(window) : (() => true));

  function assignWithEmptyGuard(fieldName, currentVarName) {
    if (data[fieldName] !== undefined) {
      if (Array.isArray(data[fieldName]) && data[fieldName].length === 0) {
        const proceed = confirmFn(`Imported JSON has an empty ${fieldName}. Importing will clear the current ${fieldName}. Proceed?`);
        if (proceed) {
          globalThis[currentVarName] = data[fieldName];
        } else {
          // skip assigning
        }
      } else {
        globalThis[currentVarName] = data[fieldName];
      }
    }
  }

  assignWithEmptyGuard('washerDefs', 'washerDefs');
  assignWithEmptyGuard('dryerDefs', 'dryerDefs');
  assignWithEmptyGuard('equipCosts', 'equipCosts');

  // other scalar fields
  if (data.locale !== undefined) globalThis.locale = data.locale;
  if (data.horizon !== undefined) globalThis.horizon = data.horizon;
  if (data.days !== undefined) globalThis.days = data.days;

  if (data.rates) {
    globalThis.rates = Object.assign({}, globalThis.rates || {}, data.rates);
  }
  if (data.projCost !== undefined) globalThis.projCost = data.projCost;
  if (data.cashInv !== undefined) globalThis.cashInv = data.cashInv;

  return true;
}

function resetEquipmentDefaults(initials){
  if (!initials) throw new Error('initials argument required');
  globalThis.washerDefs = deepCopy(initials.washerDefs || []);
  globalThis.dryerDefs = deepCopy(initials.dryerDefs || []);
  globalThis.equipCosts = deepCopy(initials.equipCosts || {});
  return true;
}

// Expose in browser and for Node tests
if (typeof window !== 'undefined') {
  window.applyImportedData = applyImportedData;
  window.resetEquipmentDefaults = function(){ return resetEquipmentDefaults(window._initials || { washerDefs: window._initialWasherDefs, dryerDefs: window._initialDryerDefs, equipCosts: window._initialEquipCosts }); };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyImportedData, resetEquipmentDefaults };
}
