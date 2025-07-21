import { Suspense } from "react";
import "./globals.css";
import ForceLangWrapper from "./ForceLangWrapper";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

// Use fallback fonts when Google Fonts is unavailable
const fontFallbacks = {
  geistSans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  geistMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  cairo: '"Segoe UI", Tahoma, Arial, "Noto Sans Arabic", sans-serif'
};

export const metadata = {
  title: "Taheel Platform",
  description: "Taheel Platform - Government Services Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Geist:wght@400;700;900&family=Geist+Mono:wght@400;700;900&display=swap" 
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ 
          fontFamily: fontFallbacks.cairo,
          '--font-geist-sans': fontFallbacks.geistSans,
          '--font-geist-mono': fontFallbacks.geistMono,
          '--font-cairo': fontFallbacks.cairo
        }}
      >
        <GoogleReCaptchaProvider
          reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          scriptProps={{ async: true, defer: true }}
        >
          <Suspense fallback={null}>
            <ForceLangWrapper defaultLang="ar" />
          </Suspense>
          {children}
        </GoogleReCaptchaProvider>
      </body>
    </html>
  );
}