import type { Metadata } from "next";
import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "RSS Public School — School Management System",
  description: "RSS Public School is a complete School Management System — manage students, fees, attendance, exams, transport and parent communication. Register your school today.",
  keywords: "RSS Public School, School ERP, School Management System, student portal, fee management, school software",
  openGraph: {
    title: "RSS Public School — School Management System",
    description: "Complete School Management System — RSS Public School Portal",
    type: "website",
  },
};

import { AntiScreenshot } from '@/components/AntiScreenshot';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body suppressHydrationWarning>
        <AntiScreenshot />
        {children}
      </body>
    </html>
  );
}
