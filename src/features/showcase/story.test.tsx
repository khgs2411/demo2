import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import type { SceneProps } from "./scene";
import { timeline } from "./scene/timeline";
import { Story } from "./story";

const scene = vi.hoisted(() => ({ fail: false, props: undefined as SceneProps | undefined }));
vi.mock("./scene", async () => {
	const { useEffect } = await import("react");
	return { ShowcaseScene: (props: SceneProps) => {
		scene.props = props;
		useEffect(() => { if (scene.fail) props.onError?.(new Error("WebGL unavailable")); }, [props.onError]);
		return <canvas data-testid="scene" />;
	} };
});

beforeEach(async () => {
	await i18n.changeLanguage("he"); scene.fail = false; scene.props = undefined;
	vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
	vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, "connection"); });

it.each(["reduced motion", "save data", "WebGL failure"])("stacks all chapters with posters and no canvas for %s", async reason => {
	if (reason === "reduced motion") vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	if (reason === "save data") Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) });
	if (reason === "WebGL failure") scene.fail = true;
	const { container } = render(<Story />);
	await act(async () => {});
	expect(container.querySelector("canvas")).toBeNull();
	expect(container.querySelectorAll(".showcase-static .chapter")).toHaveLength(5);
	expect(screen.getAllByRole("img")).toHaveLength(5);
	expect(new Set(screen.getAllByRole("img").map(image => image.getAttribute("src")))).toEqual(new Set([
		`${import.meta.env.BASE_URL}poster-topside.webp`, `${import.meta.env.BASE_URL}poster-underside.webp`,
	]));
	expect(screen.getAllByRole("heading")).toHaveLength(5);
});

it("uses the approved anchors, continuous opacities, log and inert inactive chapters", () => {
	const { container, unmount } = render(<Story />);
	const chapters = [...container.querySelectorAll<HTMLElement>(".chapter")];
	expect(chapters.map(chapter => chapter.dataset.at)).toEqual(["top", "start", "end", "bottom", "top"]);
	act(() => scene.props!.onFrame!(.5, timeline(.5, 0)));
	// CSSOM serializes opacity with six decimal places in this environment.
	chapters.forEach((chapter, index) => expect(Number(chapter.style.opacity)).toBeCloseTo(timeline(.5, 0).chapterOpacities[index], 6));
	expect(chapters[0].hasAttribute("inert")).toBe(true);
	expect(chapters[0].getAttribute("aria-hidden")).toBe("true");
	expect(document.documentElement.style.getPropertyValue("--n")).toBe("1");
	expect(container.querySelector(".showcase-log")!.textContent).toBe("agent ▸ fixing: sign mount");
	unmount();
	expect(document.documentElement.style.getPropertyValue("--n")).toBe("0");
});

it("routes the first and final chapter tickets through openBooking and links to the demo", () => {
	const { container } = render(<Story />);
	expect(screen.getByRole("link", { name: "לראות את זה עובד" }).getAttribute("href")).toBe("#/demo");
	for (const button of container.querySelectorAll<HTMLButtonElement>(".chapter .ticket")) {
		window.history.replaceState(null, "", "#/");
		fireEvent.click(button); expect(location.hash).toBe("#/book");
	}
});
