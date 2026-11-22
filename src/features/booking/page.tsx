import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import type { BookingProfile } from "./adapter";
import type { BookingSelection, SignupDraft } from "./machine";
import { useBooking } from "./use-booking";
import { readBookingChoice, saveBookingChoice } from "./redirect";
import { PackageStep } from "./package-step";
import { AccountStep } from "./account-step";
import { SignupStep } from "./signup-step";
import { ProfileStep } from "./profile-step";
import { SlotStep } from "./slot-step";
import { RequestedStep } from "./requested-step";
import { SummaryTicket } from "./summary-ticket";
import "./booking.css";

export function BookingPage({ packageId }: { packageId?: string }) {
	const { t, i18n } = useTranslation("booking");
	const flow = useBooking(i18n.language);
	const { state, context } = flow;
	const [draft, setDraft] = useState<BookingSelection>(() => {
		const saved = readBookingChoice();
		return { packageId: packageId === "site" || packageId === "system" ? packageId : saved?.packageId ?? "system", addonInterests: saved?.addonInterests ?? [], slotId: null };
	});
	const [profile, setProfile] = useState<BookingProfile>({ displayName: "", phoneNumber: "", businessName: "" });
	const [signup, setSignup] = useState<SignupDraft>({ displayName: "", email: "", phone: "" });
	const main = useRef<HTMLElement>(null);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const view = state.step === "failed" ? state.resume : state;
	const selection = "selection" in view ? view.selection : draft;
	const stepIndex = view.step === "choosing_package" ? 0 : ["needs_account", "signing_up", "signing_in"].includes(view.step) ? 1 : (view.step === "completing_profile" || view.step === "signup_details") ? 2 : view.step === "requested" ? 4 : 3;
	const slot = (view.step === "requested" || view.step === "signup_details") ? view.slot : (view.step === "choosing_slot" || view.step === "submitting") ? view.slots.find(slot => slot.id === view.selection.slotId) : undefined;
	useEffect(() => { main.current?.querySelector<HTMLElement>("h1")?.focus(); }, [view.step]);
	useEffect(() => { saveBookingChoice(selection); }, [selection]);
	return <main className="booking-page book" data-module="booking" ref={main}>
		<section>
			<ol className="steps" aria-label={t("ticketHead")}>{["sPackage", "sAccount", "sProfile", "sSlot"].map((key, index) => <li key={key} className={index < stepIndex ? "done" : index === stepIndex ? "now" : ""} aria-current={index === stepIndex ? "step" : undefined}>
				<span aria-hidden="true">0{index + 1}</span><span>{t(key)}</span>
			</li>)}</ol>
			<div className="step shown" key={view.step} aria-busy={view.step === "signing_in" || view.step === "signing_up" || view.step === "submitting" || (view.step === "signup_details" && view.busy) || (view.step === "completing_profile" && view.saving)}>
				{state.step === "failed" ? <><h1 tabIndex={-1}>{t(stepIndex === 1 ? "aTitle" : stepIndex === 2 ? "prTitle" : "sTitle")}</h1>
					<p role="alert" className="notice error">{t(`messages.${state.reason === "redirect_storage" ? "redirect_storage" : `${state.operation}_failed`}`)}</p>
					<Ticket stub="↻" onClick={() => flow.send({ type:"retry_requested" })}>{t("retry")}</Ticket></> : <>
					{view.step === "choosing_package" && <PackageStep selection={draft} onChange={setDraft} onContinue={() => flow.choosePackage(draft)} />}
					{(view.step === "needs_account" || view.step === "signing_in" || view.step === "signing_up") && <AccountStep product={context.product} loading={context.loading} busy={view.step !== "needs_account"}
						onPassword={(...args) => void flow.auth(...args)} onGoogle={() => void flow.google()} onBack={() => flow.send({ type:"restarted" })} />}
					{view.step === "signup_details" && <SignupStep flow={flow} draft={signup} onChange={setSignup} />}
					{view.step === "completing_profile" && <ProfileStep profile={profile} onChange={setProfile} onSubmit={() => void flow.saveProfile(profile)} busy={Boolean(view.saving)} />}
					{(view.step === "choosing_slot" || view.step === "submitting") && <SlotStep flow={flow} timeZone={timeZone} />}
					{view.step === "requested" && <RequestedStep flow={flow} />}
				</>}
			</div>
		</section>
		<SummaryTicket selection={selection} profile={profile} slot={slot} registration={view.step === "requested" ? view.registration : undefined} timeZone={timeZone} />
	</main>;
}
