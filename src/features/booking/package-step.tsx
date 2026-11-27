import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { getBookingOptions, getHeadlineOffers, PackageBenefits, PackagePrice, serviceLines } from "../packages";
import type { BookingSelection } from "./machine";

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
				<div className="ledger">{getHeadlineOffers(line).map(entry => <div className="row" key={entry.id}>
					<label className="package-choice">
						<input type="radio" name="package" value={entry.id} checked={selection.packageId === entry.id} onChange={() => onChange({ ...selection, packageId: entry.id, slotId: null })} />
						<span>
							<b>{t("packages:packageName", { name: t(`packages:offers.${entry.id}.name`) })}</b>
							{entry.recommended && <span className="rec">{t("packages:recommended")}</span>}
							{entry.mark && <span className="rec">{t(`packages:${entry.mark}`)}</span>}
							<PackagePrice offer={entry} />
						</span>
					</label>
					<PackageBenefits offer={entry} />
				</div>)}</div>
			</section>)}
		</div>
		<fieldset className="addons"><legend className="mono">{t("addonsLabel")}</legend>
			<p>{t("packages:addons.price")}</p>
			{addons.map(entry => <label className="check" key={entry.id}>
				<input type="checkbox" checked={selection.addonInterests.includes(entry.id)} onChange={event => onChange({ ...selection,
					addonInterests: event.target.checked ? [...selection.addonInterests, entry.id] : selection.addonInterests.filter(id => id !== entry.id),
				})} /><span>{t(`packages:offers.${entry.id}.name`)}</span>
			</label>)}
		</fieldset>
		<div className="actions"><Ticket stub="01" onClick={onContinue}>{t("next")}</Ticket></div>
	</>;
}
