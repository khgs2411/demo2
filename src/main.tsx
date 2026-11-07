import { createRoot } from "react-dom/client";
import { ProductProvider } from "./lib/product-provider";
import { App } from "./app/app";
import { classKitClient } from "./lib/class-kit";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<ProductProvider client={classKitClient}>
		<App />
	</ProductProvider>,
);
