# Life Dashboard (Personal Admin Panel)

Admin-panel style personal “portfolio” you can use for life:

- Daily tracker
- Money management
- Things bought + expiry tracking
- Important document storage (Supabase Storage)
- Reminders
- Birthdays
- Encrypted vault for keys/passwords (encrypted in browser; DB stores ciphertext only)

## Local setup

1) Install deps

```bash
npm install
```

2) Create a Supabase project (free)

- Create a project in Supabase
- Open SQL Editor and run `supabase/schema.sql`
- Create a Storage bucket named `documents`

3) Add env vars

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Free hosting (recommended)

- **Database/Auth/Storage**: Supabase free tier
- **Website**: Vercel free tier

In Vercel, set the same env vars as `.env.local`.
