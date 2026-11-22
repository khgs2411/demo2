import { describe, expect, it } from "vitest";
import { initialState, transition, type BookingEvent, type BookingState } from "./machine";

const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: null } as const;
const chosen = { type: "package_chosen", packageId: "system", addonInterests: ["agent-voice"] } as const;
const account: BookingState = { step: "needs_account", selection };
const profile: BookingState = { step: "completing_profile", selection, userId: "visitor" };

describe("booking account and profile flow", () => {
	it("requires package confirmation before account entry", () => {
		expect(initialState).toEqual({ step: "choosing_package" });
		expect(transition(initialState, chosen)).toEqual(account);
		expect(transition(initialState, { type: "signed_in", userId: "visitor" })).toBe(initialState);
	});

	it.each(["sign_in", "sign_up", "google"] as const)("completes %s through the profile step", (method) => {
		const signing = transition(account, { type: "auth_started", method });
		expect(signing).toEqual({ ...account, step: method === "sign_up" ? "signing_up" : "signing_in" });
		expect(transition(signing, { type: "signed_in", userId: "visitor" })).toEqual(profile);
	});

	it("lets an already authenticated visitor proceed after choosing a package", () => {
		expect(transition(account, { type: "signed_in", userId: "visitor" })).toEqual(profile);
	});

	it("waits for a successful profile save before loading slots", () => {
		expect(transition(profile, { type: "profile_saved" })).toEqual({
			step: "choosing_slot", selection, userId: "visitor", slots: [], availability: "loading", notice: null,
		});
	});

	it.each([account, { ...account, step: "signing_up" }, { ...account, step: "signing_in" }, profile] satisfies BookingState[])("recovers $step without replaying an effect", (state) => {
		const operation = state.step === "completing_profile" ? "profile" : "auth";
		const failed = transition(state, { type: "operation_failed", operation, reason: "generic" });
		expect(failed.step).toBe("failed");
		expect(transition(failed, { type: "retry_requested" })).toEqual(state.step.startsWith("signing_") ? account : state);
	});

	it.each([initialState, account, profile])("restarts $step and ignores unknown or unrelated results", (state) => {
		expect(transition(state, { type: "restarted" })).toEqual(initialState);
		expect(transition(state, { type: "unknown" } as unknown as BookingEvent)).toBe(state);
		expect(transition(state, { type: "retry_requested" })).toBe(state);
	});
});

const slot = {
	id: "slot-1", startsAt: "2026-11-10T09:00:00Z", canRegister: true,
	canCancelRegistration: false, userRegistrationState: null,
};
const loading: BookingState = {
	step: "choosing_slot", selection, userId: "visitor", slots: [], availability: "loading", notice: null,
};
const ready: BookingState = { ...loading, slots: [slot], availability: "ready" };
const selected: BookingState = { ...ready, selection: { ...selection, slotId: slot.id } };
const submitting: BookingState = { ...selected, step: "submitting", userId: "visitor" };
const registration = { id: "request-1", classId: slot.id, status: "pending" } as const;

it("does not restart failed Google recovery until the revocation clears", () => {
	const revoked = { type: "session_revoked", selection } as const;
	const recovering = transition(selected, revoked);
	expect(recovering).toEqual({ step: "recovering_session", selection: selected.selection });
	const failed = transition(recovering, { type: "operation_failed", operation: "auth", reason: "generic" });
	expect(failed).toEqual({ step: "session_recovery_failed", selection: selected.selection });
	expect(transition(failed, revoked)).toBe(failed);
	expect(transition(transition(failed, { type: "session_revocation_cleared" }), revoked)).toEqual(recovering);
});

