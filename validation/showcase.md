# Showcase scene validation and integration

The scene ports the approved `mockups/shell.html` from the
`class-kit/docs/design/2026-11-07-demo2-showcase` design. It uses the same
three.js release, 0.164.1. The home route assembles the 360vh story, its anchored chapters, reduced-motion/
save-data/error fallback, and the catalog-backed offers ledger. The shell
continues to own the header, mobile ticket dock and footer.

## Integration contract

Import `ShowcaseScene` from `features/showcase/scene` inside a React
`Suspense` boundary. This entry imports no three.js code until rendered.

- `storyRef` points to the scrolling story element. The component reads its
  top and its height minus the viewport height, as in the mockup. The canvas
  fills its positioned stage parent.
- `onFrame(p, frame)` receives damped progress and the pure timeline result.
  Use `frame.night` for `--n`, `frame.chapterOpacities` for the chapter
  disjoint chapter fades, and `frame.log` for the machine log. The callback does not need
  to update React state on every frame; it can update the existing elements.
- The renderer already applies the damped camera view offset for the leading
  chapter, including mirrored desktop start/end anchors and the mobile top
  fallback. Its progress-based lead switches at the gap midpoints: 0.115,
  0.365, 0.535 and 0.80. The page should not add another world offset.
- The first visible mount paints immediately at the current scroll progress,
  before the initial `IntersectionObserver` notification. Subsequent frames
  follow viewport intersection and document visibility. The camera starts at
  that progress's framing target; later anchor changes glide normally.
- The scene uses `NoToneMapping` and writes its background hex to root
  `--bg` every frame so the canvas, halos and header share the same colour.
  The story clears this inline colour on fallback and unmount, restoring the
  static CSS `color-mix` background.
- The page owns static fallback selection. Skip mounting the scene when
  reduced motion or save-data requires posters. `onError(error)` reports
  initialization failure or context loss so the page can switch to fallback.
- Unmounting cancels animation and observers/listeners and disposes scene,
  label, shadow and postprocessing resources. Language changes rebuild labels
  after the corresponding glyphs load. Explicit glyph strings select the
  Hebrew font subset per the [CSS Font Loading specification](https://www.w3.org/TR/css-font-loading-3/#font-face-set-load).

## Local checks

```sh
bun run test
bun run build
bun scripts/check-showcase.ts /absolute/path/to/approved/mockups/shell.html --build
```

The last command builds the ordinary app and the isolated validation entry
into `/tmp/demo2-showcase-validation-build`. Its manifest distinguishes static
imports from dynamic imports. The ordinary app now exercises the lazy scene import through the home story.
The command writes the import-graph check to `artifacts/showcase/build.json`.
The `artifacts/showcase/` folder is ignored generated output and is not committed.

## Desktop top-anchor clearance

The live-home overlap correction uses a desktop top-anchor view offset of
`[0, -0.28]` and camera distance `20`, instead of `-0.15` and `17`. Distance
glides with the existing view-offset damping. Other anchors retain distance
`17`; mobile targets are unchanged. This is an authorized adjustment from the
mockup's top-anchor framing to clear the chapter 0 actions and chapter 4.

The selected framing was checked by projecting the actual topside geometry
at rest, with t = 0 and neutral pointer, using the scene's camera. Canvas
widths 1265 and 1425 account for the reported 15px desktop scrollbar. The
installed font metrics give two lines for the English front paragraph and
one for Hebrew; the two-line paragraph is the conservative case below.

| Viewport | Chapter 0 actions end, from CSS | Projected world top at p = 0 | Projected world top at p = 1 |
| --- | --- | --- | --- |
| 1280×800 | 420px | 436.9px | 469.5px |
| 1440×900 | 435.2px | 491.5px | 528.2px |

Chapter 4 is shorter than chapter 0. These are geometry/font calculations,
not browser layout measurements. Browser tools still report an unavailable
host and native Chrome returns `cgWindowNotFound`, so fresh-load rendering
and the live visual clearance at both sizes still need browser confirmation.

## Browser checks and screenshots

```sh
bun scripts/check-showcase.ts /absolute/path/to/approved/mockups/shell.html
```

Open the localhost URL printed by Vite with `/showcase-scene.html`. Mount
the scene, scrub the progress buttons or scroll, and switch languages.
Scroll the stage out of view to check it stops rendering. Unmount after a
rendered frame to record the browser's actual `renderer.info.memory` and
program counts before and after cleanup in `artifacts/showcase/unmount.json`.
The inspection hook is injected only by this local server.

Open `/showcase-scene.html?mode=compare` and choose **Capture all comparisons**
to capture the canvas at p = 0, 0.25, 0.5, 0.65 and 1 in viewports 1440×900
and 375×812. Each capture is normalized to CSS-pixel resolution. Files named
`<width>x<height>-p<progress>-mockup.png` and `...-scene.png` are saved under
`artifacts/showcase`, along with console/resource results in `captures.json`.
These are scene-only captures; task 11 owns the chapter overlays.

For reproducibility, both sides use t = 0, the same spark random seed and
enough frames for the sign and camera damping to settle within half a CSS
pixel. The reference file itself is read only. The fixture changes its clock,
progress, spark seed and import/font locations; its geometry, palette,
timeline and camera formulas remain unchanged.

## Fallback poster export

Run the local server above, open `/showcase-scene.html?mode=posters` and choose
**Export fallback posters**. This renders the accepted scene at p = 0 and 0.5,
at 1440×900, and saves real WebP exports directly to:

- `public/poster-topside.webp`
- `public/poster-underside.webp`

The scene and export use the same renderer, palette, camera offsets and
settling logic as the accepted validation page. No substitute artwork is
used. Inspect and commit the exported files; `bun run build` does not generate
them. Asset URLs use `BASE_URL` for GitHub Pages subpaths.

## Live home route checks

Open `/#/` rather than the isolated scene fixture. In device emulation, check
1440×900 and 375×812 at p = 0, 0.25, 0.5, 0.65 and 1. To position the actual
scrolling home page from the browser console:

```js
function showProgress(p) {
  const story = document.querySelector(".showcase-story");
  scrollTo(0, scrollY + story.getBoundingClientRect().top + p * (story.offsetHeight - innerHeight));
}
showProgress(0.25);
```

Allow the scene to settle before each screenshot. The current damped value
is the story element's `--p` style. Also check the chapter anchors and absence
of overlap/horizontal scrolling at 1280×800 and 2000px wide, both languages,
all ticket actions, and the stacked fallback with reduced motion or save-data
on. Check that changing routes clears the story's night color.

Liad verified the live home story end to end and requested the timing and
colour corrections recorded in `spec-showcase.md`. The renderer and timeline
now port those corrections. Local tests cover disjoint chapter windows,
midpoint camera lead, tone-mapping configuration, background hex values and
cleanup, along with fallback selection and catalog-backed booking targets.
These tests do not constitute a browser visual check of the corrected scene.
Liad added `public/poster-*.webp` in commit `149a5ec`; those assets are left
unchanged by the first-paint and framing corrections.
