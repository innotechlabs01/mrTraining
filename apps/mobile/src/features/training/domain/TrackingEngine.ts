/**
 * TrackingEngine — máquina de estados y lógica pura de tracking de running.
 *
 * No depende de Expo ni de React. Es testeable con posiciones sintéticas.
 * Toda la persistencia se delega en adaptadores inyectados.
 */

export type SessionState =
  | 'preparado'
  | 'iniciando'
  | 'en_ejecucion'
  | 'en_pausa'
  | 'reanudando'
  | 'finalizando'
  | 'pendiente_sincronizacion'
  | 'sincronizado'
  | 'error_recuperable'
  | 'error_no_recuperable';

export interface GpsPointInput {
  lat: number;
  lng: number;
  alt?: number | null;
  timestamp: string;
  accuracy?: number | null;
}

export interface GpsPointValidated extends GpsPointInput {
  valido: boolean;
  motivoDescartado?: string;
  distanciaDesdeAnteriorMetros: number;
}

export interface SessionMetrics {
  distanciaMetros: number;
  duracionSegundos: number;
  tiempoEnMovimientoSegundos: number;
  ritmoSegundosPorKm: number | null;
  velocidadMetrosPorSegundo: number;
  calorias: number;
  elevacionMetros: number;
  frecuenciaCardiaca?: number | null;
  cadencia?: number | null;
  distanciaGanadaMetros: number;
  distanciaPerdidaMetros: number;
  puntosValidos: number;
  puntosDescartados: number;
  calidadGps: number; // 0.0 a 1.0
}

export interface Split {
  numero: number;
  distanciaMetros: number;
  duracionSegundos: number;
  ritmoSegundosPorKm: number;
  timestampInicio: string;
  timestampFin: string;
}

export interface TrackingEngineConfig {
  maxPrecisionMetros: number;      // descarta puntos con peor precisión
  maxVelocidadMps: number;         // descarta saltos imposibles
  maxGapSegundos: number;          // gap que resetea distancia acumulada
  minDistanciaEntrePuntosMetros: number; // ignora movimientos estáticos
  splitCadaMetros: number;         // genera split cada N metros
}

export const DEFAULT_CONFIG: TrackingEngineConfig = {
  maxPrecisionMetros: 50.0,
  maxVelocidadMps: 8.0, // 28.8 km/h — sprint élite
  maxGapSegundos: 300,
  minDistanciaEntrePuntosMetros: 1.0,
  splitCadaMetros: 1000,
};

/**
 * Estado persistible de una sesión de tracking.
 */
export interface SessionPersistedState {
  sessionId: string;
  estado: SessionState;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  finishedAt?: string;
  ultimaActualizacion: string;
  metrica: SessionMetrics;
  splits: Split[];
  ultimoPuntoTimestamp?: string;
  segmentoActual?: number;
  repeticionActual?: number;
  serieActual?: number;
}

/**
 * Resultado de procesar un punto GPS.
 */
export interface ProcesarPuntoResultado {
  punto: GpsPointValidated;
  metricaActualizada: SessionMetrics;
  splitGenerado?: Split;
  estado: SessionState;
}

/**
 * Adaptador de persistencia (inyectado, testeable).
 */
export interface PersistenciaAdapter {
  guardarEstado(state: SessionPersistedState): Promise<void>;
  cargarEstado(sessionId: string): Promise<SessionPersistedState | null>;
  guardarPuntoGps(sessionId: string, punto: GpsPointValidated): Promise<void>;
  guardarSplit(sessionId: string, split: Split): Promise<void>;
  guardarMetrica(sessionId: string, metrica: SessionMetrics): Promise<void>;
  encolarSincronizacion(sessionId: string, tipo: 'sesion' | 'punto' | 'split'): Promise<void>;
}

/**
 * Adaptador de ubicación (inyectado, testeable).
 */