describe("booking slot selection and request", () => {
	it("keeps a null template at the slot step as booking not open", () => {
		const closed = transition(loading, { type: "booking_not_open" });
		expect(closed).toEqual({ ...loading, availability: "not_open" });
		expect(transition(closed, { type: "slot_chosen", slotId: slot.id })).toBe(closed);
		expect(transition(closed, { type: "submit_requested" })).toBe(closed);
	});

	it("requires a loaded backend slot and explicit submission", () => {
		expect(transition(loading, { type: "slot_chosen", slotId: slot.id })).toBe(loading);
		expect(transition(loading, { type: "slots_loaded", slots: [slot] })).toEqual(ready);
		expect(transition(ready, { type: "slot_chosen", slotId: slot.id })).toEqual(selected);
		expect(transition(ready, { type: "submit_requested" })).toBe(ready);
		expect(transition(selected, { type: "submit_requested" })).toEqual(submitting);
		expect(transition(submitting, { type: "submit_requested" })).toBe(submitting);
		expect(transition(submitting, { type: "registration_requested", registration })).toEqual({
			step: "requested", selection: selected.selection, userId: "visitor", registration, slot,
		});
	});

	it("does not select missing slots or ones the backend marks unavailable", () => {
		expect(transition(ready, { type: "slot_chosen", slotId: "missing" })).toBe(ready);
		const unavailable: BookingState = { ...ready, slots: [{ ...slot, canRegister: false }] };
		expect(transition(unavailable, { type: "slot_chosen", slotId: slot.id })).toBe(unavailable);
	});

	it("returns a full slot to a refreshed list with a message, without replay", () => {
		const full = transition(submitting, { type: "slot_full" });
		expect(full).toEqual({ ...loading, notice: "slot_full" });
		const refreshed = transition(full, { type: "slots_loaded", slots: [] });
		expect(refreshed).toEqual({ ...ready, slots: [], notice: "slot_full" });
		expect(transition(refreshed, { type: "submit_requested" })).toBe(refreshed);
	});

	it("retries generic registration errors by loading slots, never submitting", () => {
		const failed = transition(submitting, { type: "operation_failed", operation: "registration", reason: "generic" });
		expect(failed.step).toBe("failed");
		expect(transition(failed, { type: "retry_requested" })).toEqual(loading);
	});

	it("retains the choice when reauthentication is required and requires profile completion", () => {
		const expired = transition(submitting, { type: "unauthenticated" });
		expect(expired).toEqual({ step: "needs_account", selection: selected.selection });
		expect(transition(expired, { type: "signed_in", userId: "next-visitor" })).toEqual({
			step: "completing_profile", selection: selected.selection, userId: "next-visitor",
		});
	});

	it("drops a stale selected slot when reloading or changing the visible range", () => {
		expect(transition(selected, { type: "slots_loaded", slots: [] })).toEqual({ ...ready, slots: [] });
		expect(transition(selected, { type: "slots_refresh_requested" })).toEqual(loading);
	});
});

