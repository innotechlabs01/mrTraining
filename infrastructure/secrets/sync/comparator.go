package sync

import (
	"crypto/sha256"
	"encoding/hex"
)

// HashValue calcula el SHA-256 hex de un valor. Solo para comparación en memoria.
// Nunca se persisten los valores ni los hashes.
func HashValue(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

// CompareSecrets compara dos mapas de secretos y devuelve las diferencias
// Los valores reales NO se incluyen en el resultado, solo hashes para comparación
func CompareSecrets(source, target map[string]string, allowlist *PromotionAllowlist) []SecretComparison {
	comparisons := make([]SecretComparison, 0)

	// Construir conjunto de nombres en origen
	sourceNames := make(map[string]bool)
	for name := range source {
		sourceNames[name] = true
	}

	// Construir conjunto de nombres en destino
	targetNames := make(map[string]bool)
	for name := range target {
		targetNames[name] = true
	}

	// Comparar secretos en origen
	for sourceName, sourceValue := range source {
		comp := SecretComparison{
			SourceName: sourceName,
			SourceHash: HashValue(sourceValue),
			Status:     SecretNew, // por defecto
		}

		// Verificar si está bloqueado
		if allowlist.IsBlocked(sourceName) {
			comp.Status = SecretBlocked
			comp.Reason = "secreto en lista de bloqueo"
			comp.Promotable = false
			comparisons = append(comparisons, comp)
			continue
		}

		// Verificar si existe en destino
		targetValue, existsInTarget := target[sourceName]
		if !existsInTarget {
			// Nuevo en origen
			comp.Status = SecretNew
			comp.Reason = "nuevo en origen, no existe en destino"
			comp.Promotable = false // Nuevo, necesita aprobación
		} else if HashValue(sourceValue) != HashValue(targetValue) {
			// Modificado
			comp.Status = SecretChanged
			comp.TargetName = sourceName
			comp.TargetHash = HashValue(targetValue)
			comp.Reason = "valor modificado en origen"
			comp.Promotable = false // Necesita aprobación
		} else {
			// Sin cambios
			comp.Status = SecretUnchanged
			comp.TargetName = sourceName
			comp.TargetHash = HashValue(targetValue)
			comp.Reason = "sin cambios"
			comp.Promotable = false // Ya está sincronizado
		}

		// Verificar allowlist - verificar si el source está permitido
		allowed, reason := allowlist.IsSourceAllowed(sourceName)
		comp.Allowed = allowed
		if allowed {
			comp.Reason = reason
			if comp.Status == SecretNew || comp.Status == SecretChanged {
				comp.Promotable = true
			}
		}

		comparisons = append(comparisons, comp)
	}

	// Detectar secretos eliminados (en destino pero no en origen)
	for targetName := range targetNames {
		if !sourceNames[targetName] {
			comp := SecretComparison{
				SourceName: "",
				TargetName: targetName,
				TargetHash: HashValue(target[targetName]),
				Status:     SecretDeleted,
				Reason:     "eliminado en origen, sigue en destino",
				Allowed:    false,
				Promotable: false,
			}
			comparisons = append(comparisons, comp)
		}
	}

	return comparisons
}

// SummaryStats calcula estadísticas de las comparaciones
func SummaryStats(comparisons []SecretComparison) SyncResult {
	result := SyncResult{Total: len(comparisons)}

	for _, c := range comparisons {
		switch c.Status {
		case SecretNew:
			result.New++
		case SecretChanged:
			result.Changed++
		case SecretUnchanged:
			result.Unchanged++
		case SecretDeleted:
			result.Deleted++
		case SecretBlocked:
			result.Blocked++
		}
	}

	return result
}

// FilterPromotable filtra solo los secretos que se pueden promover
func FilterPromotable(comparisons []SecretComparison) []SecretComparison {
	var promotable []SecretComparison
	for _, c := range comparisons {
		if c.Promotable {
			promotable = append(promotable, c)
		}
	}
	return promotable
}

// FilterByStatus filtra comparaciones por un estado específico
func FilterByStatus(comparisons []SecretComparison, status SecretStatus) []SecretComparison {
	var filtered []SecretComparison
	for _, c := range comparisons {
		if c.Status == status {
			filtered = append(filtered, c)
		}
	}
	return filtered
}

// GetNamesByStatus devuelve los nombres de secretos con un estado dado
func GetNamesByStatus(comparisons []SecretComparison, status SecretStatus) []string {
	var names []string
	for _, c := range comparisons {
		if c.Status == status {
			if status == SecretDeleted {
				names = append(names, c.TargetName)
			} else {
				names = append(names, c.SourceName)
			}
		}
	}
	return names
}

// ExtractShortName extrae el nombre corto de un secreto desde el path completo de GCP
// projects/PROJECT/secrets/NAME -> NAME
func ExtractShortName(fullName string) string {
	for i := len(fullName) - 1; i >= 0; i-- {
		if fullName[i] == '/' {
			return fullName[i+1:]
		}
	}
	return fullName
}
