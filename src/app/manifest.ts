import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SENTINEL",
    short_name: "SENTINEL",
    description: "Memória operacional e inteligência dos seus projetos.",
    start_url: "/",
    display: "standalone",
    background_color: "#202124",
    theme_color: "#202124",
    icons: [
      { src: "/apple-icon", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
