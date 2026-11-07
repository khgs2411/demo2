import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Ticket } from "./ticket";
import { TextLink } from "./text-link";
import { Kicker } from "./kicker";
import { LogLine } from "./log-line";
import { LedgerRow } from "./ledger-row";
import { Input } from "./input";

afterEach(() => cleanup());

it.each(["rtl", "ltr"])("renders the primitives with native semantics in %s", (dir) => {
	const onClick = vi.fn();
	render(<div dir={dir}>
		<Ticket stub="№ 01" onClick={onClick}>Book</Ticket>
		<Ticket stub="№ 02" href="#/book/system">System</Ticket>
		<TextLink href="#/demo">Demo</TextLink>
		<Kicker>TOPSIDE</Kicker><LogLine>agent ▸ idle</LogLine>
		<LedgerRow name="Meeting" price="Request" details="Details"><TextLink href="#/book">Book</TextLink></LedgerRow>
		<Input label="Email" type="email" required />
	</div>);
	fireEvent.click(screen.getByRole("button", { name: "Book" }));
	expect(onClick).toHaveBeenCalledOnce();
	expect(screen.getByRole("link", { name: "System" }).getAttribute("href")).toBe("#/book/system");
	expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
	expect(screen.getByRole("status").textContent).toBe("agent ▸ idle");
});

it("uses logical layout properties rather than physical left/right classes in primitives", () => {
	const directory = join(process.cwd(), "src/ui");
	for (const file of readdirSync(directory).filter((file) => file.endsWith(".tsx") && !file.includes(".test."))) {
		expect(readFileSync(join(directory, file), "utf8")).not.toMatch(/(?:left|right)-|(?:margin|padding|border|inset)-(?:left|right)\s*:/);
	}
});
