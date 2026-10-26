import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#00FF7F",
          colorBackground: "#10121a",
          colorInputBackground: "#0b0c12",
          colorText: "#ffffff",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="bg-[#07090f] text-white antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
