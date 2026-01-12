const C = require('./core.js');
console.log('pmt sample', C.pmt(0.005,360,100000));
console.log('dep sample', C.calculateDepreciation(100000,'macrs',7,1));
console.log('laundry rev', C.LaundryCalculator.calculateEquipmentRevenue([{count:10,vend:3,turns:1,kwh:0,therms:0,gals:0,mins:0}], [{count:5,pricePerMin:0.05,avgMins:10,cycles:1,kwh:0,therms:0}],30));
