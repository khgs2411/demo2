import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../ui/input";
import { Ticket } from "../../../ui/ticket";
import { createBookingAdapter, useBookingContext } from "../adapter";
import { passwordProblem } from "../password-validation";
import { initialResetState, resetTransition } from "./machine";
import { dropResetToken, readResetToken } from "./memory";
import "../booking.css";

export function ResetPasswordPage() {
	const { t } = useTranslation("passwordReset");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const [token] = useState(readResetToken);
	const [state, dispatch] = useReducer(resetTransition, token, initialResetState);
	const main = useRef<HTMLElement>(null);
	const locked = useRef(false);
	const mounted = useRef(true);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useEffect(() => {
		if (state.step === "done" || state.step === "link_unusable") {
			dropResetToken();
			main.current?.querySelector<HTMLElement>("h1")?.focus();
		}
	}, [state.step]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (locked.current || !token) return;
		const form = new FormData(event.currentTarget);
		const password = String(form.get("password"));
		const problem = passwordProblem(password, String(form.get("confirmation")));
		if (problem) {
			dispatch({ type: "password_rejected", problem });
			return;
		}
		locked.current = true;
		dispatch({ type: "save_started" });
		try {
			const outcome = await adapter.completePasswordReset(token, password);
			if (mounted.current) dispatch({ type: "save_finished", outcome });
		} finally { locked.current = false; }
	}

	return <main data-module="booking" className="booking-page account-page" ref={main}>
		<section aria-busy={state.step === "saving"}>
			{state.step === "no_link" && <>
				<h1 tabIndex={-1}>{t("resetTitle")}</h1>
				<p className="notice" role="status">{t("noLink")}</p>
				<div className="actions"><Ticket href="#/forgot-password" stub="→">{t("requestLink")}</Ticket></div>
			</>}
			{state.step === "link_unusable" && <>
				<h1 tabIndex={-1}>{t("resetTitle")}</h1>
				<p className="notice error" role="alert">{t(`completeMessages.${state.reason}`)}</p>
				<div className="actions"><Ticket href="#/forgot-password" stub="↻">{t("requestNewLink")}</Ticket></div>
			</>}
			{state.step === "done" && <>
				<h1 tabIndex={-1}>{t("doneTitle")}</h1>
				<p className="lede" role="status">{t("doneLede")}</p>
				<div className="actions"><Ticket href="#/account" stub="→">{t("signIn")}</Ticket></div>
			</>}
			{(state.step === "choosing" || state.step === "saving") && <>
				<h1 tabIndex={-1}>{t("resetTitle")}</h1><p className="lede">{t("resetLede")}</p>
				{state.step === "choosing" && state.notice && <p className="notice error" role="alert">{t(`completeMessages.${state.notice}`)}</p>}
				<form onSubmit={event => void submit(event)}>
					<fieldset className="fields" disabled={state.step === "saving"}>
						<div><Input label={t("newPassword")} name="password" type="password" autoComplete="new-password" aria-describedby="reset-password-hint" required />
							<span className="hint" id="reset-password-hint">{t("pwHint")}</span></div>
						<Input label={t("confirmPassword")} name="confirmation" type="password" autoComplete="new-password" required />
					</fieldset>
					<div className="actions">
						<Ticket type="submit" stub="→" disabled={state.step === "saving"}>{t(state.step === "saving" ? "loading" : "save")}</Ticket>
					</div>
				</form>
			</>}
		</section>
	</main>;
}
