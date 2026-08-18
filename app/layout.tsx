import type { Metadata } from "next";
import { Nanum_Myeongjo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-display",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "웹소설 훈련",
  description: "웹소설 초보를 위한 글쓰기 훈련 앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${nanumMyeongjo.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
