import { useTranslation } from "react-i18next";
import { useProductContext } from "../lib/product-provider";
import { getStudioAccess } from "../lib/studio-access";
import { Ticket } from "../ui/ticket";
import { TextLink } from "../ui/text-link";
import { LanguageSwitch } from "./language";

export function Header() {
	const { t } = useTranslation("shell");
	const studioAccess = getStudioAccess(useProductContext());
	return <header className="topline">
		<a className="mark" href="#/"><b aria-hidden="true">{t("brandMark")}</b><span>{t("brand")}</span></a>
		<nav className="links" aria-label={t("navigation")}>
			<TextLink href="#/">{t("howItWorks")}</TextLink>
			<TextLink href="#/demo">{t("liveDemo")}</TextLink>
			<TextLink href="#/packages">{t("packages")}</TextLink>
		</nav>
		{studioAccess !== "loading" && <div className="account-links">
			<TextLink href={studioAccess === "manager" ? "#/studio" : "#/account"}>
				{studioAccess === "signed_out" ? t("signIn") : t("myAccount")}
			</TextLink>
		</div>}
		<LanguageSwitch />
		<Ticket href="#/book" stub={t("ticketNumber")} small data-desk>{t("bookMeeting")}</Ticket>
	</header>;
}
