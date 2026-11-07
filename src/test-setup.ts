// jsdom does not implement matchMedia; browser-rendered routes use the shared motion hook.
if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: (media: string) => ({
		media, matches: false, addEventListener() {}, removeEventListener() {},
	}) });
}
