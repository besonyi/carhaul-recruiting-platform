# Phase 1 implementation plan

Based on Technical Specification V1.0 in the ChatGPT conversation “Идеи сайта для найма CDL водителей”.

- [x] Establish npm workspaces, Next.js, NestJS, Prisma, PostgreSQL and Redis configuration.
- [x] Build the English-language home page, two recruiting landing pages and a published jobs catalog with job details.
- [x] Validate and persist Quick Apply submissions, attribution, versioned consent and audit history.
- [x] Build staff sessions, role authorization, jobs management, candidate profiles and recruitment pipeline.
- [x] Verify a clean dependency install, six automated tests, production builds and live integration checks.

## Verification

- `npm ci` and `npm run build` completed successfully. All six automated tests passed. `npm audit` reported zero vulnerabilities.
- Applied the initial migration to an isolated PostgreSQL database and tested the Nest API with a temporary Redis instance. Verified job visibility and role permissions, concurrent candidate deduplication, consent, stage changes, close reasons, notes, assignments and session revocation.
- In Chrome at 390 px, verified that the home image loaded without horizontal overflow. Submitted an Owner Operator form after correcting a validation error, found the applicant by email in the CRM, verified attribution and signed out.
- Docker Compose was unavailable in the development environment. The runtime checks used isolated local PostgreSQL and Redis binaries.

## Remaining work

- Supply verified carrier identity, fleet photos, recruiting contact details, job terms and approved privacy and consent copy. These inputs are also needed for carrier-specific About, Fleet, Contact and Pay & Benefits content.
- Configure the production controls in README.md before collecting live applicant data.
- Add persistent applicant accounts, document uploads, formal application and compliance workflows, SMS, AI and advanced recruitment analytics in later phases. The platform serves one carrier.

## Next increment · Extended applications

- [x] Add a migration and support one extended submission per candidate.
- [x] Let staff issue a 72-hour invitation, replace it, or revoke it from the candidate profile.
- [x] Show a track-specific questionnaire with Company Driver skills and route preferences or Owner Operator equipment and operating model.
- [x] Show submission status and answers in the CRM. Record invitation and submission events in the activity history.
- [x] Run the production build and all eight unit tests. Apply both migrations in isolated PostgreSQL and rerun Phase 1 API and browser checks.
- [x] Verify that replacement, revocation and expiry invalidate links, simultaneous submissions write one result, and the candidate token grants access only to its questionnaire.
- [x] Verify in mobile Chrome that staff can create an invitation, the Owner Operator form supports a candidate without a trailer, the candidate sees a confirmation, and the submitted answers appear in the CRM.

The applicant opens an invitation shared by recruiting, completes the questionnaire and receives a confirmation. Submission leaves the recruitment stage under staff control.

## Applicant drafts

- [x] Save partial extended answers and restore them when a candidate reopens the invitation. Replacement links preserve saved work.
- [x] Detect a stale form before saving or submitting. The candidate can reload the newest saved draft from the form.
- [x] Show when a draft was last saved in the CRM. Staff can review the answers after submission.
- [x] Verify draft recovery across reloads and replacement links in PostgreSQL and mobile Chrome, including a stale-tab conflict.

## CRM follow-ups

- [x] Create a task from a candidate profile with an assignee and a due time.
- [x] Show pending tasks in the assignee's queue ordered by due time, and mark overdue tasks.
- [x] Complete or cancel a task and record the action in the candidate's history.
- [x] Verify assignee isolation, due-time display, completion and cancellation in API and mobile browser checks.

The production build and all 11 unit tests passed. An isolated PostgreSQL database applied all four migrations, and Prisma found no schema differences afterward.

## Render deployment

- [x] Add the root Blueprint for a public web service, private API, PostgreSQL, and Render Key Value.
- [x] Connect services over Render's private network, run migrations before API startup, and serve a readiness check.
- [x] Validate the Blueprint against Render's published schema. Verify production-mode install and build, all 11 tests, and browser workflows using Render-shaped environment variables with local PostgreSQL and Redis.
- [ ] Apply the Blueprint in the intended Render workspace and verify a live deployment. Workspace-level CLI validation requires authenticated Render access.

