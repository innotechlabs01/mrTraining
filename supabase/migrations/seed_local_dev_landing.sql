-- seed_local_dev_landing.sql — datos de prueba para la landing pública (solo local)
-- Idempotente: IDs fijos + ON CONFLICT DO NOTHING.

INSERT INTO plans (id, coach_id, name, description, price, currency, billing_period,
  max_athletes, max_sessions_per_week, is_active, athlete_count, trm,
  discount_type, discount_value, discount_label)
VALUES
  ('plan-seed-starter', 'coach-001', 'Plan Starter', 'Ideal para coaches que empiezan: hasta 25 atletas, sesiones básicas y soporte por email.',
    29.0, 'USD', 'monthly', 25, 12, 1, 0, 4120.0, '', 0, ''),
  ('plan-seed-pro', 'coach-001', 'Plan Pro', 'Para academias en crecimiento: hasta 50 atletas, nutrición integrada y reportes avanzados.',
    59.0, 'USD', 'monthly', 50, 20, 1, 0, 4120.0, 'percentage', 10, '10% OFF primer mes'),
  ('plan-seed-elite', 'coach-001', 'Plan Elite', 'Academia completa: atletas ilimitados, coach multi-sede y soporte prioritario.',
    99.0, 'USD', 'monthly', 100, 30, 1, 0, 4120.0, '', 0, ''),
  ('plan-seed-hidden', 'coach-001', 'Plan Oculto (borrador)', 'Plan desactivado — no debe aparecer en la landing pública.',
    199.0, 'USD', 'monthly', 200, 40, 0, 0, 4120.0, '', 0, '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO testimonials (id, coach_id, name, role, text, stars, is_published)
VALUES
  ('testi-seed-1', 'coach-001', 'Camila Restrepo', 'Coach de natación', 'Antes llevaba mi agenda en un cuaderno. Con MR Training gestiono 40 atletas, cobro membresías y todo queda registrado. Duplicé mi facturación en 4 meses.', 5, true),
  ('testi-seed-2', 'coach-001', 'Andrés Toro', 'Coach de triatlón', 'Lo mejor es el feedback directo del atleta y las métricas. Cambié el plan de un atleta viernes por la noche y el lunes ya tenía la sesión nueva en el teléfono.', 5, true),
  ('testi-seed-3', 'coach-001', 'Sofía Mejía', 'Personal trainer', 'Cobrar dejo de ser un dolor de cabeza. La plataforma cobra por mí y me avisa quien pagó y quien no. Tengo mi tiempo de vuelta para diseñar entrenamientos.', 4, true)
ON CONFLICT (id) DO NOTHING;
