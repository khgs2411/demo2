import { useTranslation } from "react-i18next";
import { Pass, type PassRow } from "../../ui/pass";

export function AccountPass() {
	const { t } = useTranslation("pass");
	return <Pass kicker={t("account.kicker")} code={t("account.code")} status={t("account.status")} num={t("account.num")} rows={[
		{ label: t("account.requests"), value: t("account.requestsValue") },
		{ label: t("account.details"), value: t("account.detailsValue") },
		{ label: t("account.terms"), value: t("account.termsValue") },
	]} />;
}

export function StudioPass() {
	const { t } = useTranslation("pass");
	return <Pass tone="ink" kicker={t("studio.kicker")} code={t("studio.code")} status={t("studio.status")} num={t("studio.num")} rows={[
		{ label: t("studio.pending"), value: t("studio.pendingValue") },
		{ label: t("studio.upcoming"), value: t("studio.upcomingValue") },
		{ label: t("studio.history"), value: t("studio.historyValue") },
	]} />;
}

type ResetStep = 1 | 2 | 3;

export function ResetPass({ step }: { step: ResetStep }) {
	const { t } = useTranslation("pass");
	function rowState(row: ResetStep): PassRow["state"] {
		if (row < step || step === 3) return "done";
		return row === step ? "now" : "next";
	}
	return <Pass tone="sand" numbered kicker={t("reset.kicker")} code={t("reset.code")} status={t("reset.status")} num={`${step}/3`}
		stamp={step === 3 ? t("reset.stamp") : undefined} rows={[
			{ label: t("reset.email"), value: t("reset.emailValue"), state: rowState(1) },
			{ label: t("reset.choose"), value: t("reset.chooseValue"), state: rowState(2) },
			{ label: t("reset.signIn"), value: t("reset.signInValue"), state: rowState(3) },
		]} />;
}
