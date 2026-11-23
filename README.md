# Car Hauling Recruiting Platform

A mobile-first recruiting site and staff CRM for CDL-A company drivers and owner operators. See [Phase 1 scope](PLAN.md).

## Local development

Install Node.js 22 or newer with npm and Docker with Compose v2. Start from the repository root.

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
docker compose up -d
npm ci
npm run db:deploy
```

Create an initial administrator. The command reads the password from the environment and requires at least 14 characters. Use the same command with `RECRUITER` to provision a recruiter.

```powershell
$env:STAFF_INITIAL_PASSWORD = Read-Host 'Staff password' -MaskInput
npm run staff:create -- admin@example.test ADMIN
Remove-Item Env:STAFF_INITIAL_PASSWORD
npm run dev
```

Open [the careers site](http://localhost:3000) or [staff sign-in](http://localhost:3000/crm). The private Nest API listens on loopback port 4000 by default. Admins can create drafts, publish, pause and archive jobs in **Manage jobs**.

Populate `CARRIER_NAME`, `CONTACT_NOTICE_VERSION` and `CONTACT_NOTICE_TEXT` in the API environment and restart it to enable Quick Apply. Use approved, carrier-specific copy for real applicants, and increment the version whenever the statement changes. For local QA only, use clearly marked test copy and synthetic applicants.

### Continue an application

On a candidate's CRM profile, choose **Create invitation** under **Extended application**, copy the private link and share it with the candidate through your recruitment process. Set `WEB_ORIGIN` in the web environment to the actual web origin so the generated link resolves correctly. Production invitation links require HTTPS.

Each link expires after 72 hours and accepts one completed submission. Staff can replace or revoke an unused link. Candidates can save a draft and continue from a current link, including a replacement link. The CRM shows the last save time. After submission, the candidate sees a confirmation and staff can review answers in the same profile. The activity timeline records invitation creation, revocation, the first draft save and submission.

For an existing checkout, regenerate Prisma Client with `npm run postinstall -w api` and apply the new migration with `npm run db:deploy` before restarting the app.

### Schedule a follow-up

Use **Follow-ups** on a candidate profile to give the task a name, select the staff member responsible, and enter a due time in your local time zone. **My follow-ups** lists your pending tasks by due time and marks overdue tasks. Completed and canceled tasks stay on the candidate profile and in the activity history.

```text
npm test
npm run build
docker compose down
```

## Data flow

Next.js performs mutations through server actions and calls the private Nest API. Staff use expiring, revocable sessions with hashed tokens and an HTTP-only cookie. Admins manage jobs. Admins and recruiters review applicants and update the pipeline. PostgreSQL stores normalized candidate profiles, each submission, the consent statement and timestamp, and transactional audit events. Candidates match by normalized phone and driving track. Repeat submissions keep their own contact snapshot and preserve the existing pipeline stage.

Redis enforces intake and login limits. BullMQ is available for future workers. There are no outbound messaging jobs in Phase 1. Future queue events should carry record IDs. AI integrations can prepare material for staff review, with pipeline mutations reserved for authenticated staff.

## Before collecting live applications

Provide verified carrier and recruiting information along with approved privacy and consent copy. Configure HTTPS, private service networking, a trusted ingress for per-client rate limits, encryption and scheduled backups for the database, staff MFA, and retention/deletion procedures. The local database credentials are development-only. Multiple internal staff roles share access to candidate profiles in this MVP.

The API rate limit keys use its direct peer address. Browser requests sent through one Next.js process share that process's IP allowance. Resolve client identity at the trusted ingress and align the application rate limits before opening intake to the public.

Quick Apply and the extended questionnaire exclude SSNs, CDL numbers and document uploads. Persistent applicant accounts, formal application and compliance workflows, onboarding, SMS, AI and analytics are tracked as follow-on work.
