import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("login", "routes/login.tsx"),
	route("logout", "routes/logout.tsx"),
	route("admin/*", "routes/portal.tsx", { id: "routes/admin-portal" }),
	route("employee/*", "routes/portal.tsx", { id: "routes/employee-portal" }),
	route("resources/payroll/:id.csv", "routes/payroll-csv.ts"),
	route("resources/payroll/:id.bank.csv", "routes/bank-csv.ts"),
	route("resources/payroll/:id.pdf", "routes/payroll-pdf.ts"),
	route("resources/payslips/:id.pdf", "routes/payslip-pdf.ts"),
] satisfies RouteConfig;
