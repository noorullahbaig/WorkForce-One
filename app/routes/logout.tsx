import { redirect } from "react-router";
import { assertSameOrigin, destroySession } from "../services/auth.server";
import { cloudflareContext } from "../context";
import type { Route } from "./+types/logout";

export async function action({ request, context }: Route.ActionArgs) {
	assertSameOrigin(request);
	throw redirect("/login", { headers: { "Set-Cookie": await destroySession(request, context.get(cloudflareContext).env) } });
}
