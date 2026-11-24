import { useTranslation } from "react-i18next";
import { Ticket, type TicketTone } from "../../ui/ticket";

export function RetryTicket({ onClick, className, tone }: { onClick: () => void; className?: string; tone?: TicketTone }) {
	const { t } = useTranslation("booking");
	return <Ticket stub="↻" className={className} tone={tone} onClick={onClick}>{t("retry")}</Ticket>;
}
