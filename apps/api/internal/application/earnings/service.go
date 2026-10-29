// Package earnings provides aggregated earnings metrics for a coach:
// own product sales profit plus ally commissions.
package earnings

import (
	"context"
	"fmt"

	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service aggregates coach earnings from own product sales and ally commissions.
type Service struct {
	productRepo        productdomain.Repository
	commissionRepo     commissiondomain.Repository
}

// NewService creates a new earnings service.
func NewService(productRepo productdomain.Repository, commissionRepo commissiondomain.Repository) *Service {
	return &Service{
		productRepo:    productRepo,
		commissionRepo: commissionRepo,
	}
}

// GetEarningsSummary returns aggregated earnings for a coach.
func (s *Service) GetEarningsSummary(ctx context.Context, coachID string) (*dto.EarningsSummaryResponse, error) {
	// --- Own product sales ---
	ownSales, err := s.productRepo.ListSalesByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list own sales: %w", err)
	}

	ownSalesCount := len(ownSales)
	var ownSalesTotalCents int64
	var ownProfitCents int64
	for _, sale := range ownSales {
		ownSalesTotalCents += int64(sale.Total * 100) // convert to cents
		profit := (sale.UnitPrice - sale.UnitReceived) * float64(sale.Quantity)
		ownProfitCents += int64(profit * 100)
	}

	// --- Ally commissions ---
	commissions, err := s.commissionRepo.ListCommissionEntriesByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list commissions: %w", err)
	}

	commissionCount := len(commissions)
	var commissionTotalCents int64
	var pendingCents int64
	allyMap := make(map[string]*dto.AllyEarningsBreakdown)

	for _, entry := range commissions {
		commissionTotalCents += entry.AmountCents
		if entry.Status == "accrued" {
			pendingCents += entry.AmountCents
		}

		// Track by ally (we need ally name — query separately or leave blank)
		if _, ok := allyMap[entry.RelationshipID]; !ok {
			allyMap[entry.RelationshipID] = &dto.AllyEarningsBreakdown{
				AllyID:      entry.RelationshipID, // using relationship_id as proxy for ally grouping
				AllyName:    "",                   // filled below if we can resolve
			}
		}
		if entry.Status == "accrued" {
			allyMap[entry.RelationshipID].PendingCents += entry.AmountCents
		}
		allyMap[entry.RelationshipID].CommissionCount++
		allyMap[entry.RelationshipID].CommissionCents += entry.AmountCents
	}

	byAlly := make([]dto.AllyEarningsBreakdown, 0, len(allyMap))
	for _, b := range allyMap {
		byAlly = append(byAlly, *b)
	}

	totalEarningsCents := ownSalesTotalCents/100 + commissionTotalCents // own sales in cents + commissions in cents

	return &dto.EarningsSummaryResponse{
		TotalEarningsCents:     totalEarningsCents,
		TotalEarningsCurrency:  "COP",
		OwnSalesCount:          ownSalesCount,
		OwnSalesTotalCents:     ownSalesTotalCents / 100,
		OwnProfitCents:         ownProfitCents / 100,
		CommissionCount:        commissionCount,
		CommissionTotalCents:   commissionTotalCents,
		PendingCents:           pendingCents,
		ByAlly:                 byAlly,
	}, nil
}
