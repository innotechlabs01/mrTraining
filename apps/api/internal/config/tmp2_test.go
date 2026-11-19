package config

import (
	"os"
	"testing"
)

func TestTmp2(t *testing.T) {
	wd, _ := os.Getwd()
	_ = os.Chdir("../..")
	defer os.Chdir(wd)
	t.Logf("lookup before=%t", func() bool { _, ok := os.LookupEnv("WOMPI_PRIVATE_KEY"); return ok }())
	_ = os.Setenv("DEBUG", "1")
	cfg, _ := Load()
	t.Logf("cfg private=%v", cfg.WompiPrivateKey != "")
	t.Logf("cfg public=%v", cfg.WompiPublicKey != "")
}
