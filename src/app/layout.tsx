import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BootstrapInit } from "@/components/bootstrap-init";
import { AuthProvider } from "@/components/auth-provider";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "EOS Master - Hệ điều hành Doanh nghiệp",
  description: "Hệ thống quản trị doanh nghiệp thông minh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${robotoCondensed.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <BootstrapInit />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
