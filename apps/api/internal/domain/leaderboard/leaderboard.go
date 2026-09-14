package leaderboard

// GroupLeaderboard represents a group's leaderboard entry.
type GroupLeaderboard struct {
	ID          string `json:"id"`
	GroupID     string `json:"group_id"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name"`
	Points      int    `json:"points"`
	Rank        int    `json:"rank"`
	WeekStart   string `json:"week_start"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// WeeklyLeaderboard represents a global weekly ranking.
type WeeklyLeaderboard struct {
	Rank        int    `json:"rank"`
	AthleteID   string `json:"athlete_id"`
	AthleteName string `json:"athlete_name"`
	Points      int    `json:"points"`
	WeekStart   string `json:"week_start"`
}

// LeaderboardHistory represents a user's historical rankings.
type LeaderboardHistory struct {
	WeekStart string `json:"week_start"`
	Rank      int    `json:"rank"`
	Points    int    `json:"points"`
	GroupName string `json:"group_name"`
}
