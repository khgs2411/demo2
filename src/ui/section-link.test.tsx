import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SectionLink } from "./section-link";

afterEach(cleanup);

it("scrolls to the section without changing the route on a primary click", () => {
	const scrollIntoView = vi.fn();
	const section = document.createElement("section");
	section.id = "get";
	section.scrollIntoView = scrollIntoView;
	document.body.append(section);
	window.history.replaceState(null, "", "#/");
	render(<SectionLink targetId="get">What you get</SectionLink>);
	fireEvent.click(screen.getByRole("link", { name: "What you get" }));
	expect(scrollIntoView).toHaveBeenCalledOnce();
	expect(window.location.hash).toBe("#/");
	section.remove();
});
