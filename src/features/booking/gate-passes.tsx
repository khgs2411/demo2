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
	return <Pass kicker={t("studio.kicker")} code={t("studio.code")} status={t("studio.status")} num={t("studio.num")} rows={[
		{ label: t("studio.pending"), value: t("studio.pendingValue") },
		{ label: t("studio.upcoming"), value: t("studio.upcomingValue") },
		{ label: t("studio.history"), value: t("studio.historyValue") },
	]} />;
}
