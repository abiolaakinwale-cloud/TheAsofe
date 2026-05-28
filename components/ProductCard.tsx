import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Brand, type Product } from "@/lib/data";

type Props = {
  product: Product;
  brand?: Brand;
  size?: "default" | "tall" | "square";
};

export default function ProductCard({ product, brand, size = "default" }: Props) {
  const aspect = size === "tall" ? "aspect-[3/4]" : size === "square" ? "aspect-square" : "aspect-[4/5]";

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className={`relative overflow-hidden ${aspect} mb-4`} style={{ backgroundColor: "var(--color-cream)" }}>
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover product-image"
        />
        {product.newArrival && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
          >
            New
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1 truncate" style={{ color: "var(--color-muted)" }}>{brand?.name}</p>
          <p className="serif text-base lg:text-[1.05rem] leading-snug truncate" style={{ color: "var(--color-ink)" }}>
            {product.name}
          </p>
        </div>
        <p className="text-sm tabular-nums whitespace-nowrap" style={{ color: "var(--color-ink-soft)" }}>
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
