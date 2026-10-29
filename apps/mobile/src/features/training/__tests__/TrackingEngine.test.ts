/**
 * Pruebas unitarias de TrackingEngine con mocks de persistencia y ubicación.
 * No requiere GPS real ni dispositivo.
 */

import { TrackingEngine, haversineMetros, DEFAULT_CONFIG } from '../domain/TrackingEngine';

// --- Mocks ---

class PersistenciaMock {
  estadosGuardados: any[] = [];
  puntosGuardados: any[] = [];
  splitsGuardados: any[] = [];
  metricasGuardadas: any[] = [];
  sincronizaciones: any[] = [];

  async guardarEstado(state: any): Promise<void> {
    this.estadosGuardados.push(state);
  }
  async cargarEstado(_sessionId: string): Promise<any | null> {
    return null;
  }
  async guardarPuntoGps(_sessionId: string, punto: any): Promise<void> {
    this.puntosGuardados.push(punto);
  }
  async guardarSplit(_sessionId: string, split: any): Promise<void> {
    this.splitsGuardados.push(split);
  }
  async guardarMetrica(_sessionId: string, metrica: any): Promise<void> {
    this.metricasGuardadas.push(metrica);
  }
  async encolarSincronizacion(_sessionId: string, tipo: string): Promise<void> {
    this.sincronizaciones.push({ sesion: _sessionId, tipo });
  }
}

class UbicacionMock {
  permisoConcedido: boolean = true;
  puntosEnviados: any[] = [];
  callback: ((p: any) => void) | null = null;

  async solicitarPermiso(): Promise<boolean> {
    return this.permisoConcedido;
  }

  async iniciarSeguimiento(callback: (punto: any) => void): Promise<{ remover: () => void }> {
    this.callback = callback;
    return { remover: () => { this.callback = null; } };
  }

  detenerSeguimiento(): void {
    this.callback = null;
  }

  async simularPunto(punto: any): void {
    if (this.callback) {
      await this.callback(punto);
    }
  }
}

function crearMotor({
  permisoConcedido = true,
  config = DEFAULT_CONFIG,
}: {
  permisoConcedido?: boolean;
  config?: typeof DEFAULT_CONFIG;
} = {}) {
  const persist = new PersistenciaMock();
  const ubicacion = new UbicacionMock();
  ubicacion.permisoConcedido = permisoConcedido;
  const engine = new TrackingEngine({
    sesionId: 'test-session-1',
    config,
    persist,
    ubicacion,
  });
  return { engine, persist, ubicacion };
}

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

describe('TrackingEngine — máquina de estados', () => {
  it('inicia transición preparado → iniciando → en_ejecucion', async () => {
    const { engine } = crearMotor();
    await engine.iniciar();
    expect(engine.getEstado()).toBe('en_ejecucion');
  });

  it('falla si permiso denegado', async () => {
    const { engine } = crearMotor({ permisoConcedido: false });
    await expect(engine.iniciar()).rejects.toThrow('Permiso de ubicación denegado');
    expect(engine.getEstado()).toBe('error_recuperable');
  });

  it('falla si iniciar desde estado no preparado', async () => {
    const { engine } = crearMotor();
    await engine.iniciar();
    await expect(engine.iniciar()).rejects.toThrow();
  });

  it('pausa y reanuda correctamente', async () => {
    const { engine } = crearMotor();
    await engine.iniciar();
    await engine.pausar();
    expect(engine.getEstado()).toBe('en_pausa');
    await engine.reanudar();
    expect(engine.getEstado()).toBe('en_ejecucion');
  });

  it('falla si pausar sin iniciar', async () => {
    const { engine } = crearMotor();
    await expect(engine.pausar()).rejects.toThrow();
  });

  it('finaliza y pasa a pendiente_sincronizacion', async () => {
    const { engine } = crearMotor();
    await engine.iniciar();
    const metrica = await engine.finalizar();
    expect(engine.getEstado()).toBe('pendiente_sincronizacion');
    expect(metrica).toHaveProperty('distanciaMetros');
  });

  it('sincronización exitosa pasa a sincronizado', async () => {
    const { engine } = crearMotor();
    await engine.iniciar();
    await engine.finalizar();
    await engine.sincronizarExitoso();
    expect(engine.getEstado()).toBe('sincronizado');
  });
});

