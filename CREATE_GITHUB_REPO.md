# Create the GitHub repository under Oasis Company

I cannot push this repository for you without GitHub write access, but this repo is ready to publish.

Recommended repository:

```text
Oasis-Company/statuz
```

## Option A: GitHub website

1. Open `https://github.com/organizations/Oasis-Company/repositories/new`.
2. Repository name: `statuz`.
3. Description: `AI Agent Runtime Status Protocol`.
4. Visibility: Public.
5. Do not initialize with README, license, or .gitignore because this package already includes them.
6. Create repository.

Then push:

```bash
cd statuz
git init
git add .
git commit -m "init: seed Statuz protocol"
git branch -M main
git remote add origin https://github.com/Oasis-Company/statuz.git
git push -u origin main
```

## Option B: GitHub CLI

```bash
cd statuz
git init
git add .
git commit -m "init: seed Statuz protocol"
gh repo create Oasis-Company/statuz --public --description "AI Agent Runtime Status Protocol" --source=. --remote=origin --push
```

## Suggested About section

Description:

```text
AI Agent Runtime Status Protocol
```

Website:

```text
https://www.oasiscompany.org
```

Topics:

```text
ai-agent agent-protocol runtime-status mcp agent-memory agent-skills multi-agent yaml protocol oasis-company
```
