import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Aplikasi Saya",
    short_name: "Aplikasi",
    description: "Aplikasi berbasis website",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/logo gun 192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo gun 512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}