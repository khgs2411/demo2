import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useProductContext } from "../lib/product-provider";
import { getStudioAccess } from "../lib/studio-access";
import { TextLink } from "../ui/text-link";
import { Header } from "./header";
import { TicketDock } from "./ticket-dock";
import { useRoute } from "./router";
import "./chrome.css";

export function Layout({ children }: { children: ReactNode }) {
	const { t } = useTranslation("shell");
	const route = useRoute();
	const studioAccess = getStudioAccess(useProductContext());
	const showDock = route?.page !== "booking" && route?.page !== "showcase";
	// The walkthrough owns the compact demonstration frame shown in its reference.
	if (route?.page === "admin-sim") return <>{children}</>;
	return <><Header /><div className="shell-content">{children}</div>{showDock && <TicketDock />}
		<footer className={`footer${showDock ? " footer-with-dock" : ""}`}><div className="chrome-wrap"><p>{t("description")}</p>
			{studioAccess !== "manager" && <TextLink href="#/account">{t("myRequests")}</TextLink>}
		<span>{t("credit")}</span><span>© 2026</span></div></footer>
	</>;
}
