import { homeGalleryImages } from "@/lib/gallery";

export function PhotoGallery({
  title = "Feed premium DA MAFIA",
  subtitle = "Importados, perfumes, jerseys e acessorios com visual street luxury.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="container mx-auto px-4 lg:px-8 py-20">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Instagram</p>
        <h2 className="font-display text-4xl lg:text-5xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
      </div>

      <div className="photo-gallery-grid">
        {homeGalleryImages.map((src, index) => (
          <article key={src} className="photo-gallery-card">
            <img src={src} alt={`Produto premium DA MAFIA ${index + 1}`} loading="lazy" />
          </article>
        ))}
      </div>
    </section>
  );
}
