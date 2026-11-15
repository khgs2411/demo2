import { expect, it, vi } from "vitest";
import { createStudioAdapter, createStudioAuthAdapter } from "./adapter";
import { registration } from "./fixtures";

it("loads all requests oldest first and upcoming meetings by slot start, without request-date filters", async () => {
	const older = registration("old", "2026-01-01", "2026-11-17T09:00:00Z");
	const newer = registration("new", "2026-11-14", "2026-11-16T09:00:00Z");
	const past = registration("past", "2026-11-14", "2026-11-15T09:00:00Z");
	const listPending = vi.fn().mockResolvedValue({ registrations: [newer, older] });
	const listRegistered = vi.fn().mockResolvedValue({ registrations: [older, past, newer] });
	const adapter = createStudioAdapter({ listPending, listRegistered, approve: vi.fn(), reject: vi.fn() });
	expect(await adapter.load(new Date("2026-11-15T09:00:00Z"))).toEqual({ type: "lists_loaded", pending: [older, newer], upcoming: [newer, older] });
	expect(listPending).toHaveBeenCalledWith();
	expect(listRegistered).toHaveBeenCalledWith();
});

it.each([
	[{ code: "forbidden", message: "Manager permission required" }, "forbidden", "Manager permission required"],
	[{ code: "unauthorized", message: "Session expired" }, "unauthorized", "Session expired"],
	[new TypeError("Failed to fetch"), "network", null],
])("maps SDK read errors without losing backend messages: %s", async (error, code, message) => {
	const adapter = createStudioAdapter({ listPending: vi.fn().mockRejectedValue(error), listRegistered: vi.fn().mockResolvedValue({registrations:[]}), approve: vi.fn(), reject: vi.fn() });
	expect(await adapter.load(new Date())).toEqual({ type: "load_failed", error: { code, message } });
});

it.each(["approve", "reject"] as const)("sends %s once with the chosen id and optional rejection reason", async action => {
	const approve = vi.fn().mockResolvedValue({});
	const reject = vi.fn().mockResolvedValue({});
	const adapter = createStudioAdapter({ listPending: vi.fn(), listRegistered: vi.fn(), approve, reject });
	expect(await adapter.decide("request-7", action, "Please choose another day")).toEqual({ type: "decision_succeeded" });
	expect(action === "approve" ? approve : reject).toHaveBeenCalledWith(...(action === "approve" ? ["request-7"] : ["request-7", { reason: "Please choose another day" }]));
	expect(action === "approve" ? reject : approve).not.toHaveBeenCalled();
});
it.each(["approve", "reject"] as const)("does not replay %s on forbidden, unauthorized or network failure", async action => {
	for (const error of [{ code:"forbidden", message:"Not allowed" }, { code:"unauthorized", message:"Sign in again" }, new TypeError("offline")]) {
		const operation = vi.fn().mockRejectedValue(error);
		const adapter = createStudioAdapter({ listPending:vi.fn(), listRegistered:vi.fn(), approve:operation, reject:operation });
		expect(await adapter.decide("r", action)).toEqual({ type:"decision_failed", error: "code" in error ? error : {code:"network",message:null} });
		expect(operation).toHaveBeenCalledOnce();
	}
});

it("signs in and signs out through the SDK and refreshes product access", async () => {
	const signIn = vi.fn().mockResolvedValue({error:null});
	const signOut = vi.fn().mockResolvedValue({error:null});
	const refresh = vi.fn().mockResolvedValue(undefined);
	const adapter = createStudioAuthAdapter({signIn,signOut,signInWithGoogle:vi.fn()},refresh);
	expect(await adapter.signIn("manager@example.com","secret")).toEqual({type:"auth_finished"});
	expect(signIn).toHaveBeenCalledWith("manager@example.com","secret");
	expect(await adapter.signOut()).toEqual({type:"access_resolved",access:"signed_out"});
	expect(refresh).toHaveBeenCalledTimes(2);
});

it.each(["signIn","signOut"] as const)("maps %s auth and network failures without refreshing access", async method => {
	for (const error of ["Invalid credentials", new TypeError("offline")]) {
		const operation = vi.fn().mockImplementation(() => typeof error === "string" ? Promise.resolve({error}) : Promise.reject(error));
		const refresh = vi.fn();
		const adapter = createStudioAuthAdapter({signIn:operation,signOut:operation,signInWithGoogle:vi.fn()},refresh);
		expect(await adapter[method]("email","password")).toEqual({type:"auth_failed",error:typeof error === "string" ? {code:"auth",message:error} : {code:"network",message:null}});
		expect(refresh).not.toHaveBeenCalled();
	}
});

it("stores the studio return target before Google starts and removes it if the redirect fails", async () => {
	sessionStorage.clear();
	const signInWithGoogle = vi.fn().mockImplementation(async () => {
		expect(sessionStorage.getItem("demo2-studio-redirect")).toBe("#/studio");
		return {error:null};
	});
	const adapter = createStudioAuthAdapter({signIn:vi.fn(),signOut:vi.fn(),signInWithGoogle},vi.fn());
	expect(await adapter.signInWithGoogle()).toEqual({type:"auth_redirect_started"});
	signInWithGoogle.mockRejectedValueOnce(new TypeError("offline"));
	expect(await adapter.signInWithGoogle()).toEqual({type:"auth_failed",error:{code:"network",message:null}});
	expect(sessionStorage.getItem("demo2-studio-redirect")).toBeNull();
});
it("does not begin OAuth if the return target cannot be stored", async () => {
	const signInWithGoogle = vi.fn();
	const storage = vi.spyOn(Storage.prototype,"setItem").mockImplementation(() => { throw new Error("blocked"); });
	try {
		const adapter = createStudioAuthAdapter({signIn:vi.fn(),signOut:vi.fn(),signInWithGoogle},vi.fn());
		expect(await adapter.signInWithGoogle()).toEqual({type:"auth_failed",error:{code:"redirect_storage",message:null}});
		expect(signInWithGoogle).not.toHaveBeenCalled();
	} finally { storage.mockRestore(); }
});
