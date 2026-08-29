import type { Metadata } from "next";
import { Toaster } from "sonner";
import AuthInitializer from "./components/auth-initializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "order-flow-microservices",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthInitializer>
          {children}
          <Toaster position="bottom-right" richColors />
        </AuthInitializer>
      </body>
    </html>
  );
}
