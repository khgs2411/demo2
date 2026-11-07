import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../ui/text-link";
import { Header } from "./header";
import { TicketDock } from "./ticket-dock";

export function Layout({ children }: { children: ReactNode }) {
	const { t } = useTranslation("shell");
	return <><Header /><div className="shell-content">{children}</div><TicketDock />
		<footer className="footer"><p>{t("description")}</p><TextLink href="#/account">{t("myRequests")}</TextLink></footer>
	</>;
}
