import { cn } from "@/lib/cn";

/**
 * The official SENTINEL ribbon mark, rendered as polished electric-blue metal.
 * A restrained vertical float and traveling specular highlight add depth without
 * changing the silhouette. All motion respects the OS reduced-motion setting.
 */
export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <span className={cn("sentinel-metal-mark", animated && "sentinel-metal-mark--animated", className)} aria-hidden="true">
      <svg viewBox="0 0 1254 1254" fill="none" className="sentinel-metal-mark__svg">
        <defs>
          <linearGradient id="sentinel-metal-face" x1="390" y1="300" x2="860" y2="970" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3978D9" />
            <stop offset=".28" stopColor="#174AAB" />
            <stop offset=".58" stopColor="#2464C5" />
            <stop offset="1" stopColor="#103477" />
          </linearGradient>
          <linearGradient id="sentinel-metal-edge" x1="400" y1="300" x2="850" y2="950" gradientUnits="userSpaceOnUse">
            <stop stopColor="#78B7FF" />
            <stop offset=".42" stopColor="#1555D9" />
            <stop offset=".72" stopColor="#061D63" />
            <stop offset="1" stopColor="#4C91FF" />
          </linearGradient>
          <linearGradient id="sentinel-metal-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset=".43" stopColor="#C7E5FF" stopOpacity="0" />
            <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset=".57" stopColor="#9CCEFF" stopOpacity=".12" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <clipPath id="sentinel-ribbon-clip">
            <path d="M767 571 L750 562 L729 555 L689 553 L688 672 L683 691 L672 710 L656 726 L640 736 L616 743 L568 743 L553 746 L530 758 L515 774 L507 790 L503 805 L503 877 L510 897 L526 915 L541 923 L553 926 L576 926 L590 922 L761 832 L781 818 L798 799 L808 780 L814 756 L814 647 L809 624 L802 608 L788 589 Z" />
            <path d="M730 343 L717 336 L703 333 L681 334 L658 343 L484 451 L457 481 L447 501 L441 524 L441 652 L445 667 L452 681 L474 704 L492 714 L513 721 L538 724 L564 724 L565 596 L570 575 L580 557 L594 542 L612 530 L634 523 L689 522 L698 520 L721 508 L737 491 L745 476 L750 456 L750 376 L743 357 Z" />
          </clipPath>
        </defs>
        <g className="sentinel-metal-mark__float">
          <path d="M767 571 L750 562 L729 555 L689 553 L688 672 L683 691 L672 710 L656 726 L640 736 L616 743 L568 743 L553 746 L530 758 L515 774 L507 790 L503 805 L503 877 L510 897 L526 915 L541 923 L553 926 L576 926 L590 922 L761 832 L781 818 L798 799 L808 780 L814 756 L814 647 L809 624 L802 608 L788 589 Z" fill="url(#sentinel-metal-face)" stroke="url(#sentinel-metal-edge)" strokeWidth="5" strokeLinejoin="round" />
          <path d="M730 343 L717 336 L703 333 L681 334 L658 343 L484 451 L457 481 L447 501 L441 524 L441 652 L445 667 L452 681 L474 704 L492 714 L513 721 L538 724 L564 724 L565 596 L570 575 L580 557 L594 542 L612 530 L634 523 L689 522 L698 520 L721 508 L737 491 L745 476 L750 456 L750 376 L743 357 Z" fill="url(#sentinel-metal-face)" stroke="url(#sentinel-metal-edge)" strokeWidth="5" strokeLinejoin="round" />
          <g clipPath="url(#sentinel-ribbon-clip)" className={animated ? "sentinel-metal-mark__shine" : undefined}>
            <rect x="-1254" y="250" width="1254" height="800" fill="url(#sentinel-metal-sheen)" transform="skewX(-24)" />
          </g>
        </g>
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg-strong", className)}>
      <LogoMark className="size-8" />
      <span className="font-display text-[0.8125rem] font-semibold tracking-[0.22em]">SENTINEL</span>
    </span>
  );
}
