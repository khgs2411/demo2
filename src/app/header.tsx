import { useTranslation } from "react-i18next";
import { useProductContext } from "../lib/product-provider";
import { getStudioAccess } from "../lib/studio-access";
import { Ticket } from "../ui/ticket";
import { SectionLink } from "../ui/section-link";
import { TextLink } from "../ui/text-link";
import { LanguageSwitch } from "./language";
import { useRoute } from "./router";

export function Header() {
	const { t } = useTranslation("shell");
	const studioAccess = getStudioAccess(useProductContext());
	const home = useRoute()?.page === "showcase";
	return <header className="topline"><div className="chrome-wrap">
		<a className="mark" href="#/">{t("brand")}</a>
		<nav className="links" aria-label={t("navigation")}>
			{home ? <SectionLink targetId="get">{t("whatYouGet")}</SectionLink> : <TextLink href="#/">{t("howItWorks")}</TextLink>}
			<TextLink href="#/demo">{t("liveDemo")}</TextLink>
			<TextLink href="#/packages">{t("packages")}</TextLink>
		</nav>
		{studioAccess !== "loading" && <div className="account-links">
			<TextLink href={studioAccess === "manager" ? "#/studio" : "#/account"}>
				{studioAccess === "signed_out" ? t("signIn") : t("myAccount")}
			</TextLink>
		</div>}
		<LanguageSwitch />
		<Ticket href="#/book" stub={t("ticketNumber")} tone="ink" small className={home ? "home-ticket" : "inner-ticket"}>{t(home ? "homeBookMeeting" : "bookMeeting")}</Ticket>
	</div></header>;
}
