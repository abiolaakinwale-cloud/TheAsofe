import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Brand, type Product } from "@/lib/data";
import HeartButton from "./HeartButton";

type Props = {
  product: Product;
  brand?: Brand;
  size?: "default" | "tall" | "square";
  inWishlist?: boolean;
};

export default function ProductCard({ product, brand, size = "default", inWishlist = false }: Props) {
  const aspect = size === "tall" ? "aspect-[3/4]" : size === "square" ? "aspect-square" : "aspect-[4/5]";

  return (
    <div className="group block">
      <div className={`relative overflow-hidden ${aspect} mb-4`} style={{ backgroundColor: "var(--color-cream)" }}>
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover product-image"
          />
        </Link>
        {product.newArrival && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase font-medium z-10"
            style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
          >
            New
          </span>
        )}
        {product.madeToOrder && (
          <span
            className="absolute bottom-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase font-medium z-10"
            style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}
          >
            Made to order
          </span>
        )}
        <HeartButton slug={product.slug} initial={inWishlist} />
      </div>
      <Link href={`/products/${product.slug}`} className="block">
        <div className="space-y-1">
          {brand?.name && (
            <p className="text-[11px] tracking-[0.16em] uppercase font-medium truncate" style={{ color: "var(--color-ink)" }}>
              {brand.name}
            </p>
          )}
          <p className="text-sm leading-snug truncate" style={{ color: "var(--color-ink-soft)" }}>
            {product.name}
          </p>
          <p className="text-sm tabular-nums pt-1" style={{ color: "var(--color-ink)" }}>
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </div>
  );
}
