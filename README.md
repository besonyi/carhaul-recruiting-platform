# Car Hauling Recruiting Platform

A mobile-first recruiting site and staff CRM for CDL-A company drivers and owner operators. See [Phase 1 scope](PLAN.md).

## Codex CLI in PowerShell

Open PowerShell at the repository root and run:

```powershell
.\Start-Codex.cmd
```

The launcher opens the installed Codex CLI in this checkout. It uses this repository's `AGENTS.md` and adds the matching portable Node distribution under `%LOCALAPPDATA%\CarhaulRecruiting\Node` to the CLI process if present. Check the account from this checkout with `.\Start-Codex.cmd login status` or pass a prompt as the first argument. With a regular Node installation on PATH, `codex --cd .` also opens the project.

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

### Record a candidate contact

After a phone call, email, or text message, open **Contact history** on the candidate profile. Select the channel, direction, and outcome. Add an optional summary and the actual local time of the contact, or leave the time blank to record it as happening now. The newest contacts appear first with the date and the staff member who recorded them. Update the recruitment stage separately when appropriate.

### Schedule an interview

On a candidate profile, open **Interviews → New interview**. Select the interviewer, format, local start time, and duration. Add meeting details and share them with the candidate through your recruiting process. **My interviews** shows your assigned meetings and flags those still awaiting an outcome after the scheduled end.

From the candidate profile, reschedule an open meeting or record it as completed, canceled, or a no-show. A no-show can be recorded after the scheduled end. The activity history tracks these actions, and staff control the candidate's recruitment stage separately.

### Track an offer

Use **Offers → New offer** on the candidate profile to record the position, an optional summary of the terms, and an optional reply deadline. The profile flags passed deadlines while the offer awaits a response. Record the result as accepted, declined, or withdrawn, with optional notes. The outcome appears in the activity history. Staff share offer details with candidates through their recruitment process and control the pipeline stage separately.

### Read the recruiting report

Open **Recruiting report** in the staff navigation and choose the last 7, 30, or 90 UTC calendar days and a driving path. **New candidates** counts distinct profiles created during that period. The stage breakdown and **Currently hired in this group** show where those candidates are now. **Quick applications received** counts submissions during the period, including repeat submissions and submissions from profiles created earlier.

Source categories use the first Quick Apply recorded for each candidate. Recognized sources are grouped by channel, unknown values appear as **Other**, and missing sources appear as **Unattributed**. The report returns aggregate counts.

**First outreach** shows how many new candidates had an outbound call, email, or SMS logged in the contact history, and the median delay from profile creation to the first such attempt. The median uses candidates with a recorded attempt. **Interview outcomes** counts interviews by current status using their scheduled start in the selected period, up to the time the report is viewed.

```text
npm test
npm run build
docker compose down
```

## Deploy on Render

Open the [Render Blueprint for this repository](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fbesonyi%2Fcarhaul-recruiting-platform), authorize GitHub access if prompted, and select `main`. Review and apply the Blueprint in the intended Render workspace. It provisions four paid resources in Virginia: a public Next.js web service, a private NestJS API, PostgreSQL 17, and Render Key Value. Review the estimate shown by Render before applying.

The Blueprint installs dependencies from the workspace root and applies Prisma migrations before each API deploy. The web service reads the API's internal address from Render. The web service's `/healthz` endpoint checks the API, PostgreSQL and Key Value. Render supplies the initial HTTPS public origin through `RENDER_EXTERNAL_URL`. If you add a custom domain, set `WEB_ORIGIN` on the web service to its HTTPS origin so candidate invitations point there.

When diagnosing a manually created service, use the repository root and check that each command is in its own field.

| Render setting | Public Web Service | Private API |
| --- | --- | --- |
| Build Command | `npm ci --include=dev && npm run build -w web` | `npm ci --include=dev && npm run build -w api` |
| Pre-Deploy Command | Leave empty | `npm run db:deploy` |
| Start Command | `npm run start -w web -- --hostname 0.0.0.0` | `npm run start -w api` |

A **Publish Directory** field indicates that the resource was created as a Static Site. A missing `.next` build usually means Next.js was started before the build completed. If Prisma reports a missing datasource URL, verify that `DATABASE_URL` is set on the private API and that the web service's Pre-Deploy Command is empty. Use the Blueprint to wire the required service addresses and credentials.

The public site can start with its generic title and an empty jobs list. Set `CARRIER_NAME`, `CONTACT_NOTICE_VERSION` and `CONTACT_NOTICE_TEXT` in the API service environment when verified carrier information and approved consent copy are available. These values enable Quick Apply. Review the production controls below before taking real applications.

After the API's first successful deploy, open its Render Shell and run the following from the repository root to provision the first administrator. Replace the example email with the administrator's work address.

```bash
read -rsp "Staff password: " STAFF_INITIAL_PASSWORD
echo
export STAFF_INITIAL_PASSWORD
npm run staff:create -- admin@example.test ADMIN
unset STAFF_INITIAL_PASSWORD
```

### Enroll staff MFA

The Render Blueprint generates `STAFF_MFA_KEY` on the private API. For local use, configure a random 32-byte key encoded as base64 in `apps/api/.env`. Retain the key in your secret manager with the database backup so encrypted authenticator records can be restored.

After applying database migrations, run this from a private interactive terminal connected to the target API environment:

```text
npm run staff:mfa -- admin@example.test
```

Add the displayed setup key as a time-based entry in the staff member's authenticator and confirm with a six-digit code. Enrollment revokes that account's existing sessions. Wait for the next code before signing in. If a device is lost, a verified operator can run the same command to replace the authenticator and revoke sessions again.

After enrolling all active staff, set `STAFF_MFA_REQUIRED=true` on the private API and redeploy. This blocks sign-in for staff without MFA and expires access from existing password-only sessions. Enrolled accounts require a code even while that environment setting is off.

## Data flow

Next.js performs mutations through server actions and calls the private Nest API. Staff use expiring, revocable sessions with hashed tokens and an HTTP-only cookie. Admins manage jobs. Admins and recruiters review applicants and update the pipeline. PostgreSQL stores normalized candidate profiles, each submission, the consent statement and timestamp, and transactional audit events. Candidates match by normalized phone and driving track. Repeat submissions keep their own contact snapshot and preserve the existing pipeline stage.

Redis enforces intake and login limits. BullMQ is available for future workers. There are no outbound messaging jobs in Phase 1. Future queue events should carry record IDs. AI integrations can prepare material for staff review, with pipeline mutations reserved for authenticated staff.

## Before collecting live applications

Provide verified carrier and recruiting information along with approved privacy and consent copy. Configure HTTPS, private service networking, a trusted ingress for per-client rate limits, encryption and scheduled backups for the database, staff MFA, and retention/deletion procedures. The local database credentials are development-only. Multiple internal staff roles share access to candidate profiles in this MVP.

The Render Blueprint generates a shared `RECRUITING_PROXY_SECRET` for the web and API services. The web server signs the visitor address supplied by Render's public ingress for Quick Apply and staff sign-in. The private API verifies the signature before assigning a Redis quota. Local development and requests without verified visitor metadata use the direct peer's quota. Keep the API private and attach the same environment group to both services when configuring Render manually.

Quick Apply and the extended questionnaire exclude SSNs, CDL numbers and document uploads. Persistent applicant accounts, formal application and compliance workflows, onboarding, SMS, AI and analytics are tracked as follow-on work.
