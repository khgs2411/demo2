import { expect, it } from "vitest";
import { requestsTransition, type RequestsState } from "./requests-machine";

const request = { id: "slot", name: "Meeting", startsAt: "2026-11-10T09:00:00Z", endsAt: "2026-11-10T09:45:00Z", canRegister: false, canCancelRegistration: true, userRegistrationState: { id: "registration", status: "pending" as const } };
const ready: RequestsState = { step: "ready", requests: [request], cancellingId: null, cancellationFailed: false };
it("only starts an explicitly allowed cancellation and never replays on error", () => {
	const cancelling = requestsTransition(ready, { type: "cancel_started", registrationId: "registration" });
	expect(cancelling).toEqual({ ...ready, cancellingId: "registration" });
	expect(requestsTransition(cancelling, { type: "cancel_started", registrationId: "registration" })).toBe(cancelling);
	expect(requestsTransition(ready, { type: "cancel_started", registrationId: "other" })).toBe(ready);
	const failed = requestsTransition(cancelling, { type: "cancel_failed" });
	expect(failed).toEqual({ ...ready, cancellationFailed: true });
	expect(requestsTransition(failed, { type: "loaded", requests: [{ ...request, canCancelRegistration: false }] })).toMatchObject({ step: "ready", cancellationFailed: true, cancellingId: null });
});
it.each(["loading", "signed_out", "failed"] as const)("loads requests from %s and ignores cancellation", step => {
	const state: RequestsState = { step };
	expect(requestsTransition(state, { type: "cancel_started", registrationId: "registration" })).toBe(state);
	expect(requestsTransition(state, { type: "loaded", requests: [request] })).toEqual(ready);
	for (const type of ["loading", "signed_out", "failed"] as const) expect(requestsTransition(ready, { type })).toEqual({ step: type });
});
it("retains the backend cancellation receipt if the follow-up read fails", () => {
	const registration = {id:"registration",classId:"slot",status:"cancelled" as const};
	const completed = requestsTransition(ready, {type:"cancel_completed",registration});
	expect(requestsTransition(completed,{type:"failed"})).toEqual({step:"failed",lastCancellation:registration});
});

it("keeps separate historical requests for one class and respects their cancellation hints", () => {
 const requests = ["rejected", "pending", "cancelled", "approved"].map(status => ({...request,canCancelRegistration:status === "pending",userRegistrationState:{id:status,status:status as "rejected" | "pending" | "cancelled" | "approved"}}));
 const state = requestsTransition({step:"loading"},{type:"loaded",requests});
 expect(state).toMatchObject({step:"ready",requests});
 for (const registrationId of ["rejected", "cancelled", "approved"]) expect(requestsTransition(state,{type:"cancel_started",registrationId})).toBe(state);
 expect(requestsTransition(state,{type:"cancel_started",registrationId:"pending"})).toMatchObject({cancellingId:"pending"});
});

it("clears the ledger when product access is denied", () => {
	const state = requestsTransition(ready, { type: "no_access" });
	expect(state).toEqual({ step: "no_access" });
	expect(requestsTransition(state, { type: "cancel_started", registrationId: "registration" })).toBe(state);
});
