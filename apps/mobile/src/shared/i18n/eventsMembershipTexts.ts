/**
 * Events + membership screen copy (Spanish, neutral/professional).
 *
 * Split from `miscScreensTexts.ts` (line budget). Re-exported there via spread.
 */
export const eventsMembershipTexts = {
  eventDetail: {
    headerTitle: 'Evento',
    loading: 'Cargando evento...',
    loadError: 'No se pudo cargar el evento',
    typePlaceholder: 'Ironman, Beginner',
    requiredField: 'Campo requerido',
    requiredBody: 'Por favor completa "{field}".',
    savedTitle: 'Listo',
    savedBody: 'Tu respuesta fue guardada.',
    errorTitle: 'Error',
    saveFailed: 'No se pudo guardar tu respuesta.',
  },
  eventsScreen: {
    headerTitle: 'Eventos',
    loading: 'Cargando eventos...',
    emptyDay: 'No hay eventos este día',
    fallbackTitle: 'Evento',
  },
  eventListItemsCard: {
    sectionTitle: 'Contenido',
  },
  eventRegistrationForm: {
    numberLabel: 'Número',
    answerPlaceholder: 'Ingresa tu respuesta',
    title: 'Inscripción',
  },
  eventResponseCta: {
    confirmed: 'Confirmado',
    cancelAttendance: 'Cancelar asistencia',
    acceptAgain: 'Aceptar de nuevo',
    accept: 'Aceptar evento',
  },
  eventRunningInfoCard: {
    numbers: 'Números',
  },
  paymentScreen: {
    headerTitle: 'Checkout',
    expiredTitle: 'Membresía vencida',
    planLabel: 'Plan',
    amountLabel: 'Monto',
    dueDateLabel: 'Vencimiento',
    processing: 'Procesando…',
    notAvailable: 'N/A',
    checkoutFailedTitle: 'Checkout',
    checkoutFailedBody: 'No se pudo iniciar el checkout seguro.',
    genericErrorTitle: 'Checkout',
    genericErrorBody: 'Algo salió mal. Intenta de nuevo.',
  },
  pendingApproval: {
    title: 'Esperando aprobación',
    body: 'Tu perfil fue creado. Tu coach revisará tu rutina antes de activar tu cuenta.',
    appointmentTitle: 'Tu cita',
    dateLabel: 'Fecha',
    timeLabel: 'Hora',
    coachLabel: 'Coach',
    tbd: 'A confirmar',
    infoBody:
      'Tu coach revisará tus deportes, objetivos y nivel de experiencia, y activará tu plan personalizado.',
  },
  membershipScreen: {
    statusActive: 'Activa',
    statusGrace: 'Período de gracia',
    statusSuspended: 'Suspendida',
    statusNone: 'Sin membresía',
    payCta: 'Pagar membresía',
    unavailable: 'La membresía no está disponible. Contacta a tu entrenador.',
    checkoutFailedTitle: 'Checkout',
    checkoutFailedBody: 'No se pudo iniciar el checkout seguro.',
    genericErrorTitle: 'Checkout',
    genericErrorBody: 'Algo salió mal. Intenta de nuevo.',
    planTitle: 'Tu plan',
    expiringTitle: 'Tu membresía está por vencer',
    expiringBody: 'Renueva tu membresía para no perder el acceso a tu plan.',
    renewCta: 'Renovar',
    historyTitle: 'Historial de pagos',
    noPayments: 'Sin pagos aún',
    payNow: 'Pagar ahora',
    periodPrefix: 'Período: ',
    periodSep: ' al ',
    duePrefix: 'Vence: ',
    paidUp: 'Al día · Próximo vencimiento ',
  },
} as const;
