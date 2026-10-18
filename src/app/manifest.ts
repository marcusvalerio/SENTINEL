import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SENTINEL",
    short_name: "SENTINEL",
    description: "Memória operacional e inteligência dos seus projetos.",
    start_url: "/",
    display: "standalone",
    background_color: "#17181d",
    theme_color: "#17181d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
