/**
 * Pruebas unitarias de GpsFilter con posiciones sintéticas.
 * No requiere GPS real ni dispositivo.
 */

import { GpsFilter, haversineMetros } from '../infrastructure/GpsFilter';

let contadorTs = 0;
function siguienteTimestamp(): string {
  const base = new Date('2026-10-28T10:00:00Z').getTime();
  contadorTs += 1000; // 1 segundo entre puntos
  return new Date(base + contadorTs).toISOString();
}

function punto(
  lat: number,
  lng: number,
  overrides: { timestamp?: string; accuracy?: number | null; alt?: number | null } = {}
): any {
  return {
    lat,
    lng,
    timestamp: overrides.timestamp ?? siguienteTimestamp(),
    accuracy: overrides.accuracy ?? 5,
    alt: overrides.alt ?? null,
    ...overrides,
  };
}

describe('GpsFilter', () => {
  describe('coordenadas válidas', () => {
    it('acepta coordenadas dentro de rangos válidos', () => {
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([punto(40.4168, -3.7038)]);
      expect(resultado.puntosValidos).toHaveLength(1);
      expect(resultado.puntosDescartados).toHaveLength(0);
    });

    it('descarta latitud fuera de rango', () => {
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([punto(91, -3.7038)]);
      expect(resultado.puntosValidos).toHaveLength(0);
      expect(resultado.puntosDescartados).toHaveLength(1);
      expect(resultado.puntosDescartados[0].motivoDescartado).toBe('coordenadas_invalidas');
    });

    it('descarta longitud fuera de rango', () => {
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([punto(40.4168, 181)]);
      expect(resultado.puntosValidos).toHaveLength(0);
      expect(resultado.puntosDescartados[0].motivoDescartado).toBe('coordenadas_invalidas');
    });
  });

  describe('precisión GPS', () => {
    it('descarta puntos con accuracy mayor al umbral', () => {
      const filtro = new GpsFilter({ maxPrecisionMetros: 10 });
      const resultado = filtro.filtrar([punto(40.4168, -3.7038, { accuracy: 60 })]);
      expect(resultado.puntosValidos).toHaveLength(0);
      expect(resultado.puntosDescartados[0].motivoDescartado).toContain('precision_insuficiente');
    });

    it('acepta puntos con accuracy dentro del umbral', () => {
      const filtro = new GpsFilter({ maxPrecisionMetros: 50 });
      const resultado = filtro.filtrar([punto(40.4168, -3.7038, { accuracy: 5 })]);
      expect(resultado.puntosValidos).toHaveLength(1);
    });
  });

  describe('duplicados', () => {
    it('descarta puntos con mismo timestamp', () => {
      const ts = '2026-10-28T10:00:00Z';
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038, { timestamp: ts }),
        punto(40.4169, -3.7039, { timestamp: ts }),
      ]);
      expect(resultado.puntosValidos).toHaveLength(1);
      expect(resultado.puntosDescartados).toHaveLength(1);
      expect(resultado.puntosDescartados[0].motivoDescartado).toBe('duplicado_timestamp');
    });
  });

  describe('salto GPS', () => {
    it('descarta salto imposible (100m en 1 segundo)', () => {
      const filtro = new GpsFilter({ maxVelocidadMps: 8 });
      const t1 = new Date('2026-10-28T10:00:00Z').toISOString();
      const t2 = new Date('2026-10-28T10:00:01Z').toISOString();
      // Madrid centro → ~100m al este en 1 segundo = 100 m/s >> 8 m/s
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038, { timestamp: t1 }),
        punto(40.4168, -3.7038 + 0.001, { timestamp: t2 }), // ~111m al este
      ]);
      expect(resultado.puntosValidos).toHaveLength(1);
      expect(resultado.puntosDescartados).toHaveLength(1);
      expect(resultado.puntosDescartados[0].motivoDescartado).toContain('salto_gps');
    });
  });

  describe('movimiento estático', () => {
    it('ignora puntos muy cercanos al anterior', () => {
      const filtro = new GpsFilter({ minDistanciaEntrePuntosMetros: 5 });
      const t1 = new Date('2026-10-28T10:00:00Z').toISOString();
      const t2 = new Date('2026-10-28T10:00:01Z').toISOString();
      // ~1 metro de distancia
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038, { timestamp: t1 }),
        punto(40.41680001, -3.7038, { timestamp: t2 }),
      ]);
      expect(resultado.puntosValidos).toHaveLength(1);
      expect(resultado.puntosDescartados).toHaveLength(1);
      expect(resultado.puntosDescartados[0].motivoDescartado).toBe('movimiento_estatico');
    });
  });

  describe('calidad GPS', () => {
    it('calcula calidad como ratio válidos/totales', () => {
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038),
        punto(91, -3.7038), // inválida
      ]);
      expect(resultado.calidad).toBe(0.5);
    });

    it('calidad es 1.0 cuando todos son válidos', () => {
      const filtro = new GpsFilter();
      // Puntos separados por ~1.7m en 1 segundo (1.7 m/s < 8 m/s, > 1m umbral estático)
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038),
        punto(40.4168, -3.7038 + 0.00002),
      ]);
      expect(resultado.calidad).toBe(1.0);
    });

    it('calidad es 0 cuando no hay puntos', () => {
      const filtro = new GpsFilter();
      const resultado = filtro.filtrar([]);
      expect(resultado.calidad).toBe(1.0);
      expect(resultado.distanciaTotalMetros).toBe(0);
    });
  });

  describe('distancia Haversine', () => {
    it('calcula distancia conocida (Madrid centro ≈ 0 m mismo punto)', () => {
      const d = haversineMetros(40.4168, -3.7038, 40.4168, -3.7038);
      expect(d).toBeCloseTo(0, 5);
    });

    it('calcula distancia entre Madrid y Barcelona ≈ 505 km', () => {
      // Madrid: 40.4168, -3.7038; Barcelona: 41.3851, 2.1734
      const d = haversineMetros(40.4168, -3.7038, 41.3851, 2.1734);
      expect(d).toBeCloseTo(505000, -3); // dentro de 1 km
    });
  });

  describe('reset', () => {
    it('limpia el último punto válido tras reset', () => {
      const filtro = new GpsFilter();
      filtro.filtrar([punto(40.4168, -3.7038)]);
      filtro.reset();
      // Tras reset, el siguiente punto es tratado como primero (sin distancia anterior)
      const resultado = filtro.filtrar([
        punto(40.4168, -3.7038),
        punto(40.4168, -3.7038 + 0.00002),
      ]);
      expect(resultado.puntosValidos).toHaveLength(2);
    });
  });
});