describe('TrackingEngine — procesamiento de puntos GPS', () => {
  it('procesa punto válido y actualiza distancia', async () => {
    const { engine, persist, ubicacion } = crearMotor();
    await engine.iniciar();

    // ~5.5 metros en 1 segundo = 5.5 m/s < 8 m/s (válido)
    await ubicacion.simularPunto(punto(40.4168, -3.7038, { timestamp: siguienteTimestamp(), accuracy: 5 }));
    await ubicacion.simularPunto(punto(40.4168, -3.7038 + 0.00005, { timestamp: siguienteTimestamp(), accuracy: 5 }));

    const m = engine.getMetrica();
    expect(m.puntosValidos).toBeGreaterThanOrEqual(1);
    expect(m.distanciaMetros).toBeGreaterThan(0);
    expect(persist.puntosGuardados.length).toBeGreaterThan(0);
    expect(persist.metricasGuardadas.length).toBeGreaterThan(0);
  });

  it('descarta salto GPS y no acumula distancia', async () => {
    const { engine, persist } = crearMotor();
    // Procesar directamente sin pasar por iniciar() ni el mock de ubicación
    const engineAny = engine as any;

    // Punto válido primero — usar procesarPuntoEntrante para guardar en persist
    await engineAny.procesarPuntoEntrante(punto(40.4168, -3.7038, { timestamp: '2026-10-28T10:00:00.000Z', accuracy: 5 }));
    // Salto de ~111km en 1 segundo → descartado
    await engineAny.procesarPuntoEntrante(punto(41.5268, -3.7038, { timestamp: '2026-10-28T10:00:01.000Z', accuracy: 5 }));

    const m = engine.getMetrica();
    expect(m.puntosDescartados).toBeGreaterThanOrEqual(1);
    const descartados = persist.puntosGuardados.filter((p: any) => !p.valido);
    expect(descartados.length).toBeGreaterThan(0);
    expect(descartados[0].motivoDescartado).toContain('salto_gps');
  });

  it('genera splits cada 100 metros', async () => {
    const { engine, persist, ubicacion } = crearMotor({
      config: { ...DEFAULT_CONFIG, splitCadaMetros: 100 },
    });
    await engine.iniciar();

    // Simular varios puntos para acumular 100m+
    const tBase = new Date('2026-10-28T10:00:00Z').getTime();
    for (let i = 0; i < 20; i++) {
      const ts = new Date(tBase + i * 1000).toISOString();
      // ~5.5m por punto → 20 puntos ≈ 110m
      await ubicacion.simularPunto(punto(40.4168 + i * 0.00005, -3.7038, { timestamp: ts, accuracy: 5 }));
    }

    const splits = engine.getSplits();
    expect(splits.length).toBeGreaterThanOrEqual(1);
    expect(persist.splitsGuardados.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TrackingEngine — métricas derivadas', () => {
  it('calcula ritmo y velocidad tras puntos válidos', async () => {
    const { engine, ubicacion } = crearMotor();
    await engine.iniciar();

    const base = new Date('2026-10-28T10:00:00Z').getTime();
    const t1 = new Date(base).toISOString();
    const t2 = new Date(base + 60000).toISOString(); // 60 segundos después

    // ~400 metros en 60 segundos = 6.7 m/s < 8 m/s (válido)
    await ubicacion.simularPunto(punto(40.4168, -3.7038, { timestamp: t1, accuracy: 5 }));
    await ubicacion.simularPunto(punto(40.4168, -3.7038 + 0.0036, { timestamp: t2, accuracy: 5 })); // ~400m

    const m = engine.getMetrica();
    expect(m.velocidadMetrosPorSegundo).toBeGreaterThan(0);
    expect(engine.getVelocidadKmh()).toBeGreaterThan(0);
  });

  it('ritmo formateado es --:-- cuando sin distancia', async () => {
    const { engine } = crearMotor();
    expect(engine.getRitmoFormateado()).toBe('--:--');
  });

  it('getDistanciaKm retorna 0 al inicio', async () => {
    const { engine } = crearMotor();
    expect(engine.getDistanciaKm()).toBe(0);
  });
});

describe('TrackingEngine — estado persistido', () => {
  it('guarda estado tras iniciar', async () => {
    const { engine, persist } = crearMotor();
    await engine.iniciar();
    expect(persist.estadosGuardados.length).toBeGreaterThan(0);
    // El último estado guardado después de iniciar debe ser 'en_ejecucion'
    const ultimoEstado = persist.estadosGuardados[persist.estadosGuardados.length - 1];
    expect(ultimoEstado.estado).toBe('en_ejecucion');
  });

  it('guarda estado tras finalizar', async () => {
    const { engine, persist } = crearMotor();
    await engine.iniciar();
    await engine.finalizar();
    const estadoFinal = persist.estadosGuardados[persist.estadosGuardados.length - 1];
    expect(estadoFinal.estado).toBe('pendiente_sincronizacion');
  });
});

describe('haversineMetros', () => {
  it('devuelve 0 para mismo punto', () => {
    expect(haversineMetros(40.4168, -3.7038, 40.4168, -3.7038)).toBeCloseTo(0, 5);
  });

  it('calcula distancia Madrid-Barcelona ≈ 505 km', () => {
    const d = haversineMetros(40.4168, -3.7038, 41.3851, 2.1734);
    expect(d).toBeCloseTo(505000, -3); // dentro de 1 km
  });
});
