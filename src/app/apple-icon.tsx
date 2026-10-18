import { ImageResponse } from "next/og";

export const size = { width: 1024, height: 1024 };
export const contentType = "image/png";
export const alt = "SENTINEL";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #202124 0%, #111216 100%)",
          borderRadius: 225,
          border: "3px solid rgba(255,255,255,.08)",
        }}
      >
        <svg width="760" height="760" viewBox="300 250 650 750" fill="none">
          <defs>
            <linearGradient id="metal" x1="360" y1="260" x2="690" y2="790" gradientUnits="userSpaceOnUse">
              <stop stopColor="#69A8FF" />
              <stop offset=".28" stopColor="#2563D8" />
              <stop offset=".58" stopColor="#0B36A8" />
              <stop offset=".82" stopColor="#2464D8" />
              <stop offset="1" stopColor="#08256E" />
            </linearGradient>
            <linearGradient id="edge" x1="360" y1="260" x2="680" y2="790" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A6D1FF" />
              <stop offset=".5" stopColor="#397BEE" stopOpacity=".35" />
              <stop offset="1" stopColor="#06194D" stopOpacity=".8" />
            </linearGradient>
          </defs>
          <path d="M767 571 L750 562 L729 555 L689 553 L688 672 L683 691 L672 710 L656 726 L640 736 L616 743 L568 743 L553 746 L530 758 L515 774 L507 790 L503 805 L503 877 L510 897 L526 915 L541 923 L553 926 L576 926 L590 922 L761 832 L781 818 L798 799 L808 780 L814 756 L814 647 L809 624 L802 608 L788 589 Z" fill="url(#metal)" stroke="url(#edge)" strokeWidth="5" strokeLinejoin="round"/>
          <path d="M730 343 L717 336 L703 333 L681 334 L658 343 L484 451 L457 481 L447 501 L441 524 L441 652 L445 667 L452 681 L474 704 L492 714 L513 721 L538 724 L564 724 L565 596 L570 575 L580 557 L594 542 L612 530 L634 523 L689 522 L698 520 L721 508 L737 491 L745 476 L750 456 L750 376 L743 357 Z" fill="url(#metal)" stroke="url(#edge)" strokeWidth="5" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
    { ...size },
  );
}
