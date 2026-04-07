import type { Metadata } from "next";
import { Geist_Mono, Sarabun } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
// @ts-expect-error Next.js handles the app-router global CSS side-effect import at build time.
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoboAdvisor | ผู้ช่วยจัดพอร์ตลงทุนอัจฉริยะ",
  description: "วางแผนพอร์ตการลงทุน ติดตามโอกาสในตลาด และปรับสัดส่วนการลงทุนได้อย่างเป็นระบบด้วย RoboAdvisor",
  icons: {
    icon: "/assets/icons/roboadvisor-mark.svg",
    shortcut: "/assets/icons/roboadvisor-mark.svg",
    apple: "/assets/icons/roboadvisor-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Suppress hydration warnings on <html> to avoid errors caused by
    // dev-tools or browser extensions injecting attributes (e.g. CSS vars)
    // that differ between server and client during development.
    <html lang="th" className="dark" suppressHydrationWarning>
      <body
        className={`${sarabun.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
