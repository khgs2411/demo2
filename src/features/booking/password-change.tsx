import { useId, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import type { PasswordChangeState } from "./password-change-machine";
import { passwordProblem, type PasswordProblem } from "./password-validation";

export function PasswordChange({ state, busy, onRejected, onSubmit }: {
	state: PasswordChangeState;
	busy: boolean;
	onRejected: (problem: PasswordProblem) => void;
	onSubmit: (currentPassword: string, newPassword: string) => void;
}) {
	const { t } = useTranslation("booking");
	const { t: resetText } = useTranslation("passwordReset");
	const headingId = useId();
	const saving = state.step === "saving";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy || saving) return;
		const form = event.currentTarget;
		const fields = new FormData(form);
		const currentPassword = String(fields.get("currentPassword"));
		const newPassword = String(fields.get("newPassword"));
		const problem = passwordProblem(newPassword, String(fields.get("confirmation")));
		form.reset();
		if (problem) onRejected(problem);
		else onSubmit(currentPassword, newPassword);
	}

	const changed = state.step === "settled" && state.outcome === "password_changed";
	return <section aria-labelledby={headingId} className="password-change">
		<h2 id={headingId}>{t("passwordChange.title")}</h2>
		{state.step === "editing" && state.problem && <p role="alert" className="notice error">{resetText(`completeMessages.${state.problem}`)}</p>}
		{state.step === "settled" && state.outcome !== "signed_out" && <p role={changed ? "status" : "alert"} className={changed ? undefined : "notice error"}>
			{t(`passwordChange.outcomes.${state.outcome}`)}
		</p>}
		<form onSubmit={submit}>
			<fieldset className="fields" disabled={busy || saving}>
				<Input label={t("passwordChange.currentPassword")} name="currentPassword" type="password" autoComplete="current-password" required />
				<Input label={resetText("newPassword")} name="newPassword" type="password" autoComplete="new-password" required />
				<Input label={resetText("confirmPassword")} name="confirmation" type="password" autoComplete="new-password" required />
			</fieldset>
			<div className="actions">
				<Ticket type="submit" stub="✓" small tone="ink" disabled={busy || saving}>{t(saving ? "passwordChange.saving" : "passwordChange.save")}</Ticket>
				<TextLink href="#/forgot-password">{resetText("forgotTitle")}</TextLink>
			</div>
		</form>
	</section>;
}
