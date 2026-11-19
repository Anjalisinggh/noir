import type { Metadata } from "next";
import { Bodoni_Moda, Syncopate, Inter_Tight } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Preloader } from "@/components/Preloader";
import { Entity } from "@/components/Entity";
import { LiquidCursor } from "@/components/LiquidCursor";
import "./globals.css";

const serif = Bodoni_Moda({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const wide = Syncopate({
  variable: "--font-wide",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "NOIR — Luxury, Awakened",
  description: "A cinematic concept experience for a fictional ultra-luxury maison, led by a living black liquid.",
};

// Restore the theme the visitor last chose (first visit begins in silence: light), before paint so
// a refresh never flashes the wrong theme. Also marks the page as loading.
const boot = `(function(){var d=document.documentElement,t='light';d.classList.add('is-loading');try{if(localStorage.getItem('theme')==='dark')t='dark'}catch(e){}d.dataset.theme=t})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${wide.variable} ${sans.variable}`} suppressHydrationWarning>
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
