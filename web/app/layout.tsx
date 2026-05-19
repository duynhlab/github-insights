import "./globals.css";
import type { ReactNode } from "react";
import { Fira_Sans, Fira_Code } from "next/font/google";

const sans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const mono = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata = {
  title: "duynhlab — GitHub Insights",
  description: "Engineering insights for the duynhlab org",
};

// Avoid theme flash by setting the dark class before paint.
const themeInit = `
(function(){try{
  var t=localStorage.getItem('theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.classList.add('dark');}
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
