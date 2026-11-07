import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AgentPanel } from "./agent-panel";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { i18n } from "../../i18n";
import type { SimState } from "./machine";

afterEach(cleanup);

it.each([
	[{ step: "ticket_submitted", ticketId: scenario.ticket.id }, "Open"],
	[{ step: "agent_fixing", ticketId: scenario.ticket.id, progress: 0 }, "In progress"],
	[{ step: "live", ticketId: scenario.ticket.id }, "Done"],
] satisfies [SimState, string][])("places the local ticket in its corresponding board lane", async (state, lane) => {
	await i18n.changeLanguage("en");
	render(<AgentPanel scenario={scenario} state={state} reducedMotion={false} />);
	expect(within(screen.getByRole("group", { name: lane })).getByText("Clipped button")).toBeDefined();
	expect(screen.getAllByText("#214")).toHaveLength(1);
});

it("streams the agent's matching diff and reports fix progress", async () => {
	await i18n.changeLanguage("en");
	const props = { scenario, reducedMotion: false };
	const { rerender } = render(<AgentPanel {...props} state={{ step: "agent_fixing", ticketId: scenario.ticket.id, progress: 0 }} />);
	expect(screen.getByRole("log").textContent).toContain("claimed #214");
	expect(screen.queryByText(scenario.diff.lines[1])).toBeNull();
	rerender(<AgentPanel {...props} state={{ step: "agent_fixing", ticketId: scenario.ticket.id, progress: 1 }} />);
	expect(screen.getByText(scenario.diff.lines[0])).toBeDefined();
	expect(screen.getByText(scenario.diff.lines[1])).toBeDefined();
	expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
});
