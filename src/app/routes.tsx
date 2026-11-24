import { useEffect } from "react";
import { StudioPage } from "../features/studio/page";
import { StudioReturn } from "../features/studio/studio-return";
import { ShowcasePage } from "../features/showcase/page";
import { PackagesPage } from "../features/packages/page";
import { AdminSimPage } from "../features/admin-sim/page";
import { BookingPage } from "../features/booking/page";
import { AccountPage } from "../features/booking/account-page";
import { BookingReturn } from "../features/booking/booking-return";
import { ForgotPasswordPage } from "../features/booking/password-reset/forgot-page";
import { ResetPasswordPage } from "../features/booking/password-reset/reset-page";
import { useProductContext } from "../lib/product-provider";
import { getStudioAccess } from "../lib/studio-access";
import { useRoute } from "./router";

export function Routes() {
	return <><StudioReturn /><BookingReturn /><RoutePage /></>;
}

function RoutePage() {
	const route = useRoute();
	switch (route?.page) {
		case "showcase": return <ShowcasePage />;
		case "packages": return <PackagesPage />;
		case "admin-sim": return <AdminSimPage />;
		case "booking": return <BookingPage key={route.packageId ?? "book"} packageId={route.packageId} />;
		case "studio": return <StudioPage />;
		case "account": return <AccountRoute />;
		case "forgot-password": return <ForgotPasswordPage />;
		case "reset-password": return <ResetPasswordPage />;
		default: return null;
	}
}

function AccountRoute() {
	const access = getStudioAccess(useProductContext());
	useEffect(() => {
		if (access !== "manager" || window.location.hash !== "#/account") return;
		window.history.replaceState(window.history.state, "", "#/studio");
		// replaceState doesn't notify the hash router.
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	}, [access]);
	return access === "manager" ? null : <AccountPage />;
}