export interface UbicacionAdapter {
  solicitarPermiso(): Promise<boolean>;
  iniciarSeguimiento(callback: (punto: GpsPointInput) => void): Promise<{ remover: () => void }>;
  detenerSeguimiento(): void;
}

/**
 * TrackingEngine — lógica pura de estados, filtros y métricas.
 */
export class TrackingEngine {
  private estado: SessionState = 'preparado';
  private sesionId: string = '';
  private config: TrackingEngineConfig;
  private persist: PersistenciaAdapter;
  readonly ubicacion: UbicacionAdapter;

  // Métrica acumulada
  private metrica: SessionMetrics = {
    distanciaMetros: 0,
    duracionSegundos: 0,
    tiempoEnMovimientoSegundos: 0,
    ritmoSegundosPorKm: null,
    velocidadMetrosPorSegundo: 0,
    calorias: 0,
    elevacionMetros: 0,
    frecuenciaCardiaca: null,
    cadencia: null,
    distanciaGanadaMetros: 0,
    distanciaPerdidaMetros: 0,
    puntosValidos: 0,
    puntosDescartados: 0,
    calidadGps: 1.0,
  };

  private puntosValidos: GpsPointValidated[] = [];
  private splits: Split[] = [];
  private ultimoPuntoValido: GpsPointValidated | null = null;
  private splitContador = 0;
  private distanciaDesdeUltimoSplit = 0;

  // Tiempo
  private startedAt: Date | null = null;
  private pausedAt: Date | null = null;
  private pausaAcumuladaSegundos = 0;
  private pausaInicio: Date | null = null;

  constructor({
    sesionId,
    config = DEFAULT_CONFIG,
    persist,
    ubicacion,
  }: {
    sesionId: string;
    config?: TrackingEngineConfig;
    persist: PersistenciaAdapter;
    ubicacion: UbicacionAdapter;
  }) {
    this.sesionId = sesionId;
    this.config = config;
    this.persist = persist;
    this.ubicacion = ubicacion;
  }

  // =========================================================================
  // Máquina de estados
  // =========================================================================

  getEstado(): SessionState {
    return this.estado;
  }

  async iniciar(): Promise<void> {
    if (this.estado !== 'preparado') {
      throw new Error(`No se puede iniciar desde estado ${this.estado}`);
    }

    this.estado = 'iniciando';
    this.startedAt = new Date();
    this.persistirEstado();

    const permiso = await this.ubicacion.solicitarPermiso();
    if (!permiso) {
      this.estado = 'error_recuperable';
      this.persistirEstado();
      throw new Error('Permiso de ubicación denegado');
    }

    this.ubicacion.iniciarSeguimiento((punto) => {
      this.procesarPuntoEntrante(punto);
    });

    this.estado = 'en_ejecucion';
    this.persistirEstado();
  }

  async pausar(): Promise<void> {
    if (this.estado !== 'en_ejecucion') {
      throw new Error(`No se puede pausar desde estado ${this.estado}`);
    }

    this.estado = 'en_pausa';
    this.pausaInicio = new Date();
    this.persistirEstado();
  }

  async reanudar(): Promise<void> {
    if (this.estado !== 'en_pausa') {
      throw new Error(`No se puede reanudar desde estado ${this.estado}`);
    }

    this.estado = 'reanudando';
    if (this.pausaInicio) {
      this.pausaAcumuladaSegundos += (Date.now() - this.pausaInicio.getTime()) / 1000;
      this.pausaInicio = null;
    }
    this.persistirEstado();
    this.estado = 'en_ejecucion';
    this.persistirEstado();
  }

  async finalizar(): Promise<SessionMetrics> {
    if (this.estado !== 'en_ejecucion' && this.estado !== 'en_pausa') {
      throw new Error(`No se puede finalizar desde estado ${this.estado}`);
    }

    this.estado = 'finalizando';
    const duracionTotal = this.calcularDuracionTotal();
    this.metrica.duracionSegundos = duracionTotal;
    this.metrica.tiempoEnMovimientoSegundos = duracionTotal - this.pausaAcumuladaSegundos;
    this.calcularRitmoYVelocidad();

    this.estado = 'pendiente_sincronizacion';
    this.persistirEstado();

    return { ...this.metrica };
  }

