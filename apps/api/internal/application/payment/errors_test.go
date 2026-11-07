package payment

import (
	"net/http"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

func TestEXCConstants(t *testing.T) {
	cases := map[string]string{
		EXC_001: "EXC_001",
		EXC_002: "EXC_002",
		EXC_008: "EXC_008",
		EXC_017: "EXC_017",
		EXC_018: "EXC_018",
		EXC_019: "EXC_019",
		EXC_022: "EXC_022",
	}
	if len(cases) != 7 {
		t.Fatalf("expected 7 constants, got %d", len(cases))
	}
	for code, want := range cases {
		if code != want {
			t.Errorf("constant mismatch: %q != %q", code, want)
		}
	}
}

func TestEXCSpec_AllCodes(t *testing.T) {
	expected := map[string]struct {
		status  int
		message string
	}{
		EXC_001: {http.StatusBadRequest, "el carrito está vacío"},
		EXC_002: {http.StatusBadRequest, "cantidad inválida"},
		EXC_008: {http.StatusNotFound, "producto no encontrado"},
		EXC_017: {http.StatusBadRequest, "payment id ausente"},
		EXC_018: {http.StatusBadGateway, "Wompi no disponible"},
		EXC_019: {http.StatusBadRequest, "external_reference ausente"},
		EXC_022: {http.StatusInternalServerError, "no se pudo cumplir la orden"},
	}

	if len(excPaymentSpecs) != len(expected) {
		t.Fatalf("spec count mismatch: got %d want %d", len(excPaymentSpecs), len(expected))
	}

	for code, want := range expected {
		spec, ok := EXCSpec(code)
		if !ok {
			t.Fatalf("EXCSpec(%q) not found", code)
		}
		if spec.Code != code {
			t.Errorf("%s: code mismatch %q", code, spec.Code)
		}
		if spec.Status != want.status {
			t.Errorf("%s: status got %d want %d", code, spec.Status, want.status)
		}
		if spec.Message != want.message {
			t.Errorf("%s: message got %q want %q", code, spec.Message, want.message)
		}
		if spec.Error() != "["+code+"] "+want.message {
			t.Errorf("%s: Error() mismatch %q", code, spec.Error())
		}
		appErr := spec.ToAppError()
		if appErr == nil || appErr.Code != code || appErr.Status != want.status || appErr.Message != want.message {
			t.Errorf("%s: ToAppError mismatch", code)
		}
	}
}

func TestEXCSpec_Unknown(t *testing.T) {
	if _, ok := EXCSpec("EXC_999"); ok {
		t.Fatal("unknown code should not be found")
	}
	if spec, ok := EXCSpec(""); ok || spec.Code != "" {
		t.Fatal("empty code should not be found")
	}
}

func TestMapEXCError(t *testing.T) {
	for code := range excPaymentSpecs {
		appErr, ok := MapEXCError(code)
		if !ok || appErr == nil {
			t.Fatalf("MapEXCError(%q) failed", code)
		}
		if appErr.Code != code {
			t.Errorf("MapEXCError code mismatch %q", code)
		}
	}
	if appErr, ok := MapEXCError("NOT_AN_EXC"); ok || appErr != nil {
		t.Fatal("unknown MapEXCError should return nil,false")
	}

	// Aliases
	for code := range excPaymentSpecs {
		if got := PaymentErrorMapper(code); got == nil || got.Code != code {
			t.Errorf("PaymentErrorMapper(%q) mismatch", code)
		}
		if appErr, ok := MapPaymentError(code); !ok || appErr == nil || appErr.Code != code {
			t.Errorf("MapPaymentError(%q) mismatch", code)
		}
	}
	if PaymentErrorMapper("nope") != nil {
		t.Fatal("PaymentErrorMapper unknown should be nil")
	}
}

func TestMustMapEXCError(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("MustMapEXCError panicked: %v", r)
		}
	}()
	for code := range excPaymentSpecs {
		if MustMapEXCError(code) == nil {
			t.Fatalf("MustMapEXCError(%q) returned nil", code)
		}
	}
}

func TestMustMapEXCError_PanicsOnUnknown(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic")
		}
	}()
	MustMapEXCError("EXC_404")
}

func TestKnownEXCCodes(t *testing.T) {
	codes := KnownEXCCodes()
	if len(codes) != 7 {
		t.Fatalf("KnownEXCCodes len got %d want 7", len(codes))
	}
	seen := map[string]bool{}
	for _, c := range codes {
		seen[c] = true
	}
	for code := range excPaymentSpecs {
		if !seen[code] {
			t.Errorf("KnownEXCCodes missing %s", code)
		}
	}
}

func TestEXCPaymentError_ToAppErrorIsErrorsAppError(t *testing.T) {
	spec, ok := EXCSpec(EXC_022)
	if !ok {
		t.Fatal("missing EXC_022")
	}
	appErr := spec.ToAppError()
	if _, ok := interface{}(appErr).(*errors.AppError); !ok {
		t.Fatal("ToAppError did not return *errors.AppError")
	}
	if appErr.Status != http.StatusInternalServerError {
		t.Fatalf("status mismatch: %d", appErr.Status)
	}
}
