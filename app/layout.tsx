import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PhoneFrame from "@/components/PhoneFrame";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MedVision",
  description: "Oral lesion surveillance for frontline health workers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <PhoneFrame>
          {children}
          <BottomNav />
        </PhoneFrame>
      </body>
    </html>
  );
}
