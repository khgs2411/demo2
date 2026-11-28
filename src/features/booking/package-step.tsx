import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { getBookingOptions, getHeadlineOffers, serviceLines } from "../packages";
import type { BookingSelection } from "./machine";

export function PackageStep({ selection, onChange, onContinue, stepStub = "1/3" }: {
	selection: BookingSelection; onChange: (selection: BookingSelection) => void; onContinue: () => void; stepStub?: string;
}) {
	const { t } = useTranslation(["booking", "packages"]);
	const { addons } = getBookingOptions();
	return <>
		<h1 tabIndex={-1}>{t("pTitle")}</h1><p className="lede">{t("pLede")}</p>
		<div role="radiogroup" aria-label={t("sPackage")}>
			{serviceLines.map(line => <section className="booking-package-line" key={line} aria-labelledby={`booking-line-${line}`}>
				<h2 className="line-name" id={`booking-line-${line}`}>{t(`packages:lines.${line}.name`)}<small>{t(`lineTerms.${line}`)}</small></h2>
				{getHeadlineOffers(line).map(entry => {
					const selected = selection.packageId === entry.id;
					const benefits = t(`benefits.${entry.id}`, { returnObjects: true }) as string[];
					return <div className="package-row" key={entry.id}>
						<label>
							<input type="radio" name="package" value={entry.id} checked={selected} onChange={() => onChange({ ...selection, packageId: entry.id, slotId: null })} />
							<span className="nm">{t(`packages:offers.${entry.id}.name`)}
								{entry.recommended && <span className="tag">{t("packages:recommended")}</span>}
								{entry.mark && <span className="tag m">{t(`packages:${entry.mark}`)}</span>}
							</span>
							<span className="pr"><bdi>{t(entry.priceKey, { ns: "packages" })}</bdi><small>{t(`pricePeriod.${line}`)}</small></span>
						</label>
						<div className="benefits" aria-hidden={!selected}><div className="benefits-body"><ul>
							{benefits.map(benefit => <li key={benefit}>{benefit}</li>)}
						</ul></div></div>
					</div>;
				})}
			</section>)}
		</div>
		<fieldset className="booking-addons"><legend>{t("addonsLabel")}</legend>
			<p>{t("packages:addons.price")}</p>
			{addons.map(entry => <label className="check" key={entry.id}>
				<input type="checkbox" checked={selection.addonInterests.includes(entry.id)} onChange={event => onChange({ ...selection,
					addonInterests: event.target.checked ? [...selection.addonInterests, entry.id] : selection.addonInterests.filter(id => id !== entry.id),
				})} /><span>{t(`packages:offers.${entry.id}.name`)}</span>
			</label>)}
		</fieldset>
		<div className="actions"><Ticket stub={stepStub} onClick={onContinue}>{t("next")}</Ticket></div>
	</>;
}
