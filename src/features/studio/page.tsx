import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useProductContext } from "../../lib/product-provider";
import { getStudioAccess, type StudioAccess } from "../../lib/studio-access";
import { AccountDetails, AccountStep, createBookingAdapter, PasswordChange, RetryTicket, StudioPass, usePasswordChange } from "../booking";
import { Ticket } from "../../ui/ticket";
import { useStudio } from "./use-studio";
import { MeetingList } from "./meeting-list";
import "./studio.css";

export function StudioPage() {
	const context = useProductContext();
	const { client, refreshProductContext } = context;
	const accountAdapter = useMemo(() => createBookingAdapter(client, refreshProductContext), [client, refreshProductContext]);
	// Keep the password result when the provider temporarily clears the session during renewal.
	const passwordChange = usePasswordChange(context, accountAdapter);
	const access = passwordChange.signedOut && !context.loading ? "signed_out" : getStudioAccess(context);
	return <StudioSession key={`${context.session?.user.id ?? "anonymous"}:${access}`} context={context} access={access}
		accountAdapter={accountAdapter} passwordChange={passwordChange} />;
}

function StudioSession({ context, access, accountAdapter, passwordChange }: {
	context: ReturnType<typeof useProductContext>;
	access: StudioAccess;
	accountAdapter: ReturnType<typeof createBookingAdapter>;
	passwordChange: ReturnType<typeof usePasswordChange>;
}) {
	const { t } = useTranslation(["studio", "booking"]);
	const { state, decide, retry, signIn, signOut, signInWithGoogle, onSignedOut } = useStudio(context, access);
	const busy = Boolean(state.busy) || passwordChange.busy;
	const showAccount = access === "manager" && (state.step === "ready" || state.step === "failed" || state.step === "not_manager");
	const { session } = context;
	const gate = state.step === "signed_out";
	return <main data-module="studio" className={`booking-page studio-page${gate ? " gate" : ""}`}><section>
		{state.error && <p role="alert" className="notice error">{state.error.message ?? t(state.error.code === "redirect_storage" ? "storageError" : "networkError")}</p>}
		{gate ? <>
			{passwordChange.signedOut && <p role="status">{t("passwordChange.outcomes.signed_out", { ns: "booking" })}</p>}
			<AccountStep product={context.product} loading={false} busy={busy} signInOnly title={t("title")} description={t("signInDescription")}
				onPassword={(_method, email, password) => void passwordChange.runAuth(() => signIn(email, password))}
				onGoogle={() => void passwordChange.runAuth(signInWithGoogle)} />
		</> : <>
			<header className="page-head">
				<div>
					<h1>{t("title")}</h1>
					{state.step === "ready" && <span className="head-label">{t("counts", { pending: state.pending.length, upcoming: state.upcoming.length })}</span>}
				</div>
				{session && <Ticket small tone="ghost" stub="↩" disabled={busy} onClick={() => void passwordChange.runAuth(signOut)}>{t("signOut")}</Ticket>}
			</header>
			{state.step === "loading" && <p role="status">{t("loading")}</p>}
			{state.step === "not_manager" && <p className="lede">{t("notManager")}</p>}
			{state.step === "failed" && <RetryTicket tone="ink" onClick={retry} />}
			{state.step === "ready" && <>
				<StudioPart id="studio-pending" title={t("pending")} count={state.pending.length}>
					{state.pending.length ? <MeetingList rows={state.pending} busy={busy} onDecide={(id, action, reason) => void decide(id, action, reason)} /> : <p>{t("noPending")}</p>}
				</StudioPart>
				<StudioPart id="studio-upcoming" title={t("upcoming")} count={state.upcoming.length}>
					{state.upcoming.length ? <MeetingList rows={state.upcoming} /> : <p>{t("noUpcoming")}</p>}
				</StudioPart>
				<StudioPart id="studio-history" title={t("history")} count={state.history.length}>
					{state.history.length ? <MeetingList rows={state.history} showStatus /> : <p>{t("noHistory")}</p>}
				</StudioPart>
			</>}
			{showAccount && <div className="studio-account">
				{session && <AccountDetails adapter={accountAdapter} userId={session.user.id} onSignedOut={() => {
					if (session.access_token === passwordChange.requestSessionToken()) onSignedOut();
				}} />}
				{passwordChange.canChangePassword && <PasswordChange state={passwordChange.state} busy={busy}
					onRejected={passwordChange.onRejected} onSubmit={(current, next) => void passwordChange.submit(current, next)} />}
			</div>}
		</>}
	</section>{gate && <StudioPass />}</main>;
}

function StudioPart({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
	return <section className="studio-part" aria-labelledby={id}>
		<h2 id={id}>{title}<small aria-hidden="true">{count}</small></h2>
		{children}
	</section>;
}
