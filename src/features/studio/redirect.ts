export const studioRedirectKey = "demo2-studio-redirect";
export function clearStudioRedirect() {
	try { window.sessionStorage.removeItem(studioRedirectKey); } catch { /* Storage may become unavailable after OAuth starts. */ }
}
