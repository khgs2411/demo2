import { lazy } from "react";

// Keep three and its addons behind this boundary; the story owns Suspense/fallback.
export const ShowcaseScene = lazy(() => import("./scene"));
export type { SceneProps } from "./scene";
