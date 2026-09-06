import { createRoot } from "react-dom/client";
import { ProductProvider } from "@class-kit/react";
import { App } from "./App";
import { classKitClient } from "./class-kit-client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<ProductProvider client={classKitClient}>
		<App />
	</ProductProvider>,
);
