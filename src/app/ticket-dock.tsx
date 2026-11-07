import { useTranslation } from "react-i18next";
import { Ticket } from "../ui/ticket";

export function TicketDock() {
	const { t } = useTranslation("shell");
	return <div className="ticket-dock"><Ticket href="#/book" stub={t("ticketNumber")}>{t("bookMeeting")}</Ticket></div>;
}
