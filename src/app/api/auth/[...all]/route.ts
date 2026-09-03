import { auth } from "@/server/modules/auth/auth.config";
import { toNextJsHandler } from "better-auth/next-js";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);
export const GET = handler.GET;

export async function POST(request: Request) {
	const path = new URL(request.url).pathname;
	if (/\/sign-in\/|\/request-password-reset|\/reset-password/.test(path)) {
		const result = consumeRateLimit(`auth:${path}:${getClientIp(request)}`, 10, 15 * 60 * 1000);
		if (!result.allowed) {
			return Response.json({ error: "Too many requests. Please try again later." }, {
				status: 429,
				headers: { "Retry-After": String(result.retryAfterSeconds) },
			});
		}
	}
	return handler.POST(request);
}