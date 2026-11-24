import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProductContext } from "../../lib/product-provider";
import { getStudioAccess, type StudioAccess } from "../../lib/studio-access";
import { AccountDetails, AccountStep, createBookingAdapter, PasswordChange, usePasswordChange } from "../booking";
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
	return <main data-module="studio" className="booking-page studio-page"><section>
		{state.error && <p role="alert" className="notice error">{state.error.message ?? t(state.error.code === "redirect_storage" ? "storageError" : "networkError")}</p>}
		{state.step === "signed_out" ? <>
			{passwordChange.signedOut && <p role="status">{t("passwordChange.outcomes.signed_out", { ns: "booking" })}</p>}
			<AccountStep product={context.product} loading={false} busy={busy} signInOnly title={t("title")} description={t("signInDescription")}
				onPassword={(_method, email, password) => void passwordChange.runAuth(() => signIn(email, password))}
				onGoogle={() => void passwordChange.runAuth(signInWithGoogle)} />
		</> : <>
			<h1>{t("title")}</h1>
			{state.step === "loading" && <p role="status">{t("loading")}</p>}
			{state.step === "not_manager" && <p className="lede">{t("notManager")}</p>}
			{state.step === "failed" && <Ticket stub="" onClick={retry}>{t("retry")}</Ticket>}
			{state.step === "ready" && <>
				<section aria-labelledby="studio-pending"><h2 id="studio-pending">{t("pending")}</h2>{state.pending.length ? <MeetingList rows={state.pending} busy={busy} onDecide={(id, action, reason) => void decide(id, action, reason)} /> : <p>{t("noPending")}</p>}</section>
				<section aria-labelledby="studio-upcoming"><h2 id="studio-upcoming">{t("upcoming")}</h2>{state.upcoming.length ? <MeetingList rows={state.upcoming} /> : <p>{t("noUpcoming")}</p>}</section>
				<section aria-labelledby="studio-history"><h2 id="studio-history">{t("history")}</h2>{state.history.length ? <MeetingList rows={state.history} showStatus /> : <p>{t("noHistory")}</p>}</section>
			</>}
			{showAccount && <>
				{session && <AccountDetails adapter={accountAdapter} userId={session.user.id} onSignedOut={() => {
					if (session.access_token === passwordChange.requestSessionToken()) onSignedOut();
				}} />}
				{passwordChange.canChangePassword && <PasswordChange state={passwordChange.state} busy={busy}
					onRejected={passwordChange.onRejected} onSubmit={(current, next) => void passwordChange.submit(current, next)} />}
			</>}
			{session && <div className="actions"><Ticket stub="" className="booking-link" disabled={busy} onClick={() => void passwordChange.runAuth(signOut)}>{t("signOut")}</Ticket></div>}
		</>}
	</section></main>;
}
