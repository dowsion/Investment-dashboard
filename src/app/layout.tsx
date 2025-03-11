import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/lexend/700.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Starting Gate Dashboard",
  description: "Create and customize user and team-specific dashboards with support from StartingGate's Customer Success Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lexend.variable} font-sans antialiased min-h-screen bg-gray-50`}>
        <div className="flex flex-col min-h-screen">
          <header className="bg-navy-900 text-white py-6 md:py-10 px-4 md:px-6 relative">
            <div className="container mx-auto max-w-full xl:max-w-[1400px] 2xl:max-w-[1600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="max-w-3xl pr-0 md:pr-24">
                  <h1 className="dashboard-title text-2xl md:text-3xl lg:text-4xl font-bold mb-0 md:mb-2">Starting Gate Dashboard</h1>
                  <p className="dashboard-subtitle text-sm md:text-base text-gray-300">Create and customize user and team-specific dashboards with support from StartingGate's Customer Success Team.</p>
                </div>
                <div className="logo-container text-2xl font-display font-semibold text-white opacity-90 mt-4 md:mt-0">
                  StartingGate
                </div>
              </div>
            </div>
          </header>
          <Navbar />
          <main className="flex-grow py-6 bg-white min-h-[calc(100vh-250px)]">
            <div className="container mx-auto px-4 md:px-6 max-w-full xl:max-w-[1400px] 2xl:max-w-[1600px]">
              {children}
            </div>
          </main>
          <footer className="bg-navy-900 text-white py-4 border-t border-navy-700">
            <div className="container mx-auto px-4 md:px-6 text-center text-sm max-w-full xl:max-w-[1400px] 2xl:max-w-[1600px]">
              <div className="text-gray-400">
                &copy; {new Date().getFullYear()} Starting Gate Fund. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
