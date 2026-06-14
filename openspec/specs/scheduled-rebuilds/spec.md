# Scheduled Rebuilds Specification

## Purpose

Automate SSG rebuilds via GitHub Actions cron schedule + Vercel Deploy Hook, ensuring fresh station and forecast data without manual deploys.

## Requirements

### Requirement: Rebuild Schedule

The system MUST rebuild the site automatically at 08:00 and 20:00 ART (11:00 and 23:00 UTC).

#### Scenario: Cron triggers Vercel hook

- GIVEN the GitHub Actions workflow is active on the default branch
- WHEN the cron schedule fires at 11:00 UTC
- THEN the workflow SHALL execute `curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}`
- AND the workflow SHALL complete with exit code 0

#### Scenario: Manual trigger

- GIVEN the workflow is configured with `workflow_dispatch`
- WHEN a maintainer triggers it manually via GitHub UI
- THEN the workflow SHALL execute the deploy step identically

### Requirement: Pre-build Format Check

The workflow MUST run Prettier format check before triggering the deploy.

#### Scenario: Format check passes

- GIVEN the workflow runs
- WHEN Prettier check (`npx prettier --check .`) succeeds
- THEN the workflow SHALL proceed to trigger the Vercel Deploy Hook

#### Scenario: Format check fails

- GIVEN the workflow runs
- WHEN Prettier check fails (format inconsistencies found)
- THEN the workflow SHALL fail early with a non-zero exit code
- AND the deploy hook MUST NOT be triggered
- AND the error SHALL be logged in the GitHub Actions output

### Requirement: Secret Management

The VERCEL_DEPLOY_HOOK_URL secret MUST exist in the GitHub repository.

#### Scenario: Secret is missing

- GIVEN the VERCEL_DEPLOY_HOOK_URL secret is not configured
- WHEN the workflow runs
- THEN the workflow SHALL fail with a clear error message indicating the missing secret
