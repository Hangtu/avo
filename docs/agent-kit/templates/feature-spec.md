# Spec: <Feature name>

- **Status:** Draft | Approved | In progress | Implemented
- **Scope / owner:** <task or feature; link issue/design>
- **Project contract:** <actual path>

Use only sections relevant to the change. Small/static tasks can use a short conversational plan with acceptance criteria instead. This template is not a mandate to add a database, API, translations, analytics, or fourteen files.

## Objective and scope

Problem, users, success, in/out of scope. Name the affected capability and any requested activation.

## Acceptance criteria

Testable statements: given <state>, when <action>, then <result>. Include relevant edge/failure/permission cases.

## Implementation plan

Actual paths and existing patterns to reuse. Choose the smallest responsibilities and vertical slices. Record approved changes to dependencies, configuration, or security policy.

## UI and accessibility — if UI

Routes, interaction/content states, reused/new components, keyboard/focus/labels/contrast, responsive behavior. With i18n, list namespaces/locales; otherwise state the copy strategy.

## Data and access — if data is involved

Read/write interfaces, explicit public/private policy, authorization, minimal DTOs, schemas/migrations, relevant indexes/limits. Include isolation tests. Cache scope/tags/invalidation only when caching is needed.

## Public discoverability — if indexable content

Metadata, canonical, sitemap, appropriate structured data, internal links. Locale alternates only when applicable. Private route indexing policy instead of artificial SEO work.

## Integrations and privacy — if applicable

Consumers, contracts, signatures/credentials, idempotency, abuse cases, rate limits, collected data/retention. Analytics events only if approved.

## Verification and rollout

Tests by behavior/boundary, full commands, manual review, baseline failures, rollback/deployment considerations. State what evidence will prove completion.

## Decisions, open questions, and current state

Consequential trade-offs/ADR links, unanswered decisions, blockers, completed/remaining slices, next step. Preserve this state for another agent without duplicating the code.
