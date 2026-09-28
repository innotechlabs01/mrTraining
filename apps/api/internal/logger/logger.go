// Package logger provides structured logging using uber/zap.
// Supports both human-readable console output (development) and JSON (production).
package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	globalLogger *zap.Logger
	globalSugar  *zap.SugaredLogger
	once         sync.Once
)

// Init initializes the global logger with the specified log level.
// In development (GO_ENV=development or empty), uses human-readable console output.
// In production, uses structured JSON.
// Supported levels: debug, info, warn, error.
func Init(level string) {
	once.Do(func() {
		isDev := os.Getenv("GO_ENV") == "development" || os.Getenv("GO_ENV") == ""

		var cfg zap.Config
		if isDev {
			cfg = zap.NewDevelopmentConfig()
			cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
			cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
			cfg.EncoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
			cfg.DisableStacktrace = true
		} else {
			cfg = zap.NewProductionConfig()
			cfg.EncoderConfig.TimeKey = "ts"
			cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
			cfg.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
		}

		switch level {
		case "debug":
			cfg.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		case "info":
			cfg.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		case "warn":
			cfg.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
		case "error":
			cfg.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
		default:
			cfg.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		}

		logger, err := cfg.Build(zap.AddCallerSkip(0))
		if err != nil {
			panic("failed to initialize logger: " + err.Error())
		}

		globalLogger = logger
		globalSugar = logger.Sugar()
	})
}

// L returns the global zap Logger instance.
// If Init has not been called, it returns a no-op logger.
func L() *zap.Logger {
	if globalLogger == nil {
		return zap.NewNop()
	}
	return globalLogger
}

// S returns the global zap SugaredLogger instance.
// If Init has not been called, it returns a no-op sugared logger.
func S() *zap.SugaredLogger {
	if globalSugar == nil {
		return zap.NewNop().Sugar()
	}
	return globalSugar
}

// Sync flushes any buffered log entries.
// Should be called before application shutdown.
func Sync() {
	if globalLogger != nil {
		_ = globalLogger.Sync()
	}
}
