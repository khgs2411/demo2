# Studio verification — 2026-11-15

Implemented against `docs/design/2026-11-07-demo2-showcase/spec-studio.md`
and its shared README in the parent ClassKit documentation repository.

## Local evidence

- TDD red/green cycles at the approved seams: public adapter functions,
  page transition function, `parseHash`, rendered page and unlisted routes.
- `bun run test`: 39 files, 791 tests passed. SDK calls are mocked; automated
  tests make no real registrations or decisions.
- `bun run build`: TypeScript and Vite passed. Vite reports chunks above its
  default 500 kB warning threshold; no bundle-splitting work was added.
- Review mutation: reversing the future-slot comparison fails the adapter
  ordering/filtering test; the original comparison was restored.
- Read and mutation failures, optional rejection reason, duplicate submits,
  session changes, successful-decision refetch failures, password auth,
  sign-out errors and one-time Google return are covered.
- Liad's four pending template-ID files were preserved and excluded from commits.

## Browser evidence and remaining acceptance

Native Chrome at `http://localhost:5174/#/studio` showed the Hebrew
non-manager notice with sign out, using the existing remote-product session.
The remote product-context request returned 200. No registration was changed.

Browser verification is incomplete: the in-app browser reported
`The browser access host is unavailable`; native Chrome control subsequently
failed with `noWindowsAvailable` during viewport setup. A mobile emulator view
was magnified/cropped; the requested viewport and scale could not be established,
so this is not responsive-layout proof. No clean-console claim is made.

Still unverified:

- Real manager sign-in, pending request from `#/book`, approval moving it to
  upcoming, and the visitor's `#/account` showing approved.
- Actual Google round trip and signed-out browser flow.
- Hebrew and English visual/flow checks at 375px and 1440px, horizontal overflow,
  keyboard flow and console inspection.

The manager flow requires Liad's manager sign-in. The existing browser session
was left signed in; no credentials were entered or session storage inspected.

## Implementation details

The pinned SDK summary has customer contact fields and optional class/user
projections, but no profile metadata. Business name, website and package interest
are therefore omitted, as specified, without additional customer reads.
Booking exposes AccountStep and redirect cleanup through its public entry.
AccountStep's new sign-in-only and copy props leave its existing defaults intact.
