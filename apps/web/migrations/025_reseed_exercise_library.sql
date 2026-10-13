-- 025_reseed_exercise_library.sql — T-009.3 (approved by user)
--
-- Repair: the global exercise catalog from 012_seed_exercise_library.sql was
-- never applied to the dev DB, leaving `workout_exercises.library_exercise_id`
-- and `workout_template_exercises.library_exercise_id` references pointing to
-- missing `ex-1..ex-16` rows (orphans → LEFT JOIN NULL → no demo video in
-- mobile).
--
-- Nature: ADDITIVE / INSERT-ONLY / IDEMPOTENT. INSERT OR IGNORE skips rows whose
-- PK (id) or UNIQUE (slug) already exists; zero UPDATEs, zero DELETEs. Safe to
-- run more than once.
--
-- Rollback (manual, if ever needed):
--   DELETE FROM exercise_library WHERE id IN ('ex-1','ex-2','ex-3','ex-4','ex-5','ex-6','ex-7','ex-8','ex-9','ex-10','ex-11','ex-12','ex-13','ex-14','ex-15','ex-16') AND is_custom = 0 AND coach_id IS NULL;
--
-- Verification (must return 0 after applying):
--   SELECT COUNT(*) FROM workout_exercises we
--     LEFT JOIN exercise_library el ON el.id = we.library_exercise_id
--     WHERE we.library_exercise_id IS NOT NULL AND el.id IS NULL;
--   (repeat with workout_template_exercises)
--
-- NOTE: SQLite has no E'' escapes; instructions use literal newlines inside the
-- quoted literals (valid SQLite).

INSERT OR IGNORE INTO exercise_library
  (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles, equipment, difficulty, category, instructions, default_sec, is_custom, coach_id)
VALUES
  ('ex-1','barbell-back-squat','Barbell Back Squat','Compound lower-body movement targeting quads, hamstrings, and glutes.','reps','legs','legs,quads,glutes','','barbell','intermediate','compound','Set bar on upper back
Unrack and step back
Bend knees to parallel
Drive up through heels',NULL,0,NULL),
  ('ex-2','bench-press','Bench Press','Classic upper-body pushing movement.','reps','chest','chest,shoulders,triceps','','barbell','intermediate','compound','Lie on bench, eyes under bar
Grip slightly wider than shoulder
Lower bar to mid-chest
Press up explosively',NULL,0,NULL),
  ('ex-3','deadlift','Deadlift','Full-body pulling movement from the floor.','reps','back','back,hamstrings,glutes,core','','barbell','advanced','compound','Bar over mid-foot
Hinge at hips, grip bar
Drive through floor, bar close to body
Lock out at top',NULL,0,NULL),
  ('ex-4','pull-ups','Pull-Ups','Vertical pulling movement using bodyweight.','reps','back','back,biceps,core','','bodyweight','intermediate','compound','Grip bar shoulder-width
Hang with straight arms
Pull chest to bar
Lower with control',NULL,0,NULL),
  ('ex-5','overhead-press','Overhead Press','Standing shoulder press for total upper-body power.','reps','shoulders','shoulders,triceps,core','','barbell','intermediate','compound','Bar at shoulder height
Grip just outside shoulders
Press overhead, head through
Lock out and lower',NULL,0,NULL),
  ('ex-6','barbell-row','Barbell Row','Horizontal pulling for back thickness.','reps','back','back,biceps','','barbell','intermediate','compound','Hinge forward, bar below knees
Pull bar to lower chest
Squeeze back at top
Lower with control',NULL,0,NULL),
  ('ex-7','dumbbell-lunges','Dumbbell Lunges','Unilateral leg movement for balance and strength.','reps','legs','legs,quads,glutes,hamstrings','','dumbbell','beginner','compound','Hold dumbbells at sides
Step forward into lunge
Both knees to 90 degrees
Drive back to start',NULL,0,NULL),
  ('ex-8','plank','Plank','Core stability hold.','time','core','core','','bodyweight','beginner','isolation','Forearms on floor, elbows under shoulders
Body in straight line
Brace core, hold position
Breathe steadily',60,0,NULL),
  ('ex-9','box-jumps','Box Jumps','Explosive plyometric movement.','reps','legs','legs,quads,glutes,calves','','bodyweight','advanced','compound','Stand facing box
Slight dip and swing arms
Jump up onto box
Step down, repeat',NULL,0,NULL),
  ('ex-10','kettlebell-swings','Kettlebell Swings','Hip-driven explosive movement for power and conditioning.','reps','glutes','glutes,hamstrings,core,shoulders','','kettlebell','intermediate','compound','Feet wider than hips
Hinge back, bell between legs
Thrust hips forward, swing to chest
Let bell drop, hinge again',NULL,0,NULL),
  ('ex-11','dumbbell-bicep-curls','Dumbbell Bicep Curls','Isolation movement for biceps.','reps','arms','biceps','','dumbbell','beginner','isolation','Stand with dumbbells at sides
Curl toward shoulders
Squeeze at top
Lower with control',NULL,0,NULL),
  ('ex-12','tricep-pushdowns','Tricep Pushdowns','Cable isolation for triceps.','reps','arms','triceps','','cable','beginner','isolation','Grip cable bar at chest
Push down until arms straight
Squeeze triceps
Return slowly',NULL,0,NULL),
  ('ex-13','leg-press','Leg Press','Machine-based compound leg movement.','reps','legs','legs,quads,glutes,hamstrings','','machine','beginner','compound','Sit in machine, feet on platform
Release safety handles
Press until legs nearly straight
Return to 90 degrees',NULL,0,NULL),
  ('ex-14','face-pulls','Face Pulls','Rear delt and rotator cuff cable exercise.','reps','shoulders','shoulders,back','','cable','beginner','isolation','Set pulley at upper chest
Grip rope with both hands
Pull toward face, elbows up
Squeeze rear delts',NULL,0,NULL),
  ('ex-15','romanian-deadlift','Romanian Deadlift','Hip-dominant hamstring movement.','reps','legs','hamstrings,glutes,back','','barbell','intermediate','compound','Hold bar at hip height
Hinge back, bar slides down legs
Feel hamstring stretch
Drive hips forward to return',NULL,0,NULL),
  ('ex-16','medicine-ball-slams','Medicine Ball Slams','Full-body power and conditioning movement.','reps','full_body','full_body,core,shoulders,legs','','medicine_ball','intermediate','compound','Stand with feet shoulder-width
Raise ball overhead
Slam ball down as hard as possible
Catch on bounce and repeat',NULL,0,NULL);
