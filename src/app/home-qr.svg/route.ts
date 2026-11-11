import { renderHomeQr } from "@/features/home/qr";

// One small file the home's two tag illustrations share, instead of the SVG
// (with its embedded logo) inlined in every copy. Built with the page and
// regenerated with it.
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return new Response(renderHomeQr(process.env.SITE_URL), {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
