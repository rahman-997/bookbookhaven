# BookHaven security policy

## Supported version

The `main` branch is the supported production line. Security hardening is validated through the same CI gate used for production changes.

## Reporting a vulnerability

Please do not open a public issue for exploitable vulnerabilities or exposed credentials. Report the issue privately to the repository owner through GitHub's private vulnerability reporting/security advisory flow when available.

Include:

- affected route or component
- reproduction steps
- expected vs. actual behavior
- impact assessment
- suggested mitigation if known

Do not include real production secrets, customer data, or destructive proof-of-concept payloads.

## Security controls

BookHaven currently uses:

- HttpOnly browser session cookies through the Next.js BFF
- JWT validation and RBAC in the Express API
- same-origin checks for state-changing BFF requests
- Helmet on the Express service
- explicit browser security headers on the Next.js service
- rate limiting and request-size limits
- production secret validation
- Zod request validation
- centralized error handling
- optimistic concurrency and guarded checkout/order transitions
- CI typecheck, tests, builds, production dependency audits, and standalone runtime verification

Production dependency audits fail the quality gate on high or critical vulnerabilities in runtime dependencies.
