package logger

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/pkgerrors"
)

var (
	defaultLogger zerolog.Logger
)

func init() {
	zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
	zerolog.TimeFieldFormat = time.RFC3339Nano

	output := zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: time.RFC3339,
		NoColor:    false,
	}
	defaultLogger = zerolog.New(output).With().Timestamp().Caller().Logger()
}

func New(service string, level string) zerolog.Logger {
	lvl, err := zerolog.ParseLevel(level)
	if err != nil {
		lvl = zerolog.InfoLevel
	}

	return defaultLogger.Level(lvl).With().Str("service", service).Logger()
}

func NewWithWriter(service string, level string, w io.Writer) zerolog.Logger {
	lvl, err := zerolog.ParseLevel(level)
	if err != nil {
		lvl = zerolog.InfoLevel
	}

	return zerolog.New(w).Level(lvl).With().Timestamp().Caller().Str("service", service).Logger()
}

func GetDefault() zerolog.Logger {
	return defaultLogger
}

func SetDefault(l zerolog.Logger) {
	defaultLogger = l
}