  async sincronizarExitoso(): Promise<void> {
    if (this.estado !== 'pendiente_sincronizacion') {
      throw new Error(`No se puede sincronizar desde estado ${this.estado}`);
    }
    this.estado = 'sincronizado';
    this.persistirEstado();
  }

  async errorRecuperable(): Promise<void> {
    this.estado = 'error_recuperable';
    this.persistirEstado();
  }

  // =========================================================================
  // Procesamiento de puntos GPS
  // =========================================================================

  private async procesarPuntoEntrante(punto: GpsPointInput): Promise<void> {
    const resultado = this.validarYProcesarPunto(punto);

    // Guardar punto (válido o no) para trazabilidad
    await this.persist.guardarPuntoGps(this.sesionId, resultado.punto);

    if (resultado.punto.valido) {
      this.metrica = resultado.metricaActualizada;
      this.puntosValidos.push(resultado.punto);
      this.ultimoPuntoValido = resultado.punto;

      if (resultado.splitGenerado) {
        this.splits.push(resultado.splitGenerado);
        this.splitContador++;
        this.distanciaDesdeUltimoSplit = 0;
        await this.persist.guardarSplit(this.sesionId, resultado.splitGenerado);
      }

      await this.persist.guardarMetrica(this.sesionId, this.metrica);
      await this.persist.encolarSincronizacion(this.sesionId, 'punto');
    } else {
      // Contar puntos descartados para métricas de calidad
      this.metrica.puntosDescartados++;
    }

    this.persistirEstado();
  }

