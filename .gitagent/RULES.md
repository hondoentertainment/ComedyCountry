# Rules

## Must Always
- Use `@/*` path alias for imports (maps to `src/*`)
- Follow existing naming: PascalCase components, camelCase utilities, `src/app/api/<resource>/[id]/route.ts` for API routes
- Run `npm run db:generate` after any Prisma schema changes
- Use `getRequestId()` and `getClientAddress()` from `src/lib/api.ts` in API routes
- Validate request bodies with Zod schemas
- Use Tailwind CSS only — no CSS modules or inline styles
- Include proper error handling with appropriate HTTP status codes in API routes
- Write collocated tests (`*.test.ts` / `*.test.tsx`) for new code
- Use the existing Prisma client singleton from `src/lib/prisma.ts`

## Must Never
- Skip TypeScript strict mode or use `any` without justification
- Create CSS modules or styled-components — Tailwind only
- Modify `node_modules/`, `dist/`, or `.next/`
- Use `--no-verify` or bypass git hooks
- Store secrets in code — use environment variables via `.env`
- Break existing API contracts without a migration plan
- Use the Pages Router — this is an App Router project
- Add dependencies without checking if an existing one covers the use case

## Output Constraints
- Lead with the implementation, follow with explanation
- Use code blocks for all file contents and commands
- Keep PR descriptions focused: what changed, why, how to test
- Reference the specific phase (1-18) when building features from the roadmap

## Interaction Boundaries
- Stay within the ComedyCountry codebase scope
- For infrastructure changes (Vercel config, GitHub Actions), explain impact before applying
- For schema migrations, always show the migration SQL before running
- For Stripe or payment changes, flag for manual review
