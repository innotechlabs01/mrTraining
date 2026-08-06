package apperror

import "fmt"

type Code string

const (
	CodeInvalidInput    Code = "invalid_input"
	CodeNotFound        Code = "not_found"
	CodeUnauthorized      Code = "unauthorized"
	CodeForbidden         Code = "forbidden"
	CodeConflict          Code = "conflict"
	CodeInternal          Code = "internal"
	CodeUnimplemented     Code = "unimplemented"
)

type Error struct {
	Code    Code
	Message string
	Err     error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error {
	return e.Err
}

func New(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}

func Wrap(err error, code Code, message string) *Error {
	return &Error{Code: code, Message: message, Err: err}
}

func ErrInvalidInput(field, message string) *Error {
	return &Error{Code: CodeInvalidInput, Message: fmt.Sprintf("invalid %s: %s", field, message)}
}

func ErrNotFound(resource string) *Error {
	return &Error{Code: CodeNotFound, Message: fmt.Sprintf("%s not found", resource)}
}

func ErrUnauthorized(msg string) *Error {
	return &Error{Code: CodeUnauthorized, Message: msg}
}

func ErrForbidden(msg string) *Error {
	return &Error{Code: CodeForbidden, Message: msg}
}

func ErrInternal(err error) *Error {
	return &Error{Code: CodeInternal, Message: "internal error", Err: err}
}

func ErrConflict(msg string) *Error {
	return &Error{Code: CodeConflict, Message: msg}
}
