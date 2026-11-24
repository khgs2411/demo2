import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Ticket } from "./ticket";
import { TextLink } from "./text-link";
import { Kicker } from "./kicker";
import { LogLine } from "./log-line";
import { LedgerRow } from "./ledger-row";
import { Input } from "./input";
import { Pass } from "./pass";

afterEach(() => cleanup());

it.each(["rtl", "ltr"])("renders the primitives with native semantics in %s", (dir) => {
	const onClick = vi.fn();
	render(<div dir={dir}>
		<Ticket stub="№ 01" onClick={onClick}>Book</Ticket>
		<Ticket stub="№ 02" href="#/book/system">System</Ticket>
		<TextLink href="#/demo">Demo</TextLink>
		<Kicker>ClassKit</Kicker><LogLine>agent ▸ idle</LogLine>
		<LedgerRow name="Meeting" price="Request" details="Details"><TextLink href="#/book">Book</TextLink></LedgerRow>
		<Input label="Email" type="email" required />
	</div>);
	fireEvent.click(screen.getByRole("button", { name: "Book" }));
	expect(onClick).toHaveBeenCalledOnce();
	expect(screen.getByRole("link", { name: "System" }).getAttribute("href")).toBe("#/book/system");
	expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
	expect(screen.getByRole("status").textContent).toBe("agent ▸ idle");
});

it("uses the coral ticket style by default and provides ink and ghost classes", () => {
	render(<>
		<Ticket stub="01">Default</Ticket>
		<Ticket stub="02" tone="coral">Primary</Ticket>
		<Ticket stub="03" tone="ink">Commit</Ticket>
		<Ticket stub="04" tone="ghost" small href="#/account">Undo</Ticket>
	</>);

	expect([...screen.getByRole("button", { name: "Default" }).classList]).toEqual(["ticket"]);
	expect([...screen.getByRole("button", { name: "Primary" }).classList]).toEqual(["ticket"]);
	expect([...screen.getByRole("button", { name: "Commit" }).classList]).toEqual(["ticket", "ticket-ink"]);
	expect([...screen.getByRole("link", { name: "Undo" }).classList]).toEqual(["ticket", "ticket-small", "ticket-ghost"]);
});

it.each([
	{ lang: "en", dir: "ltr", kicker: "Account", status: "Ready", stamp: "Saved", labels: ["Email", "Password", "Sign in", "Terms"], values: ["Confirmed", "Choose", "Continue", "Review"] },
	{ lang: "he", dir: "rtl", kicker: "חשבון", status: "מוכן", stamp: "נשמר", labels: ["דוא״ל", "סיסמה", "כניסה", "תנאים"], values: ["אושר", "בחירה", "המשך", "עיון"] },
])("renders the pass in $lang with row states, an isolated number, and an optional stamp", ({ lang, dir, kicker, status, stamp, labels, values }) => {
	const states = ["done", "now", "next", undefined] as const;
	const rows = states.map((state, index) => ({ label: labels[index], value: values[index], state }));
	const renderPass = (stamp?: ReactNode) => <div lang={lang} dir={dir}>
		<Pass kicker={kicker} code="AC-03" rows={rows} status={status} num="02/03" stamp={stamp} />
	</div>;
	const { rerender } = render(renderPass(stamp));

	expect(screen.getByText(kicker)).toBeTruthy();
	expect(screen.getByText("AC-03")).toBeTruthy();
	expect(screen.getByText(status)).toBeTruthy();
	expect(screen.getByText("02/03").matches("bdi[dir=ltr]")).toBe(true);
	for (const [index, state] of states.entries()) {
		const row = screen.getByText(labels[index]).parentElement;
		expect(row?.className).toBe(state ?? "");
		expect(screen.getByText(values[index]).parentElement).toBe(row);
	}
	expect(screen.getByText(stamp).matches(".pass-stamp[aria-hidden=true]")).toBe(true);

	rerender(renderPass());
	expect(screen.queryByText(stamp)).toBeNull();

	rerender(renderPass(0));
	expect(screen.getByText("0").matches(".pass-stamp[aria-hidden=true]")).toBe(true);
});

it("uses logical layout properties rather than physical left/right classes in primitives", () => {
	const directory = join(process.cwd(), "src/ui");
	for (const file of readdirSync(directory).filter((file) => file.endsWith(".tsx") && !file.includes(".test."))) {
		expect(readFileSync(join(directory, file), "utf8")).not.toMatch(/(?:left|right)-|(?:margin|padding|border|inset)-(?:left|right)\s*:/);
	}
});
