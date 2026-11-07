import { createRoot } from "react-dom/client";
import { ProductProvider } from "./lib/product-provider";
import { Routes } from "./app/routes";
import { classKitClient } from "./lib/class-kit";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<ProductProvider client={classKitClient}>
		<Routes />
	</ProductProvider>,
);
