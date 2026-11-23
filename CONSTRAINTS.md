# Constraints

The definition of done for `demo2`: the bar a change clears before hand-back. Every check runs locally; there is no CI yet.

Last reviewed: 2026-11-23 by Liad.

## Floor (always enforced)

- `npx vitest run` passes.
- `npm run build` passes. The existing warning that a chunk is larger than 500 kB is allowed; a build error is not.
- No new suppression comments: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `eslint-disable`, `v8 ignore`, `istanbul ignore`, `gitleaks:allow`.
- No unimplemented stubs: `throw new Error("Not implemented")`, an empty `catch {}`, a `TODO` standing in for behaviour.
- No skipped or deleted tests (`.skip`, `.only`, `.todo`, `it.skipIf`, `it.runIf`, a removed test file or assertion) unless a commit in the change carries the trailer `Test-Skip-Reason: <path>: <reason>` for that file.
- No secrets in tracked source.
- This file is never weakened to make a change pass. Loosening a row is its own reviewed change.

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at | Mode |
| --- | --- | --- | --- | --- |
| Tests | All pass | `npx vitest run` | task end | block |
| Build | Passes | `npm run build` | task end | block |
| Floor | No floor move in the diff | `npm run check:floor` | task end | block |
| Secrets | No finding in tracked history | `gitleaks git . --redact --no-banner` | task end | block |

Reasons:

- **Floor only**, matching the SDK: Liad's choice for demo2.
- **Gitleaks scans git, not the folder**, because the ignored `.env` holds local keys that never leave the machine.
- **Gitleaks** is the external check: no rule in it was written by this project.

## Time budget

`npm run check` runs every row above and finishes in about 1 minute. Today the tests take about 3 seconds and the build about 2.

## Measured, not yet enforced

None yet.

## Exceptions

None.
