"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import Image from "next/image";

function GlobalLoader() {
  return (
    <div className="taheel-loader-root">
      <div className="global-bg"></div>
      <div className="bokeh b1"></div>
      <div className="bokeh b2"></div>
      <div className="bokeh b3"></div>
      
      {/* Sparkle/وميض فوق الشعار */}
      <div className="sparkle"></div>
      <div className="sparkle sparkle2"></div>
      
      {/* Glow خلف الشعار */}
      <div className="flared-glow"></div>

      <div className="taheel-logo-layer">
        {/* Sweep Shine */}
        <div className="light-sweep" />
        <Image
          src="/taheel-loader-3d.png"
          alt="Taheel Logo"
          width={340}
          height={340}
          className="taheel-logo-img"
          priority
        />
        <div className="taheel-loader-bar">
          <div className="taheel-loader-bar-inner"></div>
        </div>
      </div>

      <div className="taheel-slogan-ar">منصة تأهيل... حيث يبدأ المستقبل</div>
      <div className="taheel-slogan-en">Taheel Platform... Where the future begins</div>

      <style jsx>{`
        .taheel-loader-root {
          position: fixed;
          inset: 0;
          width: 100vw; height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 100000;
          font-family: 'Cairo', 'Noto Kufi Arabic', 'Segoe UI', sans-serif;
          direction: rtl;
        }
        .global-bg {
          position: absolute;
          width: 100vw; height: 100vh; inset: 0;
          background: linear-gradient(120deg, #0e172a 0%, #122b3a 70%, #12475b 100%);
          box-shadow: inset 0 -60px 90px rgba(0, 0, 0, 0.3);
          z-index: 0;
        }
        .bokeh {
          position: absolute;
          border-radius: 50%;
          opacity: 0.18;
          filter: blur(28px) brightness(0.9);
          mix-blend-mode: lighten;
          pointer-events: none;
          z-index: 2;
        }
        .b1 { width: 180px; height: 180px; top: 25%; left: 32%; background: #10b981; animation: bokehMove1 7s infinite alternate; }
        .b2 { width: 110px; height: 110px; top: 68%; left: 58%; background: #facc15; animation: bokehMove2 6s infinite alternate; }
        .b3 { width: 130px; height: 130px; top: 40%; left: 72%; background: #60a5fa; animation: bokehMove3 9s infinite alternate; }

        /* Sparkle/وميض */
        .sparkle, .sparkle2 {
          position: absolute;
          pointer-events: none;
          border-radius: 50%;
          z-index: 11;
          opacity: 0.67;
          mix-blend-mode: lighten;
          background: radial-gradient(circle, #fffbeea6 0%, #fff0 80%);
          filter: blur(2.5px) brightness(1.6);
          animation: sparkleFlash 2.4s infinite cubic-bezier(.7,0,.3,1);
        }
        .sparkle {
          width: 54px; height: 54px;
          left: 51.5%; top: 44%;
          animation-delay: 0.1s;
        }
        .sparkle2 {
          width: 32px; height: 32px;
          left: 58%; top: 54%;
          animation-delay: 1.2s;
          background: radial-gradient(circle, #fff9 0%, #fff0 78%);
        }

        .flared-glow {
          position: absolute;
          top: 50%; left: 50%;
          width: 320px; height: 320px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #10b981bb 0%, #10b98122 60%, #fff0 100%);
          filter: blur(34px) brightness(1.2);
          opacity: 0.8;
          z-index: 3;
          animation: flarePulse 3.2s infinite alternate ease-in-out;
        }

        .taheel-logo-layer {
          position: relative;
          z-index: 10;
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 32px;
          background: rgba(0,0,0,0.08);
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 48px #10b98144, 0 3px 12px #2226;
          padding: 24px;
          overflow: hidden;
        }
        /* Sweep Shine effect */
        .light-sweep {
          position: absolute;
          z-index: 20;
          left: -60%;
          top: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(120deg, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.17) 50%, rgba(255,255,255,0.05) 70%);
          filter: blur(8px);
          transform: skewX(-24deg);
          animation: sweepShine 2.2s infinite cubic-bezier(.7,0,.3,1);
          pointer-events: none;
        }

        .taheel-logo-img {
          border-radius: 20px;
          width: 200px;
          height: 200px;
          object-fit: contain;
          display: block;
          filter: blur(0.7px) brightness(1.11) contrast(1.13) saturate(1.06);
          animation: scalePulse 3.6s infinite ease-in-out;
        }
        .taheel-loader-bar {
          width: 160px;
          height: 6px;
          border-radius: 6px;
          background: #ffffff22;
          overflow: hidden;
          margin-top: 18px;
        }
        .taheel-loader-bar-inner {
          height: 100%;
          width: 45%;
          background: linear-gradient(to right, #10b981, #059669);
          animation: barMove 1.5s infinite ease-in-out;
        }

        .taheel-slogan-ar, .taheel-slogan-en {
          width: 90vw; max-width: 400px;
          text-align: center;
          font-weight: 500;
          line-height: 1.6;
          letter-spacing: 1.2px;
          z-index: 20;
          opacity: 0;
        }
        .taheel-slogan-ar {
          font-size: 1.5rem;
          color: #10b981;
          margin-bottom: 10px;
          text-shadow: 0 2px 16px #10b98166;
          animation: sloganFadeIn 1s 0.5s forwards;
        }
        .taheel-slogan-en {
          font-size: 1rem;
          color: #d1fae5;
          animation: sloganFadeIn 1s 1.2s forwards;
        }

        /* Animations */
        @keyframes scalePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes barMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(160%); }
        }
        @keyframes sloganFadeIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flarePulse {
          0% { opacity: 0.55; filter: blur(28px) brightness(1); }
          100% { opacity: 0.95; filter: blur(44px) brightness(1.2); }
        }
        @keyframes bokehMove1 {
          0% { top: 25%; left: 32%; }
          100% { top: 28%; left: 37%; }
        }
        @keyframes bokehMove2 {
          0% { top: 68%; left: 58%; }
          100% { top: 71%; left: 63%; }
        }
        @keyframes bokehMove3 {
          0% { top: 40%; left: 72%; }
          100% { top: 43%; left: 68%; }
        }
        @keyframes sparkleFlash {
          0%, 100% { opacity: 0.0; transform: scale(0.2);}
          20% { opacity: 0.84; transform: scale(1.24);}
          80% { opacity: 0.0; transform: scale(0.1);}
        }
        @keyframes sweepShine {
          0% { left: -60%; opacity: 0.0; }
          8% { opacity: 0.07;}
          25% { left: 100%; opacity: 0.15; }
          50% { left: 120%; opacity: 0.0;}
          100% { left: 120%; opacity: 0.0;}
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          .b1, .b2, .b3 { width: 65px !important; height: 65px !important; }
          .taheel-logo-img { width: 85px; height: 85px; border-radius: 12px;}
          .taheel-logo-layer { padding: 12px; border-radius: 14px;}
          .flared-glow { width: 105px; height: 105px;}
          .sparkle { width: 18px; height: 18px;}
          .sparkle2 { width: 11px; height: 11px;}
          .taheel-slogan-ar { font-size: 1.02rem; }
          .taheel-slogan-en { font-size: 0.8rem; }
          .taheel-loader-bar { width: 90px;}
        }
      `}</style>
    </div>
  );
}

function AttendanceSection(props) {
  return (
    <Suspense fallback={null}>
      <AttendanceSectionInner {...props} />
    </Suspense>
  );
}

export { GlobalLoader, AttendanceSection };
export default GlobalLoader;