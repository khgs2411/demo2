import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { getBookingOptions, getHeadlineOffers, serviceLines } from "../packages";
import type { AddonId, BookingSelection } from "./machine";

export const addonCopy: Record<AddonId, string> = { "agent-whatsapp": "aWa", "agent-social": "aSocial", "agent-voice": "aVoice" };

export function PackageStep({ selection, onChange, onContinue }: {
	selection: BookingSelection; onChange: (selection: BookingSelection) => void; onContinue: () => void;
}) {
	const { t } = useTranslation(["booking", "packages"]);
	const { addons } = getBookingOptions();
	return <>
		<h1 tabIndex={-1}>{t("pTitle")}</h1><p className="lede">{t("pLede")}</p>
		<div role="radiogroup" aria-label={t("sPackage")}>
			{serviceLines.map(line => <section className="booking-package-line" key={line} aria-labelledby={`booking-line-${line}`}>
				<h2 id={`booking-line-${line}`}>{t(`packages:lines.${line}.name`)}</h2>
				<div className="ledger">{getHeadlineOffers(line).map(entry => <label className="row" key={entry.id}>
					<input type="radio" name="package" value={entry.id} checked={selection.packageId === entry.id} onChange={() => onChange({ ...selection, packageId: entry.id, slotId: null })} />
					<span><b>{t("packages:packageName", { name: t(`packages:offers.${entry.id}.name`) })}</b><small>{t(`packages:offers.${entry.id}.summary`)}</small></span>
					<span className="price">
						{entry.recommended && <><span className="rec">{t("packages:recommended")}</span><br /></>}
						<bdi>{t(`packages:${entry.priceKey}`)}</bdi><br />{t(`packages:lines.${line}.period`)}
					</span>
				</label>)}</div>
			</section>)}
		</div>
		<fieldset className="addons"><legend className="mono">{t("addonsLabel")}</legend>
			{addons.map(entry => <label className="check" key={entry.id}>
				<input type="checkbox" checked={selection.addonInterests.includes(entry.id)} onChange={event => onChange({ ...selection,
					addonInterests: event.target.checked ? [...selection.addonInterests, entry.id] : selection.addonInterests.filter(id => id !== entry.id),
				})} /><span>{t(addonCopy[entry.id])}</span>
			</label>)}
		</fieldset>
		<div className="actions"><Ticket stub="01" onClick={onContinue}>{t("next")}</Ticket></div>
	</>;
}
