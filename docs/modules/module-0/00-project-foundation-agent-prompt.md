# Prescriptionly Module 0 Agent Prompt: Project Foundation

## Role and objective

Set up the technical foundation for **Prescriptionly**, a public web application repository that will later implement the product modules one by one.

Prescriptionly is a personal medication and medical-record wallet. Future modules will capture prescriptions and medical documents, distinguish prescribed medication from what the patient actually reports taking, maintain trustworthy history/provenance, and later support controlled sharing/export.

This prompt is **Module 0 only**. Build a clean, production-oriented foundation without implementing product/domain features that belong to later modules.

The application architecture is a **modular monolith**, not microservices.

Required stack:

* Backend: Node.js + Express.js + TypeScript.
* Frontend: React + Vite + TypeScript.
* Database: MySQL.
* ORM: Prisma ORM.
* Package ecosystem: npm unless the existing repository already uses another package manager.
* Repository: one public repository containing frontend and backend.
* TypeScript must be strict across all application code.

## Version policy

Before installing dependencies:

1. Verify current versions from official project documentation/package metadata.
2. Use the latest **stable/GA** release compatible with the chosen stack.
3. For Node.js, use the latest supported **LTS** line suitable for production, not an experimental/nightly build.
4. For MySQL, prefer the newest **LTS/GA** release supported by the current GA Prisma ORM.
5. Do not use beta, RC, canary, nightly, preview, or innovation-only releases unless this prompt explicitly allows them.
6. Prisma must be the current **GA/stable** ORM release. Do not use a Prisma RC just because its major version is newer.
7. Install current compatible versions of React, React DOM, Express, Vite, TypeScript, Prisma, ESLint, typescript-eslint, Vitest, React Testing Library, and supporting packages.
8. Commit the package lockfile.
9. Record the actual installed major versions in the README.
10. Do not copy dependency versions from old tutorials.

If two "latest" packages are incompatible, choose the newest mutually compatible stable versions and document the compatibility reason. Stability and supported compatibility take precedence over a larger version number.

## Scope

Implement only the project foundation:

* repository/workspace structure;
* Node/Express TypeScript API skeleton;
* React/Vite TypeScript frontend skeleton;
* strict TypeScript configuration;
* MySQL + Prisma configuration;
* development database through Docker Compose if Docker is available;
* environment-variable loading and validation;
* API health/readiness endpoints;
* frontend API connectivity proof;
* centralized backend error boundary/foundation;
* basic request logging foundation with secret redaction;
* linting;
* formatting;
* tests;
* build scripts;
* type-check scripts;
* Git ignore rules;
* `.env.example`;
* editor/config basics;
* GitHub Actions CI suitable for a public repository;
* comprehensive public `README.md`.

Do not implement authentication or any later Prescriptionly module.

## Explicitly out of scope

Do **not** create any of the following in Module 0:

* account/user authentication;
* `User`, `Account`, `PatientProfile`, prescription, medication, document, treatment, event, timeline, export, sharing, AI, or audit domain tables;
* fake medical records;
* seed users;
* OCR;
* FHIR;
* file uploads;
* email provider integration;
* cloud deployment;
* Redis;
* message queues;
* microservices;
* GraphQL;
* WebSockets;
* state-management libraries unless the starter frontend genuinely requires one;
* UI component frameworks merely for demonstration;
* a production Docker/Kubernetes deployment architecture;
* compliance claims;
* a software license chosen on behalf of the repository owner.

A public GitHub repository is not automatically open source. Do not add MIT, Apache, GPL, or another license unless the owner explicitly selects one later.

## Repository structure

Use npm workspaces and keep the layout easy to understand.

Preferred structure:

```text
prescriptionly/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── config/
│   │   │   ├── infrastructure/
│   │   │   │   └── database/
│   │   │   ├── modules/
│   │   │   ├── shared/
│   │   │   │   ├── errors/
│   │   │   │   ├── http/
│   │   │   │   ├── logging/
│   │   │   │   └── validation/
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── features/
│       │   ├── components/
│       │   ├── services/
│       │   ├── styles/
│       │   ├── main.tsx
│       │   └── vite-env.d.ts
│       ├── public/
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .editorconfig
├── .gitignore
├── compose.yml
├── eslint.config.*
├── prettier.config.*
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.base.json
```

