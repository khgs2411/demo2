import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import type { BookingProfile, BookingSelection, SignupDraft } from "./machine";
import { useBooking } from "./use-booking";
import { readBookingChoice, saveBookingChoice } from "./redirect";
import { PackageStep } from "./package-step";
import { AccountStep } from "./account-step";
import { IssuedPassword } from "./issued-password";
import { SignupStep } from "./signup-step";
import { ProfileStep } from "./profile-step";
import { SlotStep } from "./slot-step";
import { RequestedStep } from "./requested-step";
import { SummaryTicket } from "./summary-ticket";
import "./booking.css";

export function BookingPage({ packageId }: { packageId?: string }) {
	const { t, i18n } = useTranslation("booking");
	const [draft, setDraft] = useState<BookingSelection>(() => {
		const saved = readBookingChoice();
		return { packageId: packageId === "site" || packageId === "system" ? packageId : saved?.packageId ?? "system", addonInterests: saved?.addonInterests ?? [], slotId: null };
	});
	const flow = useBooking(i18n.language, draft);
	const { state, context } = flow;
	const [editedProfile, setProfile] = useState<BookingProfile>();
	const [signup, setSignup] = useState<SignupDraft>({ displayName: "", email: "", phone: "" });
	const main = useRef<HTMLElement>(null);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const view = state.step === "failed" ? state.resume : state;
	const prefill = view.step === "completing_profile" ? view.prefill : undefined;
	const pendingContact = view.step === "completing_profile" ? view.pendingRequest?.contact : undefined;
	const profile = editedProfile ?? {
		displayName: prefill?.displayName || pendingContact?.displayName || signup.displayName,
		phoneNumber: prefill?.phoneNumber || pendingContact?.phoneNumber || signup.phone,
		businessName: prefill?.businessName ?? "",
		websiteUrl: prefill?.websiteUrl,
	};
	const selection = "selection" in view ? view.selection : draft;
	const guestSteps = view.step === "signup_details" || (view.step === "choosing_slot" && view.userId === null)
		|| (view.step === "requested" && !!view.credentials) || view.step === "signup_password";
	const stepLabels = guestSteps ? ["sPackage", "sSlot", "sProfile"] : ["sPackage", "sAccount", "sProfile", "sSlot"];
	const isAccount = view.step === "needs_account" || view.step === "signing_up" || view.step === "signing_in"
		|| view.step === "recovering_session" || view.step === "session_recovery_failed";
	const stepIndex = guestSteps
		? view.step === "choosing_slot" ? 1 : view.step === "signup_details" ? 2 : 3
		: view.step === "choosing_package" ? 0 : isAccount ? 1 : view.step === "completing_profile" ? 2 : view.step === "requested" ? 4 : 3;
	const profileBusy = view.step === "completing_profile" && (view.saving || (!editedProfile && prefill === undefined));
	const slot = (view.step === "requested" || view.step === "signup_details") ? view.slot : (view.step === "choosing_slot" || view.step === "submitting") ? view.slots.find(slot => slot.id === view.selection.slotId) : undefined;
	useEffect(() => { main.current?.querySelector<HTMLElement>("h1")?.focus(); }, [view.step]);
	useEffect(() => { saveBookingChoice(selection); }, [selection]);
	return <main className="booking-page book" data-module="booking" ref={main}>
		<section>
			<ol className={guestSteps ? "steps guest-steps" : "steps"} aria-label={t("ticketHead")}>{stepLabels.map((key, index) => <li key={key} className={index < stepIndex ? "done" : index === stepIndex ? "now" : ""} aria-current={index === stepIndex ? "step" : undefined}>
				<span aria-hidden="true">0{index + 1}</span><span>{t(key)}</span>
			</li>)}</ol>
			<div className="step shown" key={view.step} aria-busy={view.step === "recovering_session" || view.step === "signing_in" || view.step === "signing_up" || view.step === "submitting" || (view.step === "signup_details" && view.busy) || profileBusy}>
				{context.sessionErrorCode === "session_revoked" && state.step === "failed" ? <p role="status">{t("loading")}</p> : state.step === "failed" ? <><h1 tabIndex={-1}>{t(stepIndex === 1 ? "aTitle" : stepIndex === 2 ? "prTitle" : "sTitle")}</h1>
					<p role="alert" className="notice error">{t(`messages.${state.reason === "redirect_storage" ? "redirect_storage" : `${state.operation}_failed`}`)}</p>
					<Ticket stub="↻" onClick={() => flow.send({ type:"retry_requested" })}>{t("retry")}</Ticket></> : <>
					{view.step === "choosing_package" && <PackageStep selection={draft} onChange={setDraft} onContinue={() => flow.choosePackage(draft)} />}
					{isAccount && <>
						{"continuation" in view && view.continuation?.kind === "book" && <p role="alert" className="notice">{t("signupMessages.account_exists")}</p>}
						<AccountStep signInOnly email={"email" in view ? view.email : undefined} emailReadOnly={"continuation" in view && Boolean(view.continuation)} product={context.product} loading={context.loading} busy={view.step !== "needs_account" && view.step !== "session_recovery_failed"}
						onPassword={(...args) => void flow.auth(...args)} onGoogle={() => void flow.google()} onBack={() => flow.send({ type:"account_back" })} />
					</>}
					{view.step === "signup_details" && <SignupStep flow={flow} draft={signup} onChange={setSignup} />}
					{view.step === "completing_profile" && <ProfileStep profile={profile} onChange={setProfile} onSubmit={() => { setProfile(profile); void flow.saveProfile(profile); }} busy={Boolean(profileBusy)} />}
					{(view.step === "choosing_slot" || view.step === "submitting") && <SlotStep flow={flow} timeZone={timeZone} />}
					{view.step === "signup_password" && <>
						<h1 tabIndex={-1}>{t(view.next.step === "choosing_slot" ? "sTitle" : "signIn")}</h1>
						<p className="lede">{t(view.next.step === "choosing_slot" ? "slotFull" : "signupMessages.sign_in_failed")}</p>
						<IssuedPassword credentials={view.credentials} />
						<div className="actions"><Ticket stub="→" onClick={() => flow.send({ type: "password_saved" })}>{t("next")}</Ticket></div>
					</>}
					{view.step === "requested" && <RequestedStep flow={flow} />}
				</>}
			</div>
		</section>
		<SummaryTicket selection={selection} profile={profile} slot={slot} registration={view.step === "requested" ? view.registration : undefined} timeZone={timeZone} />
	</main>;
}
