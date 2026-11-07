import { useSyncExternalStore } from "react";
import { Chapters } from "./chapters";

type Connection = EventTarget & { readonly saveData?: boolean };
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
function subscribe(onChange: () => void) {
	const network = connection();
	network?.addEventListener("change", onChange);
	return () => network?.removeEventListener("change", onChange);
}

export function useSaveData() {
	return useSyncExternalStore(subscribe, () => connection()?.saveData === true, () => true);
}

export function StoryFallback() {
	return <Chapters staticStory />;
}