Adjust filenames only when required by the current versions of the tools.

Do not create empty abstraction layers merely to reproduce this tree. A directory should exist when Module 0 or a clearly imminent module needs it.

Keep later backend modules under `apps/api/src/modules/`. Module 1 should be able to add `modules/auth` without reorganizing the application.

Keep later React features under `apps/web/src/features/`.

## Workspace requirements

The root `package.json` should:

* be private so the workspace root cannot be accidentally published to npm;
* define npm workspaces for `apps/*`;
* define convenient root scripts that delegate to workspaces;
* declare the supported Node engine/LTS policy;
* avoid application runtime dependencies at the root unless truly shared.

Provide predictable commands similar to:

```text
npm install

npm run dev
npm run dev:api
npm run dev:web

npm run build
npm run typecheck
npm run lint
npm run format
npm run format:check
npm run test
npm run test:run

npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:validate
```

Exact script names may be adjusted for current tooling, but the README and package scripts must agree.

`npm run dev` should run the API and web development servers together through a lightweight development runner if necessary. Do not introduce a heavy monorepo platform such as Nx or Turborepo for this project foundation.

## TypeScript policy

All first-party application code must be TypeScript:

* backend source: `.ts`;
* React source: `.tsx`/`.ts`;
* configuration should use typed TypeScript where the relevant tool supports it cleanly.

JavaScript is acceptable only where a tool requires it.

Create a shared base TypeScript config and environment-specific configs for API and web.

Enable strictness appropriate to current TypeScript, including the equivalents of:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictPropertyInitialization": true,
  "useUnknownInCatchVariables": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "forceConsistentCasingInFileNames": true
}
```

Do not blindly add obsolete compiler options if the latest TypeScript has removed/deprecated them. Use their current equivalents.

### Strict typing rules

These are non-negotiable:

* no explicit `any` in application code;
* no implicit `any`;
* no `as any`;
* do not silence compiler errors with `@ts-ignore`;
* `@ts-expect-error` is allowed only when unavoidable and must include a reason;
* caught errors begin as `unknown` and are narrowed safely;
* external/untrusted data starts as `unknown`;
* runtime input is validated before being treated as typed domain/application data;
* do not use type assertions as substitutes for validation;
* avoid non-null assertions (`!`) unless an invariant is locally proven and obvious;
* do not duplicate runtime schemas and handwritten types when a library can infer the type safely.

Configure typescript-eslint's type-aware rules so unsafe assignment/calls/member access/returns and explicit `any` are errors.

The goal is not merely "the project compiles." The goal is that data crossing process, network, environment, and database boundaries is validated and typed deliberately.

## Module system

Use modern ESM if it is supported cleanly by the current Node, Express, TypeScript, Prisma, and Vite releases.

Backend module resolution must match actual Node runtime behavior. Do not make TypeScript compile through aliases/import patterns that fail when built JavaScript runs under Node.

Avoid mixing CommonJS and ESM without a documented reason.

## Backend foundation

Create an Express application in `apps/api`.

Separate app construction from server startup:

```text
createApp / app
    ↓
Express middleware/routes
    ↓
