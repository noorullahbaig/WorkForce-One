import { redirect } from "react-router";

export type DemoUser = {
	id: string;
	companyId: string;
	employeeId: string | null;
	name: string;
	email: string;
	role: "admin" | "employee";
};

const encoder = new TextEncoder();
const SESSION_COOKIE = "w1_session";

function bytesToHex(bytes: ArrayBuffer) {
	return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string) {
	const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", iterations: 100_000, salt: encoder.encode(salt) },
		key,
		256,
	);
	return bytesToHex(bits);
}

export async function verifyPassword(password: string, expected: string, salt: string) {
	const actual = await hashPassword(password, salt);
	if (actual.length !== expected.length) return false;
	let mismatch = 0;
	for (let index = 0; index < actual.length; index += 1) {
		mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
	}
	return mismatch === 0;
}

async function sha256(value: string) {
	return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function readCookie(request: Request, name: string) {
	const cookies = request.headers.get("Cookie") ?? "";
	return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function getUser(request: Request, env: Env): Promise<DemoUser | null> {
	const token = readCookie(request, SESSION_COOKIE);
	if (!token) return null;
	const row = await env.DB.prepare(
		`SELECT u.id, u.company_id AS companyId, u.employee_id AS employeeId, u.name, u.email, u.role
		 FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
	).bind(await sha256(token), new Date().toISOString()).first<DemoUser>();
	return row ?? null;
}

export async function requireUser(request: Request, env: Env, role?: DemoUser["role"]) {
	const user = await getUser(request, env);
	if (!user) throw redirect(`/login?returnTo=${encodeURIComponent(new URL(request.url).pathname)}`);
	if (role && user.role !== role) throw redirect(user.role === "admin" ? "/admin" : "/employee");
	return user;
}

export function assertSameOrigin(request: Request) {
	if (request.method === "GET" || request.method === "HEAD") return;
	const origin = request.headers.get("Origin");
	if (origin && origin !== new URL(request.url).origin) throw new Response("Invalid request origin", { status: 403 });
}

export async function createSession(userId: string, env: Env, secure = true) {
	const token = crypto.randomUUID() + crypto.randomUUID();
	const now = new Date();
	const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
		.bind(crypto.randomUUID(), userId, await sha256(token), expires.toISOString(), now.toISOString()).run();
	return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure ? "; Secure" : ""}`;
}

export async function destroySession(request: Request, env: Env) {
	const token = readCookie(request, SESSION_COOKIE);
	if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
	return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function authenticate(email: string, password: string, request: Request, env: Env) {
	const key = await sha256(`${email.toLowerCase()}|${request.headers.get("CF-Connecting-IP") ?? "local"}`);
	const attempt = await env.DB.prepare("SELECT attempts, window_started_at AS windowStartedAt FROM login_attempts WHERE key_hash = ?")
		.bind(key).first<{ attempts: number; windowStartedAt: string }>();
	if (attempt && attempt.attempts >= 8 && Date.now() - Date.parse(attempt.windowStartedAt) < 15 * 60 * 1000) return null;
	const row = await env.DB.prepare("SELECT id, password_hash AS passwordHash, password_salt AS passwordSalt FROM users WHERE email = ? AND active = 1")
		.bind(email.toLowerCase()).first<{ id: string; passwordHash: string; passwordSalt: string }>();
	if (!row || !(await verifyPassword(password, row.passwordHash, row.passwordSalt))) {
		await env.DB.prepare(`INSERT INTO login_attempts (key_hash, attempts, window_started_at) VALUES (?, 1, ?)
			ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN window_started_at < ? THEN 1 ELSE attempts + 1 END, window_started_at = CASE WHEN window_started_at < ? THEN excluded.window_started_at ELSE window_started_at END`)
			.bind(key, new Date().toISOString(), new Date(Date.now() - 15 * 60 * 1000).toISOString(), new Date(Date.now() - 15 * 60 * 1000).toISOString()).run();
		return null;
	}
	await env.DB.prepare("DELETE FROM login_attempts WHERE key_hash = ?").bind(key).run();
	return row.id;
}
