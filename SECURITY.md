# Security Policy

## Supported code

The `main` branch of this application receives best-effort security fixes. There is no long-term-support branch and no guaranteed response time or service-level agreement.

## Report privately

**Do not open a public issue for a vulnerability.**

Use GitHub's private advisory flow:

**https://github.com/Hangtu/runo/security/advisories/new**

Include:

- the affected file, route, or operation and the repository revision;
- the security impact and who could be affected;
- minimal reproduction steps or a proof of concept;
- commands actually run and observed results;
- a suggested fix, if you have one.

Redact credentials, tokens, personal data, and household details. Do not attach production data or test accounts you do not own or have permission to assess.

If the private advisory form is unavailable, contact the maintainer privately through [@Hangtu's GitHub profile](https://github.com/Hangtu) and ask for a private channel. Do not include vulnerability details in a public issue.

## Scope

In scope:

- account isolation, session handling, and the private `/api/account/*` contract;
- token, secret, or personal-data exposure in clients, logs, URLs, or caches;
- unsafe validation or authorization at a trust boundary;
- service-worker or offline behavior that leaks another account's data;
- CI or supply-chain weaknesses in this repository.

Usually out of scope:

- vulnerabilities in third-party frameworks or services, unless this application's configuration is the cause;
- reports requiring access to another person's account, data, or deployment;
- social engineering, denial of service, or destructive testing;
- legal or privacy-policy questions, which belong in a normal issue or a direct message.

## Good-faith research

Good-faith, non-destructive research is welcome. Do not access data that is not yours, disrupt services, or test third-party infrastructure. This project may ask for clarification, may decline reports outside scope, and will credit useful reports when requested and appropriate.

## Disclosure

Please allow time for triage and a fix before publishing details. If a report involves an actively exploited issue, state that clearly in the advisory so it can be prioritized. This project makes a best-effort response; it does not promise a fixed remediation deadline.
