import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Generated once at build time (this project is a static export, so there's no per-request
// cost) rather than hand-designed in an image editor. Uses the real brand icon asset — see
// public/brand/TinyUtilities_icon.jpeg — unmodified, not a redrawn or invented logo.
export const runtime = "nodejs";
export const dynamic = "force-static";
export const alt = "TinyUtility — free, privacy-first browser tools for images, PDFs, and text";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const iconPath = join(process.cwd(), "public", "brand", "TinyUtilities_icon.jpeg");
  const iconDataUrl = `data:image/jpeg;base64,${readFileSync(iconPath).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0f24 0%, #060816 55%, #05070f 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            left: 160,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(79, 70, 229, 0.30)",
            filter: "blur(110px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: 100,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(6, 182, 212, 0.24)",
            filter: "blur(110px)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse's satori renderer
            only understands plain <img>; next/image isn't valid here. */}
        <img
          alt=""
          height={168}
          src={iconDataUrl}
          style={{ borderRadius: "50%" }}
          width={168}
        />
        <div
          style={{
            marginTop: 34,
            fontSize: 78,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          TinyUtility
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: "#a5b4d9",
            fontWeight: 500,
          }}
        >
          Free, privacy-first browser tools
        </div>
      </div>
    ),
    { ...size },
  );
}
