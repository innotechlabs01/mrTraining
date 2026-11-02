-- Migration 021: running workout route support.
-- Adds gps_route (encoded polyline / GeoJSON LineString) to both the template
-- exercises and the assigned workout exercises so a coach can define a running
-- route in the builder, carry it through assignment, and the athlete can view
-- and follow it on a map.

ALTER TABLE workout_template_exercises ADD COLUMN gps_route TEXT;
ALTER TABLE workout_exercises ADD COLUMN gps_route TEXT;