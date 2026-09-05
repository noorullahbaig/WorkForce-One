const fs = require('fs');
let code = fs.readFileSync('app/routes/portal.tsx', 'utf8');
code = code.replace(/export async function loader\(\{ request, context \}: Route\.LoaderArgs\) \{/, "export async function loader({ request, context }: Route.LoaderArgs) {\n  try {");
code = code.replace(/return \{\n\t\temployees,/, "return {\n\t\temployees,");
code = code.replace(/companyInfo: resolvedCompanyInfo,\n\t\};/, "companyInfo: resolvedCompanyInfo,\n\t};\n  } catch (e) {\n    return { error: e.message, stack: e.stack, employees: [], attendance: [], leave: [], sharedLeave: [], holidays: [], payrolls: [], payslips: [], notifications: [], balances: [], adjustments: [], policies: [], companyInfo: null, today: '' };\n  }");
fs.writeFileSync('app/routes/portal.tsx', code);
