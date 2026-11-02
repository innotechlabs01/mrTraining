export type ChallengeData = {
  id: string;
  title: string;
  description: string;
  exercise_type: string;
  video_url?: string;
  end_date: string;
  scoring_type: string;
  status: string;
  coach_id: string;
  difficulty_level?: string;
  max_attempts: number;
  target_sets?: number;
  target_reps?: number;
};

export type ChallengeAttempt = {
  id: string;
  attempt_number: number;
  form_score?: number;
  depth_score?: number;
  alignment_score?: number;
  tempo_score?: number;
  sets_completed: number;
  reps_completed: number;
  total_volume?: number;
  status: string;
  created_at: string;
  completed_at?: string;
};

export type LeaderboardEntry = {
  rank: number;
  athlete_id: string;
  athlete_name: string;
  best_score: number;
  attempts: number;
};

export type ChallengeResponse = {
  challenge: ChallengeData;
  attempts: ChallengeAttempt[];
  stats: {
    total_attempts: number;
    unique_athletes: number;
    avg_form_score: number;
    best_form_score: number;
  };
  leaderboard: LeaderboardEntry[];
};
