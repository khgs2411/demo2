import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "../app/language";
import { Ticket } from "./ticket";
import { TextLink } from "./text-link";
import { Kicker } from "./kicker";
import { LogLine } from "./log-line";
import { LedgerRow } from "./ledger-row";
import { Input } from "./input";
import "../i18n";
import "../index.css";

function Sample() {
	const { t } = useTranslation("shell");
	return <main className="primitives-sample">
		<LanguageSwitch /><Kicker>{t("sample.kicker")}</Kicker><h1>{t("brand")}</h1>
		<p>{t("description")}</p>
		<Ticket href="/#/book" stub={t("sample.ticketNumber")}>{t("sample.book")}</Ticket>
		<TextLink href="/#/demo">{t("sample.demo")}</TextLink>
		<Input label={t("sample.name")} />
		<div className="ledger"><LedgerRow name={t("sample.meeting")} price={t("sample.request")} details={t("description")}>
			<Ticket href="/#/book" stub={t("sample.ticketNumber")}>{t("sample.book")}</Ticket>
		</LedgerRow></div>
		<div className="sample-underside"><LogLine>{t("sample.log")}</LogLine></div>
	</main>;
}

createRoot(document.getElementById("root")!).render(<Sample />);