  private validarYProcesarPunto(punto: GpsPointInput): ProcesarPuntoResultado {
    // 1. Validar coordenadas
    if (!this.coordenadasValidas(punto.lat, punto.lng)) {
      return {
        punto: { ...punto, valido: false, motivoDescartado: 'coordenadas_invalidas', distanciaDesdeAnteriorMetros: 0 },
        metricaActualizada: this.metrica,
        estado: this.estado,
      };
    }

    // 2. Validar precisión
    const accuracy = punto.accuracy ?? 0;
    if (accuracy > this.config.maxPrecisionMetros) {
      return {
        punto: { ...punto, valido: false, motivoDescartado: `precision_insuficiente_${accuracy}m`, distanciaDesdeAnteriorMetros: 0 },
        metricaActualizada: this.metrica,
        estado: this.estado,
      };
    }

    // 3. Detectar duplicado (mismo timestamp)
    if (this.ultimoPuntoValido && punto.timestamp === this.ultimoPuntoValido.timestamp) {
      return {
        punto: { ...punto, valido: false, motivoDescartado: 'duplicado_timestamp', distanciaDesdeAnteriorMetros: 0 },
        metricaActualizada: this.metrica,
        estado: this.estado,
      };
    }

    // El primer punto no tiene anterior: siempre válido si pasó coordenadas y precisión
    if (!this.ultimoPuntoValido) {
      const puntoValidado: GpsPointValidated = { ...punto, valido: true, distanciaDesdeAnteriorMetros: 0 };
      const nuevaMetrica = { ...this.metrica };
      nuevaMetrica.puntosValidos++;
      this.calcularRitmoYVelocidad(nuevaMetrica);
      nuevaMetrica.calidadGps = 1.0;

      const splitGenerado = this.maybeGenerarSplit(nuevaMetrica, punto.timestamp);

      this.ultimoPuntoValido = puntoValidado;

      return {
        punto: puntoValidado,
        metricaActualizada: nuevaMetrica,
        splitGenerado,
        estado: this.estado,
      };
    }

    // 4. Calcular distancia y tiempo desde último punto válido
    let distanciaDesdeAnterior = 0;
    let tiempoDesdeAnteriorSegundos = 0;

    distanciaDesdeAnterior = haversineMetros(
      this.ultimoPuntoValido.lat,
      this.ultimoPuntoValido.lng,
      punto.lat,
      punto.lng
    );
    const t1 = new Date(this.ultimoPuntoValido.timestamp).getTime();
    const t2 = new Date(punto.timestamp).getTime();
    tiempoDesdeAnteriorSegundos = (t2 - t1) / 1000;

    // 5. Detectar salto GPS (velocidad imposible)
    if (this.ultimoPuntoValido && tiempoDesdeAnteriorSegundos > 0) {
      const velocidad = distanciaDesdeAnterior / tiempoDesdeAnteriorSegundos;
      if (velocidad > this.config.maxVelocidadMps) {
        return {
          punto: {
            ...punto,
            valido: false,
            motivoDescartado: `salto_gps_${velocidad.toFixed(1)}mps`,
            distanciaDesdeAnteriorMetros: distanciaDesdeAnterior,
          },
          metricaActualizada: this.metrica,
          estado: this.estado,
        };
      }
    }

    // 6. Detectar gap de tiempo (reset de distancia acumulada)
    if (this.ultimoPuntoValido && tiempoDesdeAnteriorSegundos > this.config.maxGapSegundos) {
      // Nuevo segmento — no acumulamos distancia desde antes del gap
      distanciaDesdeAnterior = 0;
    }

    // 7. Ignorar movimientos estáticos
    if (distanciaDesdeAnterior < this.config.minDistanciaEntrePuntosMetros) {
      return {
        punto: { ...punto, valido: false, motivoDescartado: 'movimiento_estatico', distanciaDesdeAnteriorMetros: distanciaDesdeAnterior },
        metricaActualizada: this.metrica,
        estado: this.estado,
      };
    }

    // 8. Punto válido — actualizar métricas
    const puntoValidado: GpsPointValidated = {
      ...punto,
      valido: true,
      distanciaDesdeAnteriorMetros: distanciaDesdeAnterior,
    };

    const nuevaMetrica = { ...this.metrica };
    nuevaMetrica.distanciaMetros += distanciaDesdeAnterior;
    nuevaMetrica.puntosValidos++;

    // Elevación
    if (punto.alt !== null && punto.alt !== undefined && this.ultimoPuntoValido?.alt !== null && this.ultimoPuntoValido.alt !== undefined) {
      const dif = punto.alt - this.ultimoPuntoValido.alt;
      if (dif > 0) nuevaMetrica.distanciaGanadaMetros += dif;
      else nuevaMetrica.distanciaPerdidaMetros += Math.abs(dif);
    }

    // Tiempo en movimiento (solo si estamos en ejecución)
    if (this.estado === 'en_ejecucion' && tiempoDesdeAnteriorSegundos > 0) {
      nuevaMetrica.tiempoEnMovimientoSegundos += tiempoDesdeAnteriorSegundos;
    }

    this.calcularRitmoYVelocidad(nuevaMetrica);
    nuevaMetrica.calidadGps = this.puntosValidos.length / (this.puntosValidos.length + this.metrica.puntosDescartados + 1);

    const splitGenerado = this.maybeGenerarSplit(nuevaMetrica, punto.timestamp);

    return {
      punto: puntoValidado,
      metricaActualizada: nuevaMetrica,
      splitGenerado,
      estado: this.estado,
    };
  }

  private coordenadasValidas(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && isFinite(lat) && isFinite(lng);
  }

  private calcularRitmoYVelocidad(metrica?: SessionMetrics): void {
    const m = metrica ?? this.metrica;
    const distanciaKm = m.distanciaMetros / 1000;
    const tiempoMovimientoHoras = m.tiempoEnMovimientoSegundos / 3600;

    if (distanciaKm > 0 && m.tiempoEnMovimientoSegundos > 0) {
      m.ritmoSegundosPorKm = m.tiempoEnMovimientoSegundos / distanciaKm;
      m.velocidadMetrosPorSegundo = m.distanciaMetros / m.tiempoEnMovimientoSegundos;
    } else {
      m.ritmoSegundosPorKm = null;
      m.velocidadMetrosPorSegundo = 0;
    }
  }

