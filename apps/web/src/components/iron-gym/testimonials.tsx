'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Review {
  name: string;
  text: string;
  stars: number;
}

const INITIAL_REVIEWS: Review[] = [
  {
    name: 'Kerry Rohan',
    stars: 5,
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    name: 'Kerry Rohan',
    stars: 4,
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    name: 'Kerry Rohan',
    stars: 5,
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
];

export function IronGymTestimonials() {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    if (!name.trim()) {
      setError('Ingresa tu nombre y apellido');
      return;
    }
    if (stars === 0) {
      setError('Selecciona una calificación');
      return;
    }
    if (!description.trim()) {
      setError('Escribe una descripción');
      return;
    }

    setReviews((prev) => [{ name: name.trim(), text: description.trim(), stars }, ...prev]);
    setName('');
    setDescription('');
    setStars(0);
    setOpen(false);
  };

  return (
    <section id="testimonials" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-6">
          <div>
            <p className="text-[#9e9e9e] font-medium text-lg">Reviews</p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-bold text-[#424242]"
            >
              Your Opinions
            </motion.h2>
          </div>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setOpen(true)}
            className="px-6 py-3 rounded-md bg-[#212121] text-white text-sm font-semibold hover:bg-[#424242] transition-colors shrink-0"
          >
            + Your Opinions
          </motion.button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <motion.div
              key={`${r.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#212121] flex items-center justify-center text-white font-semibold shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#424242]">{r.name}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s < r.stars ? 'fill-[#424242] text-[#424242]' : 'fill-[#e0e0e0] text-[#e0e0e0]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#757575] leading-relaxed">{r.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span className="w-2 h-2 rounded-full bg-[#e0e0e0]" />
            <span className="w-2 h-2 rounded-full bg-[#e0e0e0]" />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#424242] hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#424242] flex items-center justify-center text-white hover:bg-[#212121] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-6 right-6 text-[#9e9e9e] hover:text-[#424242] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-[#424242]">Tu opinión</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Nombre y apellido
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full h-11 px-3 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Calificación
                </label>
                <div
                  className="flex gap-1"
                  onMouseLeave={() => setHoverStars(0)}
                >
                  {Array.from({ length: 5 }).map((_, s) => {
                    const value = s + 1;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStars(value)}
                        onMouseEnter={() => setHoverStars(value)}
                        aria-label={`${value} estrella${value > 1 ? 's' : ''}`}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            value <= (hoverStars || stars)
                              ? 'fill-[#FFB300] text-[#FFB300]'
                              : 'fill-[#e0e0e0] text-[#e0e0e0]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos tu experiencia..."
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] resize-none focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-md bg-[#212121] text-white font-semibold hover:bg-[#424242] transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
