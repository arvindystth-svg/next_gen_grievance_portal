import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI CPGRAMS Local — Bengaluru Citizen Grievance Portal",
  description:
    "File municipal grievances for BBMP, BWSSB, and BESCOM services in Bengaluru. AI-powered intake, deduplication, and instant routing to the right department.",
  keywords: "CPGRAMS, BBMP, grievance, Bengaluru, citizen portal, municipal complaints",
  openGraph: {
    title: "AI CPGRAMS Local — Bengaluru Citizen Grievance Portal",
    description: "AI-powered civic grievance redressal for Bengaluru citizens",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full bg-slate-100 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
