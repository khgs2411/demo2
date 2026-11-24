import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useProductContext } from "../lib/product-provider";
import { getStudioAccess } from "../lib/studio-access";
import { TextLink } from "../ui/text-link";
import { Header } from "./header";
import { TicketDock } from "./ticket-dock";
import { useRoute } from "./router";

export function Layout({ children }: { children: ReactNode }) {
	const { t } = useTranslation("shell");
	const route = useRoute();
	const studioAccess = getStudioAccess(useProductContext());
	// The walkthrough owns the compact demonstration frame shown in its reference.
	if (route?.page === "admin-sim") return <>{children}</>;
	return <><Header /><div className="shell-content">{children}</div>{route?.page !== "booking" && <TicketDock />}
		<footer className="footer"><p>{t("description")}</p>
			{studioAccess !== "manager" && <TextLink href="#/account">{t("myRequests")}</TextLink>}
		</footer>
	</>;
}
