import { useProductContext } from "@class-kit/react";
import { useTranslation } from "react-i18next";
import { getStudioAccess, type StudioAccess } from "../../lib/studio-access";
import { AccountStep } from "../booking";
import { Ticket } from "../../ui/ticket";
import { useStudio } from "./use-studio";
import { MeetingList } from "./meeting-list";
import "./studio.css";

export function StudioPage() {
	const context = useProductContext();
	const access = getStudioAccess(context);
	return <StudioSession key={`${context.session?.user.id ?? "anonymous"}:${access}`} context={context} access={access} />;
}

function StudioSession({ context, access }: { context: ReturnType<typeof useProductContext>; access: StudioAccess }) {
	const { t } = useTranslation("studio");
	const { state, decide, retry, signIn, signOut, signInWithGoogle } = useStudio(context, access);
	return <main data-module="studio" className="booking-page studio-page"><section>
		{state.error && <p role="alert" className="notice error">{state.error.message ?? t(state.error.code === "redirect_storage" ? "storageError" : "networkError")}</p>}
		{state.step === "signed_out" ? <AccountStep product={context.product} loading={false} busy={Boolean(state.busy)} signInOnly title={t("title")} description={t("signInDescription")}
			onPassword={(_method, email, password) => void signIn(email,password)} onGoogle={() => void signInWithGoogle()} /> : <>
			<h1>{t("title")}</h1>
			{state.step === "loading" && <p role="status">{t("loading")}</p>}
			{state.step === "not_manager" && <p className="lede">{t("notManager")}</p>}
			{state.step === "failed" && <Ticket stub="" onClick={retry}>{t("retry")}</Ticket>}
			{state.step === "ready" && <>
				<section aria-labelledby="studio-pending"><h2 id="studio-pending">{t("pending")}</h2>{state.pending.length ? <MeetingList rows={state.pending} busy={state.busy} onDecide={(id, action, reason) => void decide(id, action, reason)} /> : <p>{t("noPending")}</p>}</section>
				<section aria-labelledby="studio-upcoming"><h2 id="studio-upcoming">{t("upcoming")}</h2>{state.upcoming.length ? <MeetingList rows={state.upcoming} /> : <p>{t("noUpcoming")}</p>}</section>
				<section aria-labelledby="studio-history"><h2 id="studio-history">{t("history")}</h2>{state.history.length ? <MeetingList rows={state.history} showStatus /> : <p>{t("noHistory")}</p>}</section>
			</>}
			{context.session && <div className="actions"><Ticket stub="" className="booking-link" disabled={state.busy} onClick={() => void signOut()}>{t("signOut")}</Ticket></div>}
		</>}
	</section></main>;
}
