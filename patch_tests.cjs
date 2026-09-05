const fs = require('fs');
let code = fs.readFileSync('workers/health.test.ts', 'utf8');
code = code.replace(/holidaysTable: "missing",\n\t\t\}\);/, "holidaysTable: \"missing\",\n\t\t\tleaveBackdate: \"present\",\n\t\t});");
code = code.replace(/holidaysTable: "present",\n\t\t\}\);/, "holidaysTable: \"present\",\n\t\t\tleaveBackdate: \"present\",\n\t\t});");
fs.writeFileSync('workers/health.test.ts', code);