describe("booking transition table", () => {
	const signingIn: BookingState = { ...account, step: "signing_in" };
	const signingUp: BookingState = { ...account, step: "signing_up" };
	const saving: BookingState = { ...profile, saving: true };
	const requested: BookingState = { step: "requested", selection: selected.selection, userId: "visitor", registration, slot };
	const authFailure: BookingState = { step: "failed", operation: "auth", reason: "generic", resume: account };
	const profileFailure: BookingState = { step: "failed", operation: "profile", reason: "generic", resume: profile };
	const slotsFailure: BookingState = { step: "failed", operation: "slots", reason: "generic", resume: loading };
	const registrationFailure: BookingState = { step: "failed", operation: "registration", reason: "generic", resume: loading };
	const closed: BookingState = { ...loading, availability: "not_open" };
	const stateCases = { initialState, account, signingIn, signingUp, profile, saving, loading, ready, selected, submitting, requested, authFailure, profileFailure, slotsFailure, registrationFailure, closed };
	const eventCases = {
		chosen,
		signIn: { type: "auth_started", method: "sign_in" },
		signUp: { type: "auth_started", method: "sign_up" },
		google: { type: "auth_started", method: "google" },
		redirectStarted: { type: "auth_redirect_started" },
		signedIn: { type: "signed_in", userId: "visitor" },
		profileSaved: { type: "profile_saved" },
		profileSaveStarted: { type: "profile_save_started" },
		profileReopened: { type: "profile_reopened" },
		registrationUpdated: { type: "registration_updated", registration: { ...registration, status: "approved" } },
		notOpen: { type: "booking_not_open" },
		refresh: { type: "slots_refresh_requested" },
		loaded: { type: "slots_loaded", slots: [slot] },
		slotChosen: { type: "slot_chosen", slotId: slot.id },
		submit: { type: "submit_requested" },
		registered: { type: "registration_requested", registration },
		full: { type: "slot_full" },
		unauthenticated: { type: "unauthenticated" },
		restored: { type: "redirect_restored", selection, profileUserId: "visitor", userId: "visitor" },
		authFailed: { type: "operation_failed", operation: "auth", reason: "generic" },
		profileFailed: { type: "operation_failed", operation: "profile", reason: "generic" },
		slotsFailed: { type: "operation_failed", operation: "slots", reason: "generic" },
		registrationFailed: { type: "operation_failed", operation: "registration", reason: "generic" },
		retry: { type: "retry_requested" },
		restart: { type: "restarted" },
	} satisfies Record<string, BookingEvent>;
	type EventName = keyof typeof eventCases;
	const expected: Record<keyof typeof stateCases, Partial<Record<EventName, BookingState>>> = {
		initialState: { chosen: account, restored: loading },
		account: { signIn: signingIn, signUp: signingUp, google: signingIn, signedIn: profile, authFailed: authFailure },
		signingIn: { signedIn: profile, authFailed: authFailure },
		signingUp: { signedIn: profile, authFailed: authFailure },
		profile: { profileSaved: loading, profileFailed: profileFailure, profileSaveStarted: saving },
		saving: { profileSaved: loading, profileFailed: profileFailure, profileSaveStarted: saving },
		loading: { notOpen: closed, refresh: loading, loaded: ready, slotsFailed: slotsFailure, profileReopened: profile },
		ready: { notOpen: closed, refresh: loading, loaded: ready, slotChosen: selected, slotsFailed: slotsFailure, profileReopened: profile },
		selected: { notOpen: closed, refresh: loading, loaded: selected, slotChosen: selected, submit: submitting, slotsFailed: slotsFailure, profileReopened: { ...profile, selection:selected.selection } },
		submitting: { registered: requested, full: { ...loading, notice: "slot_full" }, registrationFailed: registrationFailure },
		requested: { registrationUpdated: { ...requested, registration: { ...registration, status:"approved" } } },
		authFailure: { retry: account }, profileFailure: { retry: profile },
		slotsFailure: { retry: loading }, registrationFailure: { retry: loading },
		closed: { notOpen: closed, refresh: loading, loaded: ready, slotsFailed: slotsFailure, profileReopened: profile },
	};

	for (const [name, state] of Object.entries(stateCases)) {
		for (const [eventName, event] of Object.entries(eventCases)) {
			it(`${name} × ${eventName}`, () => {
				const before = structuredClone(state);
				const expectedState = eventName === "restart" ? initialState
					: eventName === "unauthenticated" && "selection" in state ? { step: "needs_account", selection: state.selection }
						: expected[name as keyof typeof stateCases][eventName as EventName];
				const next = transition(Object.freeze(state), Object.freeze(event));
				if (expectedState) expect(next).toEqual(expectedState);
				else expect(next).toBe(state);
				expect(state).toEqual(before);
			});
		}
		it(`${name} ignores unknown events`, () => {
			expect(transition(state, { type: "unknown" } as unknown as BookingEvent)).toBe(state);
		});
	}
});