## Careers homepage

- [x] Redesign the public homepage, shared navigation and footer around the two CDL-A hiring paths.
- [x] Show up to three published jobs on the homepage and preserve supported campaign parameters in the links to jobs and application pages.
- [x] Verify layout in Chrome at 320, 390, 768 and 1440 pixels, navigate from the homepage to a published job and its application form, and check that draft jobs stay hidden. The production build, all 11 tests and existing browser workflows passed.

## Production intake protection

- [x] Separate Quick Apply and staff sign-in quotas by the verified visitor address at Render ingress, with a direct-peer fallback for local development and missing metadata.
- [x] Verify the Blueprint schema, production build, all 12 tests and browser requests reaching separate visitor-scoped Redis keys for Quick Apply and login in the local Render-shaped environment.

## Staff MFA

- [x] Add encrypted authenticator enrollment for both staff roles, with session revocation on enrollment or replacement.
- [x] Add the authenticator code to staff sign-in and support requiring it for every active account using the API's environment configuration.
- [x] Verify the Blueprint schema, all five migrations, the production build, and all 14 tests. Confirm browser sign-in, rejection of invalid codes, atomic rejection of concurrent code reuse, and rejection of legacy password-only sessions when MFA is required.
- [ ] Enroll the real staff accounts and enable the requirement on Render before accepting live applicant data.

## Recruiting report

- [x] Add a staff-only report with 7-, 30-, and 90-day windows and a driving-path filter.
- [x] Track new candidates separately from Quick Apply submissions, with daily activity, current recruitment stages, and first-application source categories.
- [x] Verify all six migrations, the production build, all 16 tests, report access controls, and mobile filtering. Verify that a repeat application counts as a submission while attribution stays with the candidate's first application.

## Candidate contact history

- [x] Record calls, email, and SMS in the candidate profile with channel, direction, outcome, occurrence time, author, and optional summary.
- [x] Add an audit event and deduplicate retries without changing the candidate's recruitment stage.
- [x] Verify all seven migrations, the production build, all 17 tests, authorization, concurrent retries, and mobile entry and retrieval.

## Candidate interviews

- [x] Schedule phone, video, or in-person interviews from the candidate profile and list each staff member's assigned meetings.
- [x] Reschedule open interviews and record completed, canceled, or no-show outcomes. Audit changes and reject stale edits.
- [x] Verify all eight migrations, the production build, all 18 tests, duplicate submissions, permissions, and the mobile schedule-to-outcome workflow.

## Recruiting activity metrics

- [x] Show median time from candidate creation to the first logged outbound attempt and how many candidates had an attempt.
- [x] Show interview results by scheduled date using the existing period and driving-path filters.
- [x] Verify nine migrations, the production build, all 18 tests, SQL aggregation, mobile rendering, and compatibility with the previous report response during deployment.

## Candidate offers

- [x] Record offers in the candidate profile with a position, optional terms summary and reply deadline.
- [x] Record accepted, declined, and withdrawn outcomes with an audit event and keep pipeline decisions under staff control.
- [x] Verify all ten migrations, the production build, all 19 tests, concurrent outcome protection, and the mobile record-to-outcome workflow.

## Home image

`apps/web/public/car-hauler.webp` was created with built-in ImageGen and appears as an industry illustration.

> Wide photorealistic editorial website hero, 16:9. A mechanically plausible US stinger-steer auto transport tractor and two-level open car-hauler trailer carrying several ordinary passenger vehicles, viewed from the front three-quarter angle on a dry open interstate at late afternoon. Put the tractor and trailer in the right two-thirds, framed well inside crop; open muted desert highway and low hills. Restrained warm amber sunlight, steel-blue shadows and a clean industrial look. Entirely unbranded equipment, no visible phone numbers, DOT or MC markings, logos, text, or other claims. This is an illustrative industry scene.
