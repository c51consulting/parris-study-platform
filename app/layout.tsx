import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Parris Study Platform — Victorian Curriculum & VCE Psychology",
  description:
    "An AI-powered study platform for Year 10 Victorian Curriculum and VCE Psychology Unit 1. Adaptive quizzes, AI tutor, assessment tracking, and progress mastery maps.",
  keywords: [
    "Victorian Curriculum",
    "VCE Psychology",
    "Year 10",
    "study platform",
    "AI tutor",
    "adaptive quizzes",
    "VCAA",
  ],
  openGraph: {
    title: "Parris Study Platform",
    description:
      "AI-powered study platform for Victorian Curriculum and VCE Psychology Unit 1.",
    type: "website",
    locale: "en_AU",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
