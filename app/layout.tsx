import type { Metadata } from "next";
import { LOCALE_STORAGE_KEY, LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Academic Affairs — School Admin",
  description: "Academic Affairs portal — curriculum, grade matrices, and scheduling",
};

// Applied before first paint so Arabic sessions never flash an LTR layout.
const localeScript = `try{var d=document.documentElement,p;try{p=localStorage.getItem("${LOCALE_STORAGE_KEY}")}catch(e){}if(p!=="ar"&&p!=="en"){p=navigator.language&&navigator.language.indexOf("ar")===0?"ar":"en";}d.lang=p;d.dir=p==="ar"?"rtl":"ltr";}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <head>
        <template dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
