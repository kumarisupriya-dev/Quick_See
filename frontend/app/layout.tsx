import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Quick See - THe Ultimate Academic Co-Pilot",
  description: "Automate your student schedule and checklist with AI Syllabus parsing and crowdsourced peer updates.",
};
export default function RootLayout({
    children, }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
      <body className="min-h-full flex fel-col bg-[var(--background)] text-[var(--foreground)]">
          <Footer />
      </div>
      </html>
  );
}
