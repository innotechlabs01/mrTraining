CREATE TABLE IF NOT EXISTS landing_content (
  id INTEGER PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO landing_content (id, version, content, updated_at)
VALUES (1, 1, '{
  "version": 1,
  "navLinks": ["Home", "Service", "Trainers", "Testimonial", "Coaching", "Contact Us"],
  "stats": [
    {"value": "20+", "label": "Years of Experience"},
    {"value": "15K+", "label": "Members Join"},
    {"value": "14K+", "label": "Happy Members"}
  ],
  "reasons": [
    {"n": "01", "title": "Personal Training", "copy": "Our gyms offer personalized training sessions with certified personal trainers who create custom workout plans based on your goals."},
    {"n": "02", "title": "Equipment and Facilities", "copy": "Full racks, free weights, and cardio machines, serviced year-round and updated as soon as something wears out."},
    {"n": "03", "title": "Nutrition Counseling", "copy": "One-on-one nutrition guidance that fits your training block, not a generic sheet handed out at sign-up."},
    {"n": "04", "title": "Speciality Programs", "copy": "Powerlifting, bodybuilding prep, and sport-specific conditioning blocks run by coaches who compete themselves."}
  ],
  "trainers": [
    {"name": "Borney Exiteid", "seed": "ig-trainer-1"},
    {"name": "Elsa Windia", "seed": "ig-trainer-2"},
    {"name": "Georege Aryo", "seed": "ig-trainer-3"},
    {"name": "Mika Thornton", "seed": "ig-trainer-4"},
    {"name": "Priya Sharma", "seed": "ig-trainer-5"}
  ],
  "testimonials": [
    {"quote": "I am extremely grateful for the positive impact gym training has had on my life; through consistent training and expert guidance from coaches, I''ve witnessed a remarkable transformation in strength, endurance, and overall fitness.", "name": "Jhony Breaker", "seed": "ig-testi-1"},
    {"quote": "The coaches here don''t let you coast. Every session has a plan, and every plan gets adjusted based on how last week actually went.", "name": "Maria Ortiz", "seed": "ig-testi-2"},
    {"quote": "Six months ago I couldn''t do a single pull-up. The specialty program got me to five clean reps, and I''m still counting.", "name": "Dev Patel", "seed": "ig-testi-3"}
  ],
  "updatedAt": "2026-08-05T00:00:00.000Z"
}', datetime('now'));