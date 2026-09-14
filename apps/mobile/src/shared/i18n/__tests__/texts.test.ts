import { texts } from '../texts';

describe('i18n texts', () => {
  it('exposes every locked tab label in neutral Spanish', () => {
    expect(texts.tabs.today).toBe('Hoy');
    expect(texts.tabs.plan).toBe('Plan');
    expect(texts.tabs.events).toBe('Eventos');
    expect(texts.tabs.recovery).toBe('Recuperación');
    expect(texts.tabs.profile).toBe('Perfil');
  });

  it('exposes the core common action keys', () => {
    expect(texts.common.retry).toBe('Reintentar');
    expect(texts.common.seeAll).toBe('Ver todo');
    expect(texts.common.save).toBe('Guardar');
    expect(texts.common.cancel).toBe('Cancelar');
    expect(texts.common.continue).toBe('Continuar');
    expect(texts.common.back).toBe('Volver');
    expect(texts.common.close).toBe('Cerrar');
    expect(texts.common.confirm).toBe('Confirmar');
    expect(texts.common.delete).toBe('Eliminar');
    expect(texts.common.edit).toBe('Editar');
    expect(texts.common.add).toBe('Agregar');
    expect(texts.common.logout).toBe('Cerrar sesión');
    expect(texts.common.settings).toBe('Configuración');
  });

  it('idempotent — exposes state keys with neutral "tienes" voice', () => {
    expect(texts.state.errorTitle).toBe('Ocurrió un error');
    expect(texts.state.errorMessage).not.toMatch(/Revisá/);
    expect(texts.state.emptyTodayTitle).toBe('No hay sesiones para hoy');
    expect(texts.state.emptyPlanTitle).toBe('Aún no tienes sesiones programadas');
    expect(texts.state.emptyEventsTitle).toBe('No hay eventos programados');
    expect(texts.state.emptyNutritionTitle).toBe('Sin registro de comidas hoy');
    expect(texts.state.emptyProgressTitle).toBe('Sin datos todavía');
  });
});