// Package payment centralizes application errors returned by the Wompi payment
// flow. EXC_* codes form the stable contract shared with handlers, clients and
// audit tooling; MapEXCError converts one of them into the structured AppError
// used across the API.
package payment

import (
	"fmt"
	"net/http"

	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// EXC payment error codes. These are the centralized, stable identifiers for the
// B1 Wompi payment flow. Keep them synchronized with the manual test guide.
const (
	EXC_001 = "EXC_001"
	EXC_002 = "EXC_002"
	EXC_008 = "EXC_008"
	EXC_017 = "EXC_017"
	EXC_018 = "EXC_018"
	EXC_019 = "EXC_019"
	EXC_022 = "EXC_022"

	// Backwards-friendly aliases.
	EXC001 = EXC_001
	EXC002 = EXC_002
	EXC008 = EXC_008
	EXC017 = EXC_017
	EXC018 = EXC_018
	EXC019 = EXC_019
	EXC022 = EXC_022
)

// excPaymentSpec is the immutable definition of one EXC payment error.
type excPaymentSpec struct {
	Code    string
	Status  int
	Message string
}

// excPaymentSpecs is the single source of truth for the centralized mapper.
var excPaymentSpecs = map[string]excPaymentSpec{
	EXC_001: {Code: EXC_001, Status: http.StatusBadRequest, Message: "el carrito está vacío"},
	EXC_002: {Code: EXC_002, Status: http.StatusBadRequest, Message: "cantidad inválida"},
	EXC_008: {Code: EXC_008, Status: http.StatusNotFound, Message: "producto no encontrado"},
	EXC_017: {Code: EXC_017, Status: http.StatusBadRequest, Message: "payment id ausente"},
	EXC_018: {Code: EXC_018, Status: http.StatusBadGateway, Message: "Wompi no disponible"},
	EXC_019: {Code: EXC_019, Status: http.StatusBadRequest, Message: "external_reference ausente"},
	EXC_022: {Code: EXC_022, Status: http.StatusInternalServerError, Message: "no se pudo cumplir la orden"},
}

// EXCPaymentError is an easy-to-use value type for the mapped error. It exposes
// both the HTTP status/message and conversion to *errors.AppError.
type EXCPaymentError struct {
	Code    string
	Status  int
	Message string
}

// Error implements error.
func (e EXCPaymentError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// ToAppError converts the value into the structured API error.
func (e EXCPaymentError) ToAppError() *errors.AppError {
	return errors.New(e.Code, e.Message, e.Status)
}

// Spec returns the immutable spec for code, if present.
func EXCSpec(code string) (EXCPaymentError, bool) {
	spec, ok := excPaymentSpecs[code]
	if !ok {
		return EXCPaymentError{}, false
	}
	return EXCPaymentError{Code: spec.Code, Status: spec.Status, Message: spec.Message}, true
}

// MapEXCError maps a stable EXC code into *errors.AppError. Unknown codes return
// (nil, false) so callers can distinguish "not an EXC code" from a mapped error.
func MapEXCError(code string) (*errors.AppError, bool) {
	spec, ok := EXCSpec(code)
	if !ok {
		return nil, false
	}
	return spec.ToAppError(), true
}

// MustMapEXCError maps code or panics when code is unknown. Useful for tests and
// wiring where an unknown code is a programming error.
func MustMapEXCError(code string) *errors.AppError {
	appErr, ok := MapEXCError(code)
	if !ok {
		panic(fmt.Sprintf("payment: unknown EXC error code %q", code))
	}
	return appErr
}

// MapPaymentError is an alias for MapEXCError, provided for discoverability.
func MapPaymentError(code string) (*errors.AppError, bool) {
	return MapEXCError(code)
}

// PaymentErrorMapper maps a code or returns nil when unknown.
func PaymentErrorMapper(code string) *errors.AppError {
	appErr, ok := MapEXCError(code)
	if !ok {
		return nil
	}
	return appErr
}

// PaymentErrorCode is a convenience alias to EXCPaymentError.
type PaymentErrorCode = EXCPaymentError

// KnownEXCCodes returns the sorted-ish list of supported codes.
func KnownEXCCodes() []string {
	codes := make([]string, 0, len(excPaymentSpecs))
	for code := range excPaymentSpecs {
		codes = append(codes, code)
	}
	return codes
}
