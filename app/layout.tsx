import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PhoneFrame from "@/components/PhoneFrame";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import DemoGuide from "@/components/DemoGuide";
import AutoSync from "@/components/AutoSync";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MedVision",
  description: "Oral lesion surveillance for frontline health workers",
};

export const viewport: Viewport = { themeColor: "#0C8C8C" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <RegisterSW />
        <AutoSync />
        <PhoneFrame nav={<BottomNav />}>
          {children}
          <DemoGuide />
        </PhoneFrame>
      </body>
    </html>
  );
}
