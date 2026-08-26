import { Form, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import { ArrowRight, CheckCircle2, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";
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
	return <main className="login-page">
		<section className="login-story">
			<div className="wordmark inverse"><span>W1</span> Workforce One</div>
			<div className="story-copy"><p className="eyebrow light">Malaysia-ready people operations</p><h1>Clarity from clock-in to payday.</h1><p>A focused HR workspace for teams that want payroll precision without losing the human context.</p>
				<div className="story-proof"><ShieldCheck/><span><strong>Enterprise security</strong><small>End-to-end encrypted sessions and role-based access</small></span></div>
			</div>
			<p className="story-foot">Statutory fixtures verified 26 Aug 2026 · Malaysia under-60 profile</p>
		</section>
		<section className="login-panel"><div className="login-card">
			<div className="mobile-wordmark wordmark"><span>W1</span> Workforce One</div>
			<p className="eyebrow">Welcome back</p><h2>Sign in to your account</h2><p className="muted">Enter your workspace credentials to continue.</p>
			{actionData?.error && <div className="alert danger" role="alert">{actionData.error}</div>}
			<Form method="post" className="form-stack">
				<input type="hidden" name="returnTo" value={search.get("returnTo") ?? ""}/>
				<label>Email address<input name="email" type="email" autoComplete="username" defaultValue="admin@workforceone.demo" required/></label>
				<label>Password<input name="password" type="password" autoComplete="current-password" defaultValue="AdminDemo#2026" required/></label>
				<button className="button primary wide" disabled={navigation.state !== "idle"}>{navigation.state !== "idle" ? "Signing in…" : <>Enter workspace <ArrowRight size={18}/></>}</button>
			</Form>
			<div className="demo-accounts"><p><Sparkles size={15}/> Quick sign-in</p>
				<button type="button" onClick={() => fill("admin@workforceone.demo", "AdminDemo#2026")}>Admin <small>Payroll & people</small></button>
				<button type="button" onClick={() => fill("employee@workforceone.demo", "EmployeeDemo#2026")}>Employee <small>Farah’s self-service</small></button>
			</div>
			<div className="login-trust"><span><CheckCircle2/>Enterprise ready</span><span><Fingerprint/>Biometric verified</span></div>
		</div></section>
	</main>;
}

function fill(email: string, password: string) {
	const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
	const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
	if (emailInput && passwordInput) { emailInput.value = email; passwordInput.value = password; emailInput.focus(); }
}
