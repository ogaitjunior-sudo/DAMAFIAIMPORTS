export const galleryImages = [
  "/assets/da-mafia/product-perfume-noir.svg",
  "/assets/da-mafia/product-jersey-gold.svg",
  "/assets/da-mafia/product-chain.svg",
  "/assets/da-mafia/product-sneaker.svg",
  "/assets/da-mafia/product-watch.svg",
  "/assets/da-mafia/product-cap.svg",
  "/assets/da-mafia/product-perfume-rosso.svg",
  "/assets/da-mafia/product-jersey-shadow.svg",
];

export const galleryVideos: string[] = [];

export const featuredImages = {
  hero: "/assets/da-mafia/hero-da-mafia-imports.png",
  storeHero: "/assets/da-mafia/product-jersey-gold.svg",
  about: "/assets/da-mafia/logo-da-mafia-imports.svg?v=logo-oficial-20260604",
  bannerOne: "/assets/da-mafia/product-perfume-noir.svg",
  bannerTwo: "/assets/da-mafia/product-sneaker.svg",
  bannerThree: "/assets/da-mafia/product-chain.svg",
};

const imageByKey: Record<string, string> = {
  wood: "/assets/da-mafia/product-jersey-gold.svg",
  gold: "/assets/da-mafia/product-perfume-noir.svg",
  dark: "/assets/da-mafia/product-chain.svg",
};

export const homeGalleryImages = galleryImages;

export function imageFor(value: string | undefined, fallback = featuredImages.hero) {
  if (!value) return fallback;
  if (value.startsWith("/") || value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://")) return value;
  return imageByKey[value] ?? fallback;
}
