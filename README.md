# TrapFeed

TrapFeed is a premium hip-hop video publishing platform built with Next.js 16. The checked-in UI currently uses local fixtures while the persisted content platform is introduced behind a reviewed database contract.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copy `.env.example` to `.env.local` before connecting a Supabase project.

## Backend

The proposed Supabase schema and row-level security policies live in `supabase/migrations`. See [`docs/architecture.md`](docs/architecture.md) for ownership boundaries and the gated rollout plan. Apply migrations to a disposable Supabase branch first:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase gen types typescript --linked > src/types/database.generated.ts
```

Do not connect application queries until the generated types reflect the successfully applied schema.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Next.js documentation

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
