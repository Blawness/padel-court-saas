import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { site } from "@/lib/site";
import { Providers } from "@/components/providers";
import { ScrollProgress } from "@/components/scroll-progress";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  /**
   * Every relative URL below (canonical, OG image, manifest) is resolved against this, so it
   * must be the real public origin in production — set NEXT_PUBLIC_APP_URL on the deployment
   * or the share cards will point at localhost.
   */
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    // Pages set a bare title ("Cari Venue") and get the brand appended for free.
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: site.name,
  category: "sports",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: "/",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Indonesian phone numbers in venue listings would otherwise be auto-linked by iOS Safari.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Tints the browser chrome on mobile; follows the theme the user actually has applied.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: site.ink },
  ],
  colorScheme: "light dark",
};

/** Applies the saved theme before first paint so dark mode never flashes. */
const themeScript = `try{var d=localStorage.getItem('pb-theme')==='dark';document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${jakarta.variable} ${sora.variable} dark:bg-ink bg-gray-50 text-gray-900 antialiased transition-colors dark:text-gray-100`}
      >
        <ScrollProgress />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
