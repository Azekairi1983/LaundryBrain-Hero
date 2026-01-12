const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('./Index.html','utf8');

// Simple presence checks to ensure the negotiation playbook contains the new checklist and key concerns
assert(html.includes('Checklist before final offer'), 'Checklist text not present in Index.html');
assert(html.includes('Negotiation Playbook & Concerns'), 'Negotiation Playbook header not present');
assert(html.includes('Replacement Reserve'), 'Replacement Reserve negotiation point missing');
assert(html.includes('Due Diligence & Closing Conditions'), 'Due diligence negotiation point missing');

console.log('Negotiation content presence checks passed');
process.exit(0);
