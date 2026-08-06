-- Seed test data for QA testing

-- Dashboard metrics
INSERT OR REPLACE INTO dashboard_metrics (id, coach_id, monthly_revenue, revenue_trend, active_athletes, athlete_trend, new_athletes_this_month, new_athlete_trend, pending_payments, pending_payment_count, overdue_payment_count, today_sessions, today_sessions_completed, upcoming_events, revenue_goal, new_athletes_goal, streak_days, best_streak) VALUES ('dm-001', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 45000, 12, 28, 8, 5, 25, 3200, 4, 1, 12, 9, 3, 60000, 10, 23, 23);

-- Plans
INSERT OR REPLACE INTO plans (id, name, description, price, currency, billing_period, max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id) VALUES ('plan-001', 'Starter', 'Accede a funcionalidades esenciales', 49.99, 'USD', 'monthly', 10, 12, 1, 0, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO plans (id, name, description, price, currency, billing_period, max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id) VALUES ('plan-002', 'Pro', 'Lleva tu entrenamiento al siguiente nivel', 99.99, 'USD', 'monthly', 25, 20, 1, 0, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO plans (id, name, description, price, currency, billing_period, max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id) VALUES ('plan-003', 'Elite', 'La experiencia completa de coaching', 199.99, 'USD', 'monthly', 50, 30, 1, 0, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');

-- Plan training modes
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-001', 'gym');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-001', 'crossfit');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-002', 'gym');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-002', 'running');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-002', 'swimming');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-003', 'gym');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-003', 'running');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-003', 'cycling');
INSERT OR REPLACE INTO plan_training_modes (plan_id, mode) VALUES ('plan-003', 'tennis');

-- Plan features
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-001', 'plan-001', 'Acceso basico a workouts', 0);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-002', 'plan-001', 'Dashboard de progreso', 1);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-003', 'plan-001', 'Notificaciones por email', 2);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-004', 'plan-002', 'Todo en Starter', 0);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-005', 'plan-002', 'Programas personalizados', 1);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-006', 'plan-002', 'Soporte prioritario', 2);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-007', 'plan-002', 'Analiticas avanzadas', 3);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-008', 'plan-002', 'Planes nutricionales', 4);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-009', 'plan-003', 'Todo en Pro', 0);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-010', 'plan-003', 'Coaching 1:1', 1);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-011', 'plan-003', 'Recuperacion y readiness', 2);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-012', 'plan-003', 'Eventos exclusivos', 3);
INSERT OR REPLACE INTO plan_features (id, plan_id, feature, sort_order) VALUES ('pf-013', 'plan-003', 'API access', 4);

