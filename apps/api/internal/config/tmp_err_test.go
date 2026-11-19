package config

import (
	"os"
	"github.com/joho/godotenv"
	"testing"
)

func TestTmpErr2(t *testing.T) {
	wd, _ := os.Getwd()
	t.Logf("wd=%s", wd)
	f, err := os.Stat(".env")
	if err != nil { t.Logf(".env stat err=%v", err) } else { t.Logf(".env file=%s mode=%v", f.Name(), f.Mode()) }
	t.Logf("lookup before load exists? %t", func() bool { _, ok := os.LookupEnv("WOMPI_PRIVATE_KEY"); return ok }())
	_ = godotenv.Load()
	t.Logf("lookup after load exists? %t", func() bool { _, ok := os.LookupEnv("WOMPI_PRIVATE_KEY"); return ok }())
	cfg, _ := Load()
	t.Logf("cfg private=%v", cfg.WompiPrivateKey != "")
}
