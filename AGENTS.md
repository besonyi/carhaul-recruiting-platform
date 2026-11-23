# Car Hauling Recruiting

Work only in this repository. HaulAlert and DispWatch are separate products.
Use Technical Specification V1.0 and the delivery scope in PLAN.md.
Keep applicant data out of logs, fixtures containing real data, and public routes.
Require staff authorization for CRM operations and audit recruiting changes.
Publish only verified carrier and job details. Keep recruiting decisions human-controlled.
Run tests and build before reporting completion. Update PLAN.md with verification gaps.

On Windows, start Codex with `./Start-Codex.cmd` from PowerShell. Use `npm.cmd test` and `npm.cmd run build` in PowerShell. The repository pins Node in `.node-version`. For schema changes, regenerate the client with `npm.cmd run postinstall -w api` and apply migrations to the intended database with `npm.cmd run db:deploy`.