server.ts starts listening
```

Tests must be able to instantiate/import the Express app without opening a real TCP port.

### Required backend behavior

Implement:

* configurable `PORT`;
* configurable frontend origin(s);
* JSON body parsing with a conservative body-size limit;
* request ID/correlation ID;
* basic structured request logging;
* security-conscious HTTP defaults/headers through a maintained middleware where appropriate;
* not-found handler;
* centralized error handler;
* graceful shutdown;
* Prisma/database lifecycle handling;
* process-level handling that logs fatal startup/runtime failures and exits safely instead of continuing in a corrupted state.

Do not log:

* cookies;
* authorization headers;
* database passwords/URLs;
* environment secrets;
* future medical payloads;
* request bodies by default.

Module 0 logs should be useful operationally without normalizing a future pattern of logging sensitive health information.

## Health endpoints

Add foundation endpoints such as:

```text
GET /api/health
GET /api/ready
```

`/api/health`:

* proves the HTTP process is alive;
* does not require a database query;
* returns a small typed response.

`/api/ready`:

* verifies required dependencies such as the database connection;
* returns a safe status;
* must not reveal credentials, SQL, environment variables, host internals, stack traces, or other secrets.

Use an appropriate non-success HTTP status when readiness dependencies are unavailable.

Do not create a fake business endpoint.

## Runtime validation

Use a maintained schema-validation library such as Zod, compatible with the selected stack.

Validate environment variables at startup.

At minimum define/validate:

* `NODE_ENV`;
* `PORT`;
* `DATABASE_URL`;
* `WEB_ORIGIN` or equivalent allowed frontend origin config;
* optional logging level if implemented.

The application should fail fast with a useful but secret-safe startup message if required configuration is invalid.

Do not access `process.env` throughout random files. Centralize typed configuration.

The browser must expose only variables explicitly intended for the browser, using Vite's public environment convention. Never put secrets in `VITE_*` variables.

## MySQL + Prisma foundation

Use MySQL as the only database provider.

Use the current GA Prisma ORM according to its current official setup pattern.

Important:

* configure Prisma for `mysql`;
* follow the current Prisma GA requirement for direct MySQL driver adapters if applicable;
* use the correct current MySQL/MariaDB Prisma driver adapter documented by Prisma;
* use `prisma.config.ts` if required/recommended by the installed Prisma version;
* generate the Prisma client using the installed version's recommended generator/output pattern;
* centralize Prisma/database client creation under backend infrastructure;
* avoid creating multiple pools/clients per request;
* implement clean shutdown;
* configure connection settings through environment variables.

### Domain-schema rule

**Do not create a domain model in Module 0.**

The Prisma schema should contain only the configuration/generator/database foundation required by the installed Prisma version.

Module 1 will define account/authentication entities.

Do not add a dummy `User`, `Health`, `Example`, `Todo`, or `_System` table just to demonstrate Prisma.

If Prisma tooling cannot create a migration for an empty schema, do not invent a table. Validate/generate the Prisma setup and let the first domain module create the first real migration.

## Local MySQL

Provide a `compose.yml` for local development.

Requirements:

* use a stable supported MySQL LTS image compatible with the current Prisma GA release;
* configure database name/user/password through development environment values;
* use a named volume for local persistence;
* add a healthcheck;
* expose the standard MySQL port for local development;
* do not put real production credentials in the compose file;
* do not use a root account as the application's normal database user;
* document how to start/stop/reset the local database.

If the newest MySQL LTS is not yet supported by the current Prisma GA release, use the newest supported MySQL LTS and document the reason in the README.

## Prisma scripts

Provide clear scripts for the expected development workflow.

At minimum support equivalents of:

```text
prisma generate
prisma validate
prisma migrate dev
prisma migrate deploy
prisma studio
```

Do not run destructive reset commands automatically.

Never make `prisma db push` the normal production schema-deployment strategy.

Later modules must use committed migrations for schema evolution.

## Frontend foundation

Create the frontend using the current official React + Vite TypeScript scaffold/pattern.

Use:

* latest stable React;
* latest stable React DOM;
* latest compatible stable Vite;
* strict TypeScript;
* standard React functional components/hooks.

Do not use Create React App.

Do not introduce Next.js, Remix, Angular, Vue, or another framework.

### Frontend scope

The initial interface should be intentionally small.

Create:

* application bootstrap;
* global CSS/reset/basic design tokens if needed;
* a minimal Prescriptionly landing/development screen;
* API health status integration or development indicator proving frontend-to-backend communication;
* reusable API client foundation;
* basic error/loading state for that health request.

Do not design the full medical dashboard in Module 0.

Do not create fake prescription cards, health summaries, medication charts, or placeholder clinical information.

The UI may display:

* Prescriptionly name;
* one short product description;
* development status;
* API health/readiness status.

Keep visual work minimal so later product screens can establish the actual design system.

## Frontend API client

Create one typed API-access foundation.

Requirements:

* API base URL comes from validated/configured Vite environment;
* failed HTTP responses are handled consistently;
* JSON is not blindly trusted merely because TypeScript has an interface;
* validate important server responses at runtime or structure the foundation so future contracts can do so;
* no direct `fetch` calls scattered across components;
* no authentication handling yet;
* no tokens/localStorage auth placeholders.

Do not introduce Axios if native `fetch` satisfies the foundation requirements.

## Routing

If the Module 0 interface needs only one page, do not add a router solely for future use.

If routing is already required by existing repository content, use the latest compatible stable React Router and configure it cleanly.

Module 1 can add routing when authentication pages make it necessary.

## CSS/UI dependencies

Keep Module 0 neutral.

Do not install Tailwind, Material UI, Chakra, Ant Design, Bootstrap, shadcn/ui, or another design system unless it already exists in the repository or is explicitly requested elsewhere.

Do not make a UI-library choice on behalf of future modules from a foundation prompt.

Use small maintainable CSS for the starter screen.

## Code quality

Configure current ESLint flat config and typescript-eslint type-aware linting.

At minimum enforce:

* no explicit `any`;
* no unsafe TypeScript operations;
* unused imports/variables handled appropriately;
* React hooks rules;
* React refresh/Vite rules where applicable;
* no floating promises;
* promises handled safely;
* no accidental console usage in application code except through the logging foundation where relevant.

Use Prettier for formatting.

Avoid conflicting formatting rules inside ESLint.

Provide:

```text
npm run lint
npm run typecheck
npm run format
npm run format:check
```

The repository must have zero lint/type errors at completion.

## Tests

Use current stable Vitest compatible with Vite/Node.

Backend:

* test `GET /api/health`;
* test `GET /api/ready` success when DB is available or mock dependency cleanly for unit/API tests;
* test readiness failure behavior without leaking details;
* test not-found response;
* test centralized error serialization if practical.

Frontend:

* use React Testing Library;
* test the initial app renders;
* test health loading/success/failure states without depending on a real backend.

Tests must be deterministic.

Do not require developers to have a production database to run ordinary unit tests.

Integration tests that require MySQL should be clearly separated/documented if introduced.

## Error model

Create a minimal, reusable API error response foundation for future modules.

Example conceptual shape:

```text
{
  "error": {
    "code": "SOME_STABLE_CODE",
    "message": "Safe public message",
    "requestId": "..."
  }
}
```

Do not expose stack traces in production responses.

Do not create dozens of speculative error classes. Implement the smallest foundation needed for consistent future APIs.

## HTTP/API conventions

Establish and document these conventions:

* API routes start with `/api`;
* JSON is the default API representation;
* timestamps emitted by the server should use ISO 8601;
* HTTP status codes have normal semantics;
* validation failures, not-found errors, dependency failures, and unexpected server failures have distinguishable stable error codes;
* request IDs should be returned in a header and/or safe error payload;
* no medical domain conventions are invented yet.

Version the API later when there is an actual compatibility requirement. Do not add `/api/v1` just because it might be useful someday unless the project already decided to version from day one.

## Security baseline

Module 0 is not the full security module, but the foundation must avoid insecure defaults.

Implement/configure:

* no secrets committed;
* environment validation;
* safe HTTP headers where appropriate;
* conservative request-body size;
* restricted CORS to configured origin(s), not wildcard credentialed CORS;
* dependency lockfile;
* dependency audit visibility;
* logs that redact sensitive headers/config;
* production stack traces disabled;
* graceful shutdown;
* database credentials outside source control.

Do not add authentication, CSRF mechanics, medical-data encryption policy, consent logic, or compliance controls here. Those belong to their respective modules.

## Environment files

Commit `.env.example`, never a real `.env`.

It should contain safe placeholders such as:

```text
NODE_ENV=development
PORT=...
DATABASE_URL=mysql://APP_USER:APP_PASSWORD@localhost:3306/prescriptionly
WEB_ORIGIN=http://localhost:...
VITE_API_BASE_URL=http://localhost:...
```

Use actual chosen local ports consistently.

The example must not contain personal credentials or secrets.

Document which variables belong to the API and which are public browser variables.

## Git ignore

At minimum ignore:

* `node_modules`;
* build output;
* coverage output;
* `.env` and local secret variants;
* logs;
* OS/editor transient files;
* generated local artifacts that should not be committed.

Do **not** ignore:

* `.env.example`;
* Prisma migrations once domain modules begin adding them;
* package lockfile;
* source/config files required to reproduce the build.

Follow the installed Prisma version's recommendation on whether generated Prisma client output is committed or generated during install/build. Document the decision.

## GitHub Actions CI

Because this repository will be public, create a small CI workflow triggered for pull requests and pushes to the main branch.

Use current supported GitHub Actions releases.

CI must:

1. check out the repository;
2. install the intended Node LTS version;
3. use `npm ci`;
4. run format check;
5. run lint;
6. run TypeScript typecheck;
7. run tests;
8. run production builds;
9. run Prisma validation/generation as required.

Use caching through the supported Node setup action where appropriate.

Do not place credentials in workflow YAML.

Do not add deployment.

Avoid a complex build matrix during Module 0. One supported Node LTS environment is sufficient unless compatibility testing is explicitly needed later.

## README.md

Write a **real public-facing root README**, not a generated placeholder.

The README must be understandable to someone who has never seen the private product discussions.

Use the title:

```text
# Prescriptionly
```

### README content

Include concise sections covering:

1. **What Prescriptionly is**

   * Describe it as a personal medication and medical-record wallet.
   * Explain the core long-term idea: preserve what was prescribed separately from what the patient reports actually taking.
   * Mention capture/history/sharing/export as product direction, not completed functionality.

2. **Project status**

   * Clearly state that the project is under active development.
   * Distinguish implemented Module 0 infrastructure from planned product features.
   * Never claim an unfinished feature exists.

3. **Core product principles**

   * original prescription/source evidence remains distinguishable from derived/edited data;
   * prescribed, scheduled, user-reported actual events, and system/AI interpretations must not be silently conflated;
   * patient-controlled history;
   * future interoperability comes from adapters over the application's canonical model.

4. **Technology stack**

   * React;
   * Vite;
   * TypeScript;
   * Node.js;
   * Express;
   * MySQL;
   * Prisma;
   * testing/linting tools.
   * State the installed major versions or version policy.

5. **Architecture**

   * modular monolith;
   * `apps/web`;
   * `apps/api`;
   * MySQL/Prisma;
   * explain that domain modules will be added incrementally.

6. **Repository structure**

   * short tree;
   * brief purpose of major folders.

7. **Prerequisites**

   * required Node LTS;
   * npm;
   * Docker/Docker Compose if using the provided local MySQL setup, or an existing MySQL connection.

8. **Local setup**

   * clone;
   * install;
   * copy `.env.example`;
   * start MySQL;
   * Prisma generate/validation/migration command as appropriate;
   * start development servers;
   * list default local URLs.

9. **Available scripts**

   * dev;
   * build;
   * lint;
   * typecheck;
   * test;
   * format;
   * Prisma commands.

10. **Environment variables**

    * list variable names and purpose;
    * never include real secrets.

11. **Database workflow**

    * Prisma schema;
    * migrations will be committed;
    * development migration versus production deploy command;
    * destructive reset is manual and never automatic.

12. **Development standards**

    * strict TypeScript;
    * no `any`;
    * runtime validation at trust boundaries;
    * tests and quality gates.

13. **Roadmap**

    * reference future modules at a high level without presenting them as complete.
    * authentication should be the next module.

14. **Security/privacy note**

    * explain that Prescriptionly is intended to handle sensitive health information eventually;
    * do not claim regulatory compliance;
    * tell contributors never to commit real patient/medical data, credentials, prescription images, or secrets.

15. **Medical disclaimer**

    * clarify that the software repository is not medical advice and should not be treated as a substitute for professional medical care.

16. **Contributing**

    * state that contribution guidance may evolve;
    * require quality checks for proposed changes.
    * Do not invent governance rules or contributor license agreements.

17. **License**

    * if no license was explicitly provided, state that no open-source license has yet been selected, or omit the section.
    * Do not assign a license on behalf of the owner.

Keep the README informative but not marketing-heavy. Avoid unsupported claims such as "HIPAA compliant", "secure by design", "works with every hospital", or "FHIR compatible" before those statements are actually true.

## Public-repository hygiene

Before completion, inspect the repository for data that must not become public.

Verify there are no committed:

* `.env` files with credentials;
* database passwords;
* API keys;
* private certificates;
* tokens;
* real prescription images;
* real patient names;
* medical records;
* local database dumps;
* debug logs containing sensitive values.

Example/demo data added in future modules must be obviously synthetic.

## Dependency discipline

Do not install packages "just in case."

Every direct dependency must have a current purpose.

Prefer:

* platform APIs when sufficient;
* mature maintained packages;
* dependencies compatible with ESM/strict TypeScript/current Node.

Avoid:

* abandoned packages;
* overlapping libraries solving the same problem;
* separate request libraries when native `fetch` is enough;
* huge utility libraries for one helper;
* premature cache/queue/state-management infrastructure.

After installation:

* review direct dependency list;
* remove scaffold dependencies not being used;
* run the package manager's audit command;
* fix high/critical issues when a safe compatible fix exists;
* document unresolved dependency risk rather than hiding it.

## Required verification

The agent must actually execute and verify the foundation.

At minimum:

1. clean dependency install succeeds;
2. TypeScript typecheck succeeds for API and web;
3. ESLint succeeds;
4. format check succeeds;
5. tests succeed;
6. backend production build succeeds;
7. frontend production build succeeds;
8. Prisma config/schema validation succeeds;
9. Prisma client generation succeeds where required;
10. local MySQL can start using the documented setup, if Docker is available;
11. API starts with valid environment configuration;
12. `/api/health` responds successfully;
13. `/api/ready` successfully verifies MySQL when DB is running;
14. frontend starts and can call the API health endpoint;
15. invalid required environment configuration fails at startup safely;
16. no TypeScript `any` escapes exist in application code;
17. no secret appears in Git-tracked files.

If the execution environment cannot run Docker/MySQL, complete everything else and explicitly report the unverified database-runtime check. Do not fake successful verification.

## Acceptance criteria

Module 0 is complete only when:

* the repository has a clear web/API workspace structure;
* React + Vite works with strict TypeScript;
* Node + Express works with strict TypeScript;
* MySQL is configured as the database;
* Prisma GA is configured correctly for MySQL;
* no business/domain tables have been invented;
* local development setup is reproducible;
* environment variables are typed/validated;
* frontend-to-backend connectivity is demonstrated;
* API health/readiness behavior is implemented;
* lint, format, typecheck, tests, Prisma validation/generation, and builds pass;
* GitHub Actions runs the same important quality gates;
* public repository hygiene is satisfied;
* README accurately describes the product vision, current implementation status, stack, architecture, setup, scripts, database workflow, privacy considerations, and roadmap;
* README does not claim unfinished functionality;
* README does not make compliance guarantees;
* no open-source license is selected without owner instruction;
* the architecture remains a modular monolith;
* Module 1 can be implemented without restructuring Module 0.

## Final self-critique

Before declaring completion, inspect your own work and fix problems.

Check specifically for:

1. TypeScript strictness weakened to make tooling compile.
2. `any`, unsafe assertions, or `@ts-ignore`.
3. Runtime data trusted without validation at boundaries.
4. ESM/import behavior that works in dev but fails after build.
5. Prisma setup copied from an obsolete major version.
6. MySQL version incompatibility with current Prisma GA.
7. accidental use of PostgreSQL, SQLite, Prisma Postgres, or another database.
8. duplicate Prisma clients/connection pools.
9. domain models accidentally introduced in Module 0.
10. backend code coupled directly to React/frontend code.
11. scattered `process.env` access.
12. secrets or sensitive headers entering logs.
13. wildcard CORS configuration.
14. unnecessary dependencies.
15. fake/demo medical data.
16. stale README commands or ports.
17. README claims that exceed the code actually implemented.
18. CI using commands different from local quality gates.
19. uncommitted/generated files required for a clean clone.
20. public repository secrets or private data.

Fix every high-severity issue before completion.

In the final completion response, report only:

* foundation implemented;
* actual installed major versions;
* important architectural decisions;
* commands/tests run and results;
* files/configuration added;
* anything that could not be verified;
* deliberate deferred work for Module 1+.

**After completing this module, create the directory if needed and write a concise implementation summary to `docs summary/project-foundation-YYYY-MM-DD-HHmm.md`, using the actual completion date and time; include installed versions, structure created, configuration decisions, database/Prisma setup, scripts, tests/checks run, README work, known limitations, and deferred items.**
