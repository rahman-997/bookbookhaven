# Security Policy

## Supported version

The current `main` branch is the supported version of BookHaven. Older snapshots, experimental branches, and historical releases may not receive security fixes.

## Reporting a vulnerability

Please do **not** publish exploit details, credentials, tokens, personal data, or sensitive reproduction material in a public GitHub issue.

If you discover a security issue:

1. Contact the repository owner through the GitHub profile and request a private channel for the report.
2. Include the affected surface, impact, reproduction steps, and the minimum evidence needed to understand the issue.
3. Redact real accounts, customer data, credentials, payment information, and third-party secrets.
4. Allow time for triage and remediation before public disclosure.

A public issue is appropriate only for non-sensitive hardening suggestions that do not expose an exploitable vulnerability.

## Scope

Useful reports include authentication/session weaknesses, RBAC bypasses, IDOR, injection, request-validation bypasses, checkout or inventory integrity issues, sensitive-data exposure, unsafe admin operations, practical dependency vulnerabilities, and production configuration that creates a concrete security risk.

Reports about intentionally public demo data, expected free-tier cold starts, or behavior that requires already-compromised administrator access without increasing impact may be treated as out of scope.

## Security baseline

BookHaven uses validation, API-side authorization, production secret checks, security middleware, rate limiting, and CI-backed verification. Security fixes should include a regression test or explicit verification step whenever practical.