  private maybeGenerarSplit(metrica: SessionMetrics, timestampFin: string): Split | undefined {
    const distanciaAcumuladaConSplit = this.distanciaDesdeUltimoSplit + (this.ultimoPuntoValido?.distanciaDesdeAnteriorMetros ?? 0);

    if (distanciaAcumuladaConSplit >= this.config.splitCadaMetros) {
      const splitNumero = this.splitContador + 1;
      const timestampInicio = this.splits.length > 0
        ? this.splits[this.splits.length - 1].timestampFin
        : (this.startedAt ? this.startedAt.toISOString() : timestampFin);

      const split: Split = {
        numero: splitNumero,
        distanciaMetros: this.config.splitCadaMetros,
        duracionSegundos: Math.round(tiempoDesdeUltimoSplitSegundos(timestampInicio, timestampFin)),
        ritmoSegundosPorKm: 0,
        timestampInicio,
        timestampFin,
      };

      if (split.duracionSegundos > 0 && split.distanciaMetros > 0) {
        split.ritmoSegundosPorKm = (split.duracionSegundos / split.distanciaMetros) * 1000;
      }

      this.distanciaDesdeUltimoSplit = distanciaAcumuladaConSplit - this.config.splitCadaMetros;
      return split;
    }

    this.distanciaDesdeUltimoSplit = distanciaAcumuladaConSplit;
    return undefined;
  }

  private calcularDuracionTotal(): number {
    if (!this.startedAt) return 0;
    const fin = this.estado === 'finalizando' ? new Date() : this.pausaInicio ?? new Date();
    return (fin.getTime() - this.startedAt.getTime()) / 1000;
  }

  private persistirEstado(): void {
    const state: SessionPersistedState = {
      sessionId: this.sesionId,
      estado: this.estado,
      startedAt: this.startedAt?.toISOString(),
      pausedAt: this.pausaInicio?.toISOString(),
      ultimaActualizacion: new Date().toISOString(),
      metrica: this.metrica,
      splits: this.splits,
      ultimoPuntoTimestamp: this.ultimoPuntoValido?.timestamp,
    };
    // fire-and-forget; el adaptador maneja errores internos
    this.persist.guardarEstado(state).catch(() => {});
  }

  // =========================================================================
  // Getters para la UI
  // =========================================================================

  getMetrica(): SessionMetrics {
    return { ...this.metrica };
  }

  getSplits(): Split[] {
    return [...this.splits];
  }

  getUltimoPuntoValido(): GpsPointValidated | null {
    return this.ultimoPuntoValido ? { ...this.ultimoPuntoValido } : null;
  }

  getDistanciaKm(): number {
    return this.metrica.distanciaMetros / 1000;
  }

  getRitmoFormateado(): string {
    if (this.metrica.ritmoSegundosPorKm === null) return '--:--';
    const totalSegundos = this.metrica.ritmoSegundosPorKm;
    const min = Math.floor(totalSegundos / 60);
    const seg = Math.floor(totalSegundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  }

  getVelocidadKmh(): number {
    return this.metrica.velocidadMetrosPorSegundo * 3.6;
  }

  getTiempoEnMovimientoFormateado(): string {
    const s = Math.floor(this.metrica.tiempoEnMovimientoSegundos);
    const min = Math.floor(s / 60);
    const seg = s % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  }
}

/**
 * Calcula distancia Haversine entre dos puntos en metros.
 */
export function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Segundos entre dos timestamps ISO.
 */
function tiempoDesdeUltimoSplitSegundos(inicio: string, fin: string): number {
  return (new Date(fin).getTime() - new Date(inicio).getTime()) / 1000;
}
