import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "Promptstudio test/" keeps its own lockfile, so Next sees two and has to guess
  // which directory is the workspace root. Pin it — a wrong guess changes which
  // files get traced into the production bundle.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Poster Studio reads its brand assets off disk via process.cwd(), so each route
  // must declare the folders it opens or they get dropped from the serverless
  // bundle. Declared per-route rather than as one "Poster Design/**" glob so each
  // function carries as little as possible.
  //
  // Note: these reads use variable path segments (category.folder / .file), so
  // Next's tracer can't resolve them statically and also pulls in the whole tree
  // for /api/generate-poster-image (~80 MB — within Vercel's 250 MB function
  // limit, just wasteful). outputFileTracingExcludes is NOT the fix: it cancels
  // the tracer's dynamic glob wholesale and ships that route with zero assets,
  // which 404s at runtime. To actually shrink it, downscale the source files in
  // "Poster Design/Recent Made posters" (13 files, 46 MB) — they are only ever
  // used downscaled to <=1600x2200 or as small thumbnails.
  outputFileTracingIncludes: {
    // Bundle the setup SQL with the admin route so the Setup tab can serve it on Vercel.
    "/api/admin/setup-check": ["./supabase/api-keys.sql"],
    // Attaches the locked approved poster to the concept call.
    "/api/generate-poster": ["./Poster Design/Recent Made posters/**/*"],
    // Crops the 3 category style references for the image model.
    "/api/generate-poster-image": [
      "./Poster Design/Mixed Media/**/*",
      "./Poster Design/style 2 Glassmorphism/**/*",
      "./Poster Design/style 3 illustrative/**/*",
    ],
    // Streams the official brand marks to the editor and the export canvas.
    "/api/poster-logo": ["./Poster Design/Logos/**/*"],
    // Serves reference-poster thumbnails to the form and output panels.
    "/api/poster-reference": ["./Poster Design/Recent Made posters/**/*"],
  },
}

export default nextConfig
