import Image from "next/image";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/wc-hero.png"
      alt="Wealth Creators"
      width={2899}
      height={1551}
      priority={priority}
      className={className}
    />
  );
}
