import type { ImgHTMLAttributes } from "react";

import darkWordmark from "@/assets/linktery-wordmark-dark.png";
import lightWordmark from "@/assets/linktery-wordmark-light.png";

interface BrandWordmarkProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  tone?: "dark" | "light";
}

export default function BrandWordmark({
  tone = "dark",
  alt = "Linktery",
  draggable = false,
  width = 1200,
  height = 389,
  ...props
}: BrandWordmarkProps) {
  return (
    <img
      src={tone === "light" ? lightWordmark : darkWordmark}
      alt={alt}
      draggable={draggable}
      width={width}
      height={height}
      {...props}
    />
  );
}
