import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { parseHash } from "../../app/router";
import { PackagesPage } from "./page";

afterEach(() => cleanup());

it.each(["he", "en"])("renders the ledger and passes the selected base package to booking in %s", async (language) => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	for (const id of ["site", "system"]) {
		const name = i18n.t(`offers.${id}.name`, { ns: "packages" });
		fireEvent.click(screen.getByRole("button", { name: i18n.t("bookPackage", { ns: "packages", name }) }));
		expect(window.location.hash).toBe(`#/book/${id}`);
		expect(parseHash(window.location.hash)).toEqual({ page: "booking", packageId: id });
	}
	expect(screen.getByText("₪1,000")).toBeTruthy();
	expect(screen.getByText("₪150")).toBeTruthy();
	expect(screen.getByText(i18n.t("recommended", { ns: "packages" }))).toBeTruthy();
});
