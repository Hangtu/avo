# Spec: Repository presentation and community essentials

- **Status:** Implemented (local); GitHub settings pending
- **Approval:** the user requested the presentation update and confirmed MIT with copyright holder `frutit.app`.
- **Project contract:** [kit context](../project-context.md)

## Objective

Give the source kit a polished, recognizable open-source presentation without changing its engineering contract, overstating maturity, or adding infrastructure.

## Scope

- Refresh README with clear positioning, navigation, real badges, copyable operation prompts, and honest MVP limitations.
- Create original local SVG artwork and a 1280×640 PNG social preview; no paid image service, stock imagery, external fonts, or new dependencies.
- Add MIT license, contribution/security/conduct guidance, and useful issue forms.
- Keep source-license notices with copied kit material without replacing consumer application licenses.
- Document manual GitHub About/topics/social-preview setup; do not change remote settings.
- Add structural/asset tests and retain all existing operation/provenance checks.

## Acceptance criteria

1. README remains agent-readable and links the independent Doctor/Adopt/Verify protocols; no fictitious CLI, popularity, adoption, or production-readiness claims.
2. Original cover/mark are accessible, self-contained SVGs. Social preview is a valid 1280×640 PNG below 1 MiB and is visually inspected.
3. The unmodified MIT grant/disclaimer includes `Copyright (c) 2026 frutit.app`. No invented legal entity, email, support SLA, or contributor identities.
4. Community guidance distinguishes kit defects from consumer app incidents and protects sensitive reports.
5. Repository presentation files do not get installed automatically into consumer applications; retain the MIT notice with copied kit materials.
6. Kit checks, link checks, operation guards, and whitespace checks pass. No CI/config changes, package installation, Git commits/pushes, or remote settings changes.

## Verification

Run `node scripts/verify-kit.mjs` and `git diff --check`; attempt inherited `pnpm verify` and report missing tooling. Inspect exported artwork and a local README preview, parse new SVG/YAML with available native tools, and record which GitHub-specific settings/rendering remain unverified.

## Implementation evidence

- MIT license added with the confirmed `Copyright (c) 2026 frutit.app` holder; adoption guidance copies the notice to the knowledge root without replacing an application’s license.
- Original `assets/mark.svg`, `assets/cover.svg`, and `assets/social-preview.png` added. The social preview was rendered with local headless Chrome at exactly 1280×640 and visually inspected; it is 333 KiB and below the 1 MiB GitHub limit.
- README was restructured with real badges, copyable Doctor/Adopt/Verify prompts, scope, stack, update guidance, validation status, and community links. No popularity, adoption, or production-readiness claims were added.
- Community files and issue forms were added; issue-form YAML was parsed with the available Ruby YAML parser. GitHub’s issue-form schema/rendering was not exercised remotely.
- Local Node.js v25.8.0: `node scripts/verify-kit.mjs` passes all 56 tests; `git diff --check` passes.
- `pnpm verify` was attempted but pnpm is unavailable. The kit intentionally has no root package manifest; no tool was installed to fake the check.
- No remote repository settings, About description, topics, social preview, branch protection, or security settings were changed. No commit/push was made. GitHub Markdown rendering, badge availability, issue-form acceptance, and logo/social-preview display remain unverified.
