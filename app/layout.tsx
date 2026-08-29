import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next-Gen National Grievance Portal",
  description:
    "File civic grievances with AI-powered intake, deduplication, and instant routing to the right department — anywhere in India.",
  keywords: "CPGRAMS, grievance portal, citizen portal, national grievance, India, complaints",
  openGraph: {
    title: "Next-Gen National Grievance Portal",
    description: "AI-powered civic grievance redressal for citizens across India",
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
