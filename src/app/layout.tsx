import type { Metadata } from "next";
import { IM_Fell_English, Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Preloader } from "@/components/Preloader";
import { Entity } from "@/components/Entity";
import { LiquidCursor } from "@/components/LiquidCursor";
import "./globals.css";

// display: type cut in the 1670s, when mezzotint ("la maniere noire", printing from black) was new
const serif = IM_Fell_English({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// everything small: labels, buttons, body copy
const sans = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Noir · Every piece begins as one drop of black",
  description: "A concept site for a made-up luxury house, where one drop of black liquid becomes a car, a watch, a ring and a jet.",
};

// Restore the theme the visitor last chose (first visit begins in silence: light), before paint so
// a refresh never flashes the wrong theme. Also marks the page as loading.
const boot = `(function(){var d=document.documentElement,t='light';d.classList.add('is-loading');try{if(localStorage.getItem('theme')==='dark')t='dark'}catch(e){}d.dataset.theme=t})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <ThemeProvider>
          <Preloader />
          <SmoothScroll />
          <Entity />
          {children}
          <div className="grain" aria-hidden />
          <LiquidCursor />
        </ThemeProvider>
      </body>
    </html>
  );
}
