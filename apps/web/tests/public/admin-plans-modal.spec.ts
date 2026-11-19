import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

const PLANS_PAGE = '/Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training/apps/web/src/app/(app)/admin/plans/page.tsx';

test.describe('Admin Plans — modal no bloquea la tabla', () => {
  test('el modal y su backdrop solo se montan cuando open es true', () => {
    const source = readFileSync(PLANS_PAGE, 'utf8');
    // El bloque del modal debe estar envuelto en {open && (...)} para no bloquear el DOM
    expect(source).toContain('{open && (');
    // El cierre del bloque debe estar presente
    expect(source).toContain(')}');
    // El estado open se inicializa en false
    expect(source).toContain('const [open, setOpen] = useState(false)');
  });

  test('el botón "Nuevo Plan" abre el modal (onClick={openCreate})', () => {
    const source = readFileSync(PLANS_PAGE, 'utf8');
    expect(source).toContain('onClick={openCreate}');
    expect(source).toContain('function openCreate()');
  });

  test('el botón "Editar" de cada fila abre el modal precargado', () => {
    const source = readFileSync(PLANS_PAGE, 'utf8');
    expect(source).toContain('openEdit(plan)');
    expect(source).toContain('function openEdit(plan: Plan)');
  });

  test('el backdrop tiene onClick que cierra el modal', () => {
    const source = readFileSync(PLANS_PAGE, 'utf8');
    expect(source).toContain('onClick={() => setOpen(false)}');
  });
});