-- Revenue history
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-001', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Ene', 42300);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-002', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Feb', 38700);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-003', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Mar', 45100);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-004', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Abr', 39800);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-005', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'May', 46500);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-006', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Jun', 48900);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-007', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Jul', 51000);
INSERT OR REPLACE INTO revenue_history (id, coach_id, month, amount) VALUES ('rh-008', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Ago', 45300);

-- Plan distribution
INSERT OR REPLACE INTO plan_distribution (id, coach_id, plan_name, athletes, revenue, color) VALUES ('pd-001', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Starter', 12, 599.88, 'bg-blue-500');
INSERT OR REPLACE INTO plan_distribution (id, coach_id, plan_name, athletes, revenue, color) VALUES ('pd-002', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Pro', 10, 999.90, 'bg-brand-primary');
INSERT OR REPLACE INTO plan_distribution (id, coach_id, plan_name, athletes, revenue, color) VALUES ('pd-003', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'Elite', 6, 1199.94, 'bg-purple-500');

-- Recent activity
INSERT OR REPLACE INTO recent_activity (id, coach_id, icon, text, time) VALUES ('ra-001', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'user', 'Nuevo atleta: Valeria Ochoa', 'Hace 10 min');
INSERT OR REPLACE INTO recent_activity (id, coach_id, icon, text, time) VALUES ('ra-002', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'event', 'Evento: CrossFit Open 2026', 'Hace 2 horas');
INSERT OR REPLACE INTO recent_activity (id, coach_id, icon, text, time) VALUES ('ra-003', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'payment', 'Pago recibido de Ana Gutierrez', 'Hace 3 horas');
INSERT OR REPLACE INTO recent_activity (id, coach_id, icon, text, time) VALUES ('ra-004', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 'trend', 'Luis Ramirez: PR en snatch', 'Hace 5 horas');

-- Athletes
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery) VALUES ('ath-001', 'Carlos Mendoza', 'gym', 'carlos@test.com', '555-1001', 'Starter', 49.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 85, 7.2, 68, 72);
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery) VALUES ('ath-002', 'Ana Gutierrez', 'running', 'ana@test.com', '555-1002', 'Pro', 99.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 92, 8.1, 72, 88);
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery, flag_severity, flag_message) VALUES ('ath-003', 'Luis Ramirez', 'crossfit', 'luis@test.com', '555-1003', 'Elite', 199.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 62, 5.5, 42, 55, 'high', 'Rendimiento bajo esta semana');
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery) VALUES ('ath-004', 'Maria Torres', 'swimming', 'maria@test.com', '555-1004', 'Starter', 49.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 78, 7.0, 58, 65);
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery, flag_severity, flag_message) VALUES ('ath-005', 'Pedro Vega', 'gym', 'pedro@test.com', '555-1005', 'Pro', 99.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 45, 4.8, 35, 42, 'high', 'Riesgo de abandono detectado');
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery, flag_severity, flag_message) VALUES ('ath-006', 'Sofia Rios', 'cycling', 'sofia@test.com', '555-1006', 'Starter', 49.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 55, 6.1, 44, 50, 'medium', 'Asistencia inconsistente');
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery) VALUES ('ath-007', 'Diego Herrera', 'gym', 'diego@test.com', '555-1007', 'Pro', 99.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 88, 7.8, 75, 80);
INSERT OR REPLACE INTO coach_athletes (id, name, sport, email, phone, plan_name, plan_price, coach_id, readiness_score, sleep, hrv, recovery, flag_severity, flag_message) VALUES ('ath-008', 'Valeria Ochoa', 'tennis', 'valeria@test.com', '555-1008', 'Elite', 199.99, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm', 48, 5.2, 38, 40, 'high', 'Sobreentrenamiento detectado');

-- Products
INSERT OR REPLACE INTO products (id, name, brand, price, received, gross, stock, low_stock_threshold, coach_id) VALUES ('prod-001', 'Proteina Whey', 'Optimum', 45.99, 35.50, 10.49, 25, 5, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO products (id, name, brand, price, received, gross, stock, low_stock_threshold, coach_id) VALUES ('prod-002', 'Creatina', 'MyProtein', 29.99, 22.00, 7.99, 40, 5, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO products (id, name, brand, price, received, gross, stock, low_stock_threshold, coach_id) VALUES ('prod-003', 'BCAA 2:1:1', 'Scitec', 34.99, 26.00, 8.99, 15, 5, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO products (id, name, brand, price, received, gross, stock, low_stock_threshold, coach_id) VALUES ('prod-004', 'Pre-Workout', 'C4', 39.99, 30.00, 9.99, 3, 5, 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');

-- Sales
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-001', 'prod-001', 'Proteina Whey', 'Optimum', 2, 45.99, 35.50, 91.98, '2026-08-06', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-002', 'prod-002', 'Creatina', 'MyProtein', 1, 29.99, 22.00, 29.99, '2026-08-06', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-003', 'prod-004', 'Pre-Workout', 'C4', 1, 39.99, 30.00, 39.99, '2026-08-05', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-004', 'prod-001', 'Proteina Whey', 'Optimum', 3, 45.99, 35.50, 137.97, '2026-08-05', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-005', 'prod-003', 'BCAA 2:1:1', 'Scitec', 2, 34.99, 26.00, 69.98, '2026-08-04', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-006', 'prod-001', 'Proteina Whey', 'Optimum', 1, 45.99, 35.50, 45.99, '2026-08-04', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-007', 'prod-002', 'Creatina', 'MyProtein', 2, 29.99, 22.00, 59.98, '2026-08-03', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES ('sal-008', 'prod-004', 'Pre-Workout', 'C4', 1, 39.99, 30.00, 39.99, '2026-08-02', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');

-- Events
INSERT OR REPLACE INTO events (id, title, date, time, end_time, type, modality, status, coach_id) VALUES ('evt-001', 'HIIT Challenge', '2026-08-10', '07:00', '08:30', 'training', 'presencial', 'scheduled', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO events (id, title, date, time, end_time, type, modality, status, coach_id) VALUES ('evt-002', 'Running Club', '2026-08-14', '06:30', '08:00', 'running', 'outdoor', 'scheduled', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO events (id, title, date, time, end_time, type, modality, status, coach_id) VALUES ('evt-003', 'Strength Workshop', '2026-08-18', '17:00', '18:30', 'workshop', 'virtual', 'scheduled', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
INSERT OR REPLACE INTO events (id, title, date, time, end_time, type, modality, status, coach_id) VALUES ('evt-004', 'Mobility Flow', '2026-08-22', '09:00', '10:00', 'recovery', 'presencial', 'scheduled', 'user_2vEHh22QRXgNfIPa7KBtt1Bl4dm');
