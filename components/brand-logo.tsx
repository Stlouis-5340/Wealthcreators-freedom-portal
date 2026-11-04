import Image from "next/image";

export function BrandLogo({
  className,
  priority = false,
  tone = "gold",
}: {
  className?: string;
  priority?: boolean;
  tone?: "gold" | "white";
}) {
  const src = tone === "white" ? "/brand/wcl-logo-white.png" : "/brand/wcl-logo-gold.png";

  return (
    <Image
      src={src}
      alt="Wealth Creators"
      width={647}
      height={160}
      priority={priority}
      className={className}
    />
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    // The crown-and-shield mark is a brand asset, not a content image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/wcl-mark.svg" alt="" width={1090} height={1560} className={className} />
  );
}
