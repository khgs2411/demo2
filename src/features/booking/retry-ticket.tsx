import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";

export function RetryTicket({ onClick, className }: { onClick: () => void; className?: string }) {
	const { t } = useTranslation("booking");
	return <Ticket stub="↻" className={className} onClick={onClick}>{t("retry")}</Ticket>;
}
