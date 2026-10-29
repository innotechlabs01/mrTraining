package dto

// EarningsSummaryResponse agrega las ganancias del coach:
// - Ventas propias de productos (price - received = profit)
// - Comisiones generadas por aliados (amount_cents de commission_entries)
type EarningsSummaryResponse struct {
	// Totales globales
	TotalEarningsCents   int64   `json:"total_earnings_cents"`
	TotalEarningsCurrency string  `json:"total_earnings_currency"`
	// Ventas propias del coach (su tienda)
	OwnSalesCount       int     `json:"own_sales_count"`
	OwnSalesTotalCents  int64   `json:"own_sales_total_cents"`
	OwnProfitCents      int64   `json:"own_profit_cents"` // SUM((unit_price - unit_received) * quantity)
	// Comisiones de aliados
	CommissionCount      int     `json:"commission_count"`
	CommissionTotalCents int64   `json:"commission_total_cents"`
	// Pendiente de cobro (comisiones accrued no liquidadas en settlement)
	PendingCents         int64   `json:"pending_cents"`
	// Desglose por aliado
	ByAlly               []AllyEarningsBreakdown `json:"by_ally"`
}

// AllyEarningsBreakdown desglosa ganancias por aliado.
type AllyEarningsBreakdown struct {
	AllyID          string `json:"ally_id"`
	AllyName        string `json:"ally_name"`
	CommissionCount int    `json:"commission_count"`
	CommissionCents int64  `json:"commission_cents"`
	PendingCents    int64  `json:"pending_cents"`
}
