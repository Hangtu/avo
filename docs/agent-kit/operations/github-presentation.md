# GitHub Repository Presentation

> **Read when:** preparing the public repository page, reviewing its metadata, or publishing a release.
> **Boundary:** this is a maintainer checklist. An agent must not change remote repository settings, upload images, publish releases, or alter security configuration without explicit authorization.

## Recommended About section

**Description** (keep it factual and short):

> Engineering standards for AI-assisted Next.js projects. Inspect first, adopt deliberately, verify changes. MVP; application scenarios are still being validated.

**Website:** use a project-specific page only if it resolves and is maintained. Do not point this field at an unrelated marketing site merely to look complete.

**Topics** (choose the relevant subset; do not add framework topics that are not part of the kit’s scope):

```text
agents-md
ai-agents
nextjs
react
typescript
developer-tools
documentation
template
code-quality
accessibility
seo
web-development
```

## Visual assets

| Setting | Use |
|---|---|
| Social preview | Upload `assets/social-preview.png` (1280 × 640, under 1 MiB) |
| README hero | `assets/cover.svg`, already embedded |
| Repository mark | `assets/mark.svg`, already embedded |

GitHub does not automatically use a README image as the social preview. Upload the PNG manually after reviewing the rendered text at small sizes. Do not replace the original artwork with stock imagery, third-party logos, or an external generator that changes the license.

## Repository features

- **Issues:** enable the forms in `.github/ISSUE_TEMPLATE/`. They separate kit defects, feature proposals, and adoption evidence.
- **Discussions:** optional. Enable only if someone will monitor it; the README does not promise a support SLA.
- **Private vulnerability reporting:** enable it and keep the link in `SECURITY.md` current.
- **Dependabot alerts** and **secret scanning with push protection:** recommended for a public repository. Do not claim they are enabled until confirmed in settings.
- **Actions:** the kit workflow uses the check names `Kit checks (Node 22)` and `Kit checks (Node 26)`. If branch protection is enabled, select the actual names shown in GitHub rather than guessing.
- **License detection:** keep `LICENSE` at the repository root. It uses the standard MIT text with `Copyright (c) 2026 frutit.app`. Do not add a second conflicting license file; GitHub should detect MIT automatically.
- **Releases:** do not create a release or tag merely to make the page look active. Tag after the application scenarios in [kit validation](../quality/kit-validation.md) have recorded evidence.

## README checklist

- [ ] The first screen says what the repository is, who it is for, and what it is not.
- [ ] The three operations link to their actual protocol sections.
- [ ] Badges reflect real, public checks; no fake star, download, or adoption badges.
- [ ] Status is labeled **MVP** until app/adoption/update scenarios are recorded.
- [ ] The cover image has meaningful alt text and does not imply a tested production starter.
- [ ] License and community links resolve.
- [ ] No secrets, private URLs, customer names, or fabricated testimonials appear in screenshots or examples.

## Avoid

- Buying or manufacturing stars, followers, or testimonials.
- Using another project’s logo to imply endorsement.
- Calling the kit “production-ready”, “battle-tested”, or “the perfect starter” without evidence.
- Adding a CI badge for a workflow that does not run.
- Adding a support promise, security SLA, or legal entity that has not been approved.
- Letting an agent rewrite the repository description, topics, or security settings as part of a documentation pull request.

## Local verification before publishing

```bash
node scripts/verify-kit.mjs
git diff --check
```

Then preview the README in GitHub’s rendering, inspect the social preview at small size, and check every community link from a logged-out browser. This local guide cannot verify remote settings.
