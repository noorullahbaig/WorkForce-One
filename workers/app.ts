import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "../app/context";
import { resetDemoData } from "../app/services/reset.server";
import { getDatabaseHealth } from "./health";

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === "/healthz") {
			try {
				const health = await getDatabaseHealth(env.DB);
				return Response.json(
					{ service: "workforce-one", ...health },
					{ status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
				);
			} catch (error) {
				console.error("database_health_check_failed", {
					path: url.pathname,
					error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
				});
				return Response.json(
					{ service: "workforce-one", ok: false, migration: "unknown", holidaysTable: "unknown" },
					{ status: 503, headers: { "Cache-Control": "no-store" } },
				);
			}
		}
		const provider = new RouterContextProvider();
		provider.set(cloudflareContext, { env, ctx });
		try {
			return await requestHandler(request, provider);
		} catch (error) {
			console.error("request_handler_failed", {
				method: request.method,
				path: url.pathname,
				error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
			});
			return new Response("Service temporarily unavailable.", {
				status: 503,
				headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
			});
		}
	},
	async scheduled(_controller, env, ctx) {
		ctx.waitUntil(resetDemoData(env.DB));
	},
} satisfies ExportedHandler<Env>;
