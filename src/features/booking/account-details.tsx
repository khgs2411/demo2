import { useEffect, useId, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { accountDetailsTransition, hasRequiredDetails } from "./account-details-machine";
import type { createBookingAdapter } from "./adapter";
import { ContactFields } from "./contact-fields";

export function AccountDetails({ adapter, userId, onSignedOut }: {
	adapter: Pick<ReturnType<typeof createBookingAdapter>, "loadProfile" | "saveAccountDetails">;
	userId: string;
	onSignedOut: () => void;
}) {
	const { t } = useTranslation("booking");
	const headingId = useId();
	const [state, dispatch] = useReducer(accountDetailsTransition, { step: "loading" });
	const mounted = useRef(false);
	const savePending = useRef(false);

	useEffect(() => {
		mounted.current = true;
		let active = true;
		void adapter.loadProfile(userId).then(result => {
			if (active) dispatch(result);
		});
		return () => {
			active = false;
			mounted.current = false;
		};
	}, [adapter, userId]);

	async function save() {
		const event = { type: "save_requested" } as const;
		const next = accountDetailsTransition(state, event);
		if (next === state || next.step !== "saving" || savePending.current) return;
		savePending.current = true;
		dispatch(event);
		try {
			const result = await adapter.saveAccountDetails(next.details);
			if (!mounted.current) return;
			if (result.type === "signed_out") {
				dispatch({ type: "save_failed" });
				onSignedOut();
			} else {
				dispatch(result);
			}
		} finally {
			savePending.current = false;
		}
	}

	const saving = state.step === "saving";
	return <section aria-labelledby={headingId} className="account-details">
		<h2 id={headingId}>{t("accDetailsTitle")}</h2>
		{state.step === "loading" && <p role="status">{t("loading")}</p>}
		{state.step === "failed" && <p role="alert" className="notice error">
			{t(state.operation === "load" ? "accDetailsLoadFailed" : "accDetailsSaveFailed")}
		</p>}
		{"details" in state && <form onSubmit={event => { event.preventDefault(); void save(); }}>
			<fieldset className="fields" disabled={saving}>
				<ContactFields contact={state.details} onChange={(field, value) => dispatch({ type: "field_changed", field, value })} />
			</fieldset>
			<div className="actions">
				<Ticket stub="" className="booking-link" type="submit" disabled={saving || !hasRequiredDetails(state.details)}>
					{t(saving ? "loading" : "accDetailsSave")}
				</Ticket>
				{state.step === "saved" && <p role="status">{t("accDetailsSaved")}</p>}
			</div>
		</form>}
	</section>;
}
