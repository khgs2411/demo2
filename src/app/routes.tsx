import { ShowcasePage } from "../features/showcase/page";
import { PackagesPage } from "../features/packages/page";
import { AdminSimPage } from "../features/admin-sim/page";
import { BookingPage } from "../features/booking/page";
import { AccountPage } from "../features/booking/account-page";
import { useRoute } from "./router";

export function Routes() {
	const route = useRoute();
	switch (route?.page) {
		case "showcase": return <ShowcasePage />;
		case "packages": return <PackagesPage />;
		case "admin-sim": return <AdminSimPage />;
		case "booking": return <BookingPage />;
		case "account": return <AccountPage />;
		default: return null;
	}
}
