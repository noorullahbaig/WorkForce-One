const fs = require('fs');
let code = fs.readFileSync('app/routes/portal.tsx', 'utf8');
code = code.replace(/export async function loader\(\{[^}]+\}: Route.LoaderArgs\) \{/, "$&\n  try {");
code = code.replace(/return \{[\s\S]*companyInfo: resolvedCompanyInfo,\n\t};/, "$&\n  } catch (e) {\n    return { error: e.message, stack: e.stack, employees: [], attendance: [], leave: [], sharedLeave: [], holidays: [], payrolls: [], payslips: [], notifications: [], balances: [], adjustments: [], policies: [], companyInfo: null, today: '' };\n  }");
fs.writeFileSync('app/routes/portal.tsx', code);
