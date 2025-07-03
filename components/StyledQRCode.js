import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

export default function StyledQRCode({
  value = "",
  logo = "/logo-transparent-large.png",
  size = 140
}) {
  const ref = useRef(null);

  useEffect(() => {
    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: "svg",
      data: value,
      image: logo,
      dotsOptions: {
        color: "#22304a",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 0, // صفر ليصبح اللوجو أكبر ما يمكن
        imageSize: 0.42, // الأكبر الممكن عمليًا قبل أن تتأثر القراءة
        hideBackgroundDots: true,
      },
      cornersSquareOptions: {
        gradient: {
          type: "linear",
          rotation: 0,
          colorStops: [
            { offset: 0, color: "#EF3340" },   // أحمر
            { offset: 0.33, color: "#009639" },// أخضر
            { offset: 0.66, color: "#000000" },// أسود
            { offset: 1, color: "#FFFFFF" }    // أبيض
          ]
        },
        type: "extra-rounded",
      },
      cornersDotOptions: {
        gradient: {
          type: "linear",
          rotation: 90,
          colorStops: [
            { offset: 0, color: "#EF3340" },
            { offset: 0.5, color: "#009639" },
            { offset: 1, color: "#000000" }
          ]
        },
        type: "dot"
      }
    });

    const currentRef = ref.current;
    if (currentRef) {
      currentRef.innerHTML = "";
      qrCode.append(currentRef);
    }

    return () => {
      if (currentRef) currentRef.innerHTML = "";
    };
  }, [value, logo, size]);

  return (
    <div ref={ref} style={{ width: size, height: size }} />
  );
}