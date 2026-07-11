import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function GalleryPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-4">Gallery</h1>
        <p className="text-lg text-white/70 mb-12 max-w-2xl">Screenshots, athlete transformations, and platform highlights.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <span className="text-white/40">Image {i + 1}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-white/50">Real screenshots coming soon. The platform speaks for itself.</p>
      </section>
      <IronGymFooter />
    </main>
  );
}