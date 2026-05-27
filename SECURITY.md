# Security Policy

Statuz files may contain sensitive project state. They should not contain secrets.

## Do not store

- API keys;
- access tokens;
- passwords;
- private personal data unless explicitly approved;
- confidential customer data;
- proprietary source snippets that should not be committed.

## Recommended practice

For public repositories, commit only safe status templates and examples.

For private local runtime state, add `.statuz/private/` or `.statuz/local.yaml` to `.gitignore`.

## Reporting

Please open a private security report if you find a vulnerability in a Statuz implementation.
