import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriveGuard | Real-Time Driver-State Monitoring Cockpit",
  description:
    "Privacy-first edge-native driver state monitoring prototype evaluating eye closure and head pose cues entirely in local browser memory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
