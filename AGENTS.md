<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:repomind-delivery-rules -->
# RepoMind Delivery Workflow

## Phase-Based Delivery

- Build UI changes and new features phase by phase.
- Before starting any phase, create a written implementation plan with:
  - Goal and user value.
  - Scope and out-of-scope items.
  - Recommended approach.
  - Good points, risks, and tradeoffs.
  - Files or modules likely to change.
  - Test plan and expected result.
- Ask the user to approve the plan or request changes before implementing the phase.
- Do not combine unrelated pages or large features into one phase unless the user approves it.

## Branch And PR Workflow

- Create a separate branch for each approved phase or page-level feature.
- Branch names must follow these formats:
  - Feature branches: `feature/<short-description>`
  - Bug-fix branches: `bugfix/<short-description>`
  - UI-fix branches: `ui-fix/<short-description>`
- Write `<short-description>` in lowercase kebab-case, for example:
  - `feature/add-file-viewer-citations`
  - `bugfix/fix-chat-stream-timeout`
  - `ui-fix/improve-repo-dashboard-empty-state`
- After implementation, create a pull request for the phase.
- Do not merge the pull request. The user will review and merge it.

## Architecture Rules

- Follow the current RepoMind architecture and established project patterns.
- Do not rewrite major architecture unless the user explicitly approves that plan.
- Prefer existing App Router route handlers, Prisma services, feature components, and UI components.
- Keep changes scoped to the approved phase.
- Do not remove existing functionality unless the approved plan explicitly says to remove it.
- Read relevant Next.js 16 local docs under `node_modules/next/dist/docs/` before changing Next.js routing, caching, auth/session, server actions, route handlers, or runtime behavior.

## Tools And Integrations

- If a new library, external service, plugin, browser research task, or integration is needed, ask the user before adding or using it.
- Chrome can be used for research when the user approves or asks for current external research.
- Prefer project-local evidence and official documentation for technical decisions.

## Verification

- Test every completed phase before reporting it as done.
- At minimum, run the most relevant checks for the changed area.
- For broad UI or application changes, prefer `npm run lint` and `npm run build` when feasible.
- Report exactly what was tested, what passed, and anything that could not be tested.
- Include important risks or follow-up recommendations after each phase.
<!-- END:repomind-delivery-rules -->
