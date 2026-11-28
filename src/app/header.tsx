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
	const route = useRoute();
	const home = route?.page === "showcase";
	return <header className={home ? "topline home-topline" : "topline"}><div className="chrome-wrap">
		<a className="mark" href="#/"><b aria-hidden="true">{t("brandMark")}</b><span>{t("brand")}</span></a>
		<nav className="links" aria-label={t("navigation")}>
			{home && <SectionLink targetId="get">{t("whatYouGet")}</SectionLink>}
			<TextLink href="#/">{t("howItWorks")}</TextLink>
			<TextLink href="#/demo" aria-current={route?.page === "admin-sim" ? "page" : undefined}>{t("liveDemo")}</TextLink>
			<TextLink href="#/packages" aria-current={route?.page === "packages" ? "page" : undefined}>{t("packages")}</TextLink>
		</nav>
		<div className="account-tools">
			{studioAccess !== "loading" && <TextLink className="account-link" href={studioAccess === "manager" ? "#/studio" : "#/account"}>
				{studioAccess === "signed_out" ? t("signIn") : t("myAccount")}
			</TextLink>}
			<LanguageSwitch />
		</div>
		{route?.page !== "booking" && <Ticket href="#/book" stub={t("ticketNumber")} tone="ink" small className={home ? "home-ticket" : "inner-ticket"}>{t(home ? "homeBookMeeting" : "bookMeeting")}</Ticket>}
	</div></header>;
}
