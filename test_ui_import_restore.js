const assert = require('assert');
const ui = require('./ui_helpers.js');

// Setup some existing state
global.washerDefs = [{ name:'A', count:2 }];
global.dryerDefs = [{ name:'D', count:3 }];
global.equipCosts = { A:100 };

// 1) If imported data has empty washerDefs and confirmFn returns false -> skip assigned
const data1 = { washerDefs: [] };
ui.applyImportedData(data1, { confirmFn: (msg) => { return false; } });
assert(global.washerDefs.length === 1 && global.washerDefs[0].name === 'A', 'Washer defs were cleared despite user declining confirm');

// 2) If imported data has empty dryerDefs and confirmFn returns true -> assign empty array
const data2 = { dryerDefs: [] };
ui.applyImportedData(data2, { confirmFn: (msg) => { return true; } });
assert(Array.isArray(global.dryerDefs) && global.dryerDefs.length === 0, 'Dryer defs should be cleared when user confirms');

// 3) Reset equipment defaults uses provided initials
global.washerDefs = [];
ui.resetEquipmentDefaults({ washerDefs: [{name:'X',count:1}], dryerDefs:[{name:'Y',count:2}], equipCosts:{'X':111} });
assert(global.washerDefs.length === 1 && global.washerDefs[0].name === 'X', 'resetEquipmentDefaults did not apply initial washer defs');
assert(global.equipCosts['X'] === 111, 'resetEquipmentDefaults did not restore equipCosts');

console.log('UI import/restore tests passed');
process.exit(0);