describe("signed-out booking recovery", () => {
	const terms = { title: "Studio terms", text: "Terms", version: 3, locale: "en" };
	const credentials = { password: "abcdefghijklmnop", formatted: "abcd efgh ijkl mnop" };
	const guest = transition(initialState, { ...chosen, guest: true });
	const slotsLoaded = transition(guest, { type: "slots_loaded", slots: [slot] });
	const slotChosen = transition(slotsLoaded, { type: "slot_chosen", slotId: slot.id });
	const form = transition(slotChosen, { type: "signup_opened" });
	const termsLoaded = transition(form, { type: "terms_loaded", terms });
	const accepted = transition(termsLoaded, { type: "terms_accepted", accepted: true });
	const pending = transition(accepted, { type: "signup_started" });

	it("requires acceptance of the displayed terms before sending", () => {
		expect(transition(termsLoaded, { type: "signup_started" })).toBe(termsLoaded);
		expect(pending).toMatchObject({ step: "signup_details", busy: true });
	});

	it("asks again when the terms change, without losing the selected time", () => {
		const changed = transition(pending, { type: "terms_changed" });
		expect(changed).toMatchObject({ step: "signup_details", terms: null, busy: false, notice: "terms_changed" });
		const reloaded = transition(changed, { type: "terms_loaded", terms: { ...terms, version: 4 } });
		expect(reloaded).toMatchObject({ selection: { slotId: slot.id }, terms: { version: 4 } });
		expect(transition(reloaded, { type: "signup_started" })).toBe(reloaded);
	});

	it.each(["rate_limited", "terms_unavailable", "disabled", "not_found", "bad_request", "signup_failed"] as const)("makes %s visible without restarting the booking", type => {
		expect(transition(pending, { type })).toMatchObject({
			step: "signup_details", busy: false, notice: type, selection: { slotId: slot.id },
		});
	});

	it("keeps the selected time and resumes an existing account request after sign-in", () => {
		const existing = transition(pending, { type: "account_exists", email: "dana@example.com", contact: { displayName: "Dana", phoneNumber: "0501234567" } });
		expect(existing).toMatchObject({ step: "needs_account", email: "dana@example.com", selection: { slotId: slot.id } });
		const signing = transition(existing, { type: "auth_started", method: "sign_in" });
		const resumed = transition(signing, { type: "signed_in", userId: "visitor" });
		expect(resumed).toMatchObject({ step: "completing_profile", userId: "visitor", selection: { slotId: slot.id } });
		expect(transition(resumed, { type: "registration_requested", registration })).toBe(resumed);
		const submitted = transition(resumed, { type: "profile_saved" });
		expect(submitted).toMatchObject({ step: "submitting", userId: "visitor", selection: { slotId: slot.id } });
		expect(transition(submitted, { type: "registration_requested", registration })).toMatchObject({ step: "requested", registration });
	});

	it("goes back to anonymous time choice if the account was never created", () => {
		expect(transition(pending, { type: "class_unavailable" })).toMatchObject({
			step: "choosing_slot", userId: null, notice: "slot_full", selection: { slotId: null },
		});
	});

	it("shows the issued password before returning a signed-in client to time choice", () => {
		const password = transition(pending, { type: "class_unavailable", userId: "visitor", credentials });
		expect(password).toMatchObject({ step: "signup_password", credentials });
		const newSlot = transition(password, { type: "password_saved" });
		expect(newSlot).toMatchObject({ step: "choosing_slot", userId: "visitor", notice: "slot_full", selection: { slotId: null } });
		expect(newSlot).not.toHaveProperty("credentials");
	});

	it("shows the password, then resumes an already-created request after sign-in without sending it twice", () => {
		const password = transition(pending, { type: "sign_in_failed", credentials, registration, email: "dana@example.com" });
		expect(password).toMatchObject({ step: "signup_password", credentials });
		const account = transition(password, { type: "password_saved" });
		expect(account).toMatchObject({ step: "needs_account", email: "dana@example.com" });
		expect(account).not.toHaveProperty("credentials");
		const signing = transition(account, { type: "auth_started", method: "sign_in" });
		expect(transition(signing, { type: "signed_in", userId: "visitor" })).toMatchObject({ step: "requested", registration });
	});
	it("lets a newly created account select another time when sign-in failed before any registration", () => {
		const password = transition(pending, { type: "sign_in_failed", credentials, email: "dana@example.com" });
		const account = transition(password, { type: "password_saved" });
		expect(account).toMatchObject({ continuation: { kind: "choose_slot" } });
		const signing = transition(account, { type: "auth_started", method: "sign_in" });
		expect(transition(signing, { type: "signed_in", userId: "visitor" })).toMatchObject({
			step: "choosing_slot", userId: "visitor", notice: "slot_full", selection: { slotId: null },
		});
	});
});
