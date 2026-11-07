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
  crossfades, and `frame.log` for the machine log. The callback does not need
  to update React state on every frame; it can update the existing elements.
- The renderer already applies the damped camera view offset for the leading
  chapter, including mirrored desktop start/end anchors and the mobile top
  fallback. The page should not add another world offset.
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

Tasks 9–10 were accepted after Liad's browser comparison at p = 0, 0.5, 0.65
and 1 and a clean canvas removal on unmount. For task 11, browser automation
still reports an unavailable host and native Chrome returns
`cgWindowNotFound`. No live-home screenshots were captured, and the two poster
assets have not been exported yet. Component tests cover fallback selection,
chapter anchors and opacity, lead-chapter accessibility, color cleanup, and
catalog-backed prices and booking targets; they do not prove visual layout or
asset availability.
