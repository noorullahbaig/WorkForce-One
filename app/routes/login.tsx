import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import { ArrowRight, Lock, ShieldCheck, User } from "lucide-react";
import { z } from "zod";
import { assertSameOrigin, authenticate, createSession, getUser } from "../services/auth.server";
import { cloudflareContext } from "../context";
import type { Route } from "./+types/login";

export const meta = () => [{ title: "Sign in · Workforce One" }, { name: "description", content: "Merdeka Coffee HR and payroll portal" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const user = await getUser(request, context.get(cloudflareContext).env);
	if (user) throw redirect(user.role === "admin" ? "/admin" : "/employee");
	return null;
}

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8), returnTo: z.string().optional() });

export async function action({ request, context }: Route.ActionArgs) {
	assertSameOrigin(request);
	const parsed = LoginSchema.safeParse(Object.fromEntries(await request.formData()));
	if (!parsed.success) return { error: "Enter a valid email and password." };
	const env = context.get(cloudflareContext).env;
	const userId = await authenticate(parsed.data.email, parsed.data.password, request, env);
	if (!userId) return { error: "Invalid email address or password." };
	const user = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first<{ role: "admin" | "employee" }>();
	const validPrefix = user?.role === "admin" ? "/admin" : "/employee";
	const target = parsed.data.returnTo?.startsWith(validPrefix) ? parsed.data.returnTo : validPrefix;
	throw redirect(target, { headers: { "Set-Cookie": await createSession(userId, env, new URL(request.url).protocol === "https:") } });
}

export default function Login() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const [search] = useSearchParams();
	return (
		<main className="login-page">
			<section className="login-story">
				<Link to="/" className="wordmark inverse" aria-label="Workforce One home">
					<span>W1</span> Workforce One
				</Link>
				<div className="story-content">
					<h1>Clarity from clock-in to payday.</h1>
					<div className="story-visual-wrap">
						<img
							src="/login-visual.png"
							alt="Workforce One clock-in to payday visual flow"
							className="story-visual-img"
							width="540"
							height="540"
							loading="eager"
						/>
					</div>
				</div>
			</section>
			<section className="login-panel">
				<div className="login-card">
					<Link to="/" className="login-brand" aria-label="Workforce One home">
						<span>W1</span>
					</Link>
					<h2>Sign in</h2>
					{actionData?.error && <div className="alert danger" role="alert">{actionData.error}</div>}
					<Form method="post" className="form-stack">
						<input type="hidden" name="returnTo" value={search.get("returnTo") ?? ""} />
						<label>
							Email address
							<input name="email" type="email" autoComplete="username" required />
						</label>
						<label>
							Password
							<input name="password" type="password" autoComplete="current-password" required />
						</label>
						<button className="button primary wide" disabled={navigation.state !== "idle"}>
							{navigation.state !== "idle" ? "Signing in…" : <>Enter workspace <ArrowRight size={18} /></>}
						</button>
					</Form>
					<div className="demo-divider">Try the demo</div>
					<div className="demo-accounts">
						<button type="button" onClick={() => fill("admin@workforceone.demo", "AdminDemo#2026")}>
							<span className="demo-icon"><ShieldCheck size={18} /></span>
							<strong>Admin</strong>
							<small>Payroll & HR</small>
						</button>
						<button type="button" onClick={() => fill("employee@workforceone.demo", "EmployeeDemo#2026")}>
							<span className="demo-icon"><User size={18} /></span>
							<strong>Employee</strong>
							<small>Farah’s portal</small>
						</button>
					</div>
					<p className="login-session-note">
						<Lock size={12} /> Session data stays within your browser.
					</p>
				</div>
			</section>
		</main>
	);
}

function fill(email: string, password: string) {
	const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
	const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
	if (emailInput && passwordInput) {
		emailInput.value = email;
		passwordInput.value = password;
		emailInput.focus();
	}
}
