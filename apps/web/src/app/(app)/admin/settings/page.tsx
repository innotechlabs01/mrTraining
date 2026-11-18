'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSession } from '@clerk/nextjs';
import {
  Shield, DollarSign, Settings, Bell, Palette, Database,
  AlertCircle, CheckCircle, Key, Globe as GlobeIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader, primaryButtonClass } from '@/components/admin/ui';

interface SettingsTabProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsSection({ label, icon, children }: SettingsTabProps) {
  return (
    <div className="bg-surface-1 rounded-xl border border-surface-6 p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          {icon}
        </div>
        <h3 className="min-w-0 text-base font-semibold leading-snug text-text-primary sm:text-lg">
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-6 last:border-0">
      <div>
        <p className="font-medium text-text-primary">{label}</p>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative block h-6 w-11 rounded-full bg-surface-3 transition-colors peer-checked:bg-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
          <span
            className={cn(
              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              checked && 'translate-x-5',
            )}
          />
        </span>
      </label>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, placeholder, disabled }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function AdminSettingsPage() {
  const { user } = useUser();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'appearance' | 'integrations' | 'database'>('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    platformName: 'MR Training',
    platformUrl: 'https://mrtraining.app',
    supportEmail: 'soporte@mrtraining.app',
    defaultLanguage: 'es-ES',
    timezone: 'America/Bogota',
    maintenanceMode: false,
    // Security
    require2FA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    // Appearance
    primaryColor: '#15AAF2',
    darkMode: 'system',
    compactMode: false,
    // Integrations
    wompiPublicKey: '',
    wompiPrivateKey: '',
    wompiEnv: 'sandbox',
    wompiWebhookUrl: '',
    clerkPublishableKey: '',
    clerkSecretKey: '',
    // Database
    backupEnabled: true,
    backupFrequency: 'daily',
    backupRetention: 30,
  });

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const isSuperAdmin = user?.id && superAdminIds.includes(user.id);

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'security', label: 'Seguridad', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Apariencia', icon: <Palette size={18} /> },
    { id: 'integrations', label: 'Integraciones', icon: <GlobeIcon size={18} /> },
    { id: 'database', label: 'Base de Datos', icon: <Database size={18} /> },
  ];

  const handleSave = async (key: string, value: string | boolean) => {
    setSaving(true);
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      // Save to API
      await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await session?.getToken()}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
      setMessage({ text: 'Guardado correctamente', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Guarda toda la configuración de un solo clic (el botón principal de la página).
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await session?.getToken()}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setMessage({ text: 'Todos los cambios se guardaron correctamente', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Error al guardar los cambios', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Parámetros generales, seguridad e integraciones de la plataforma."
        actions={
          <button onClick={handleSaveAll} disabled={saving} className={primaryButtonClass}>
            <CheckCircle size={16} /> {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        }
      />

      {message && (
        <div className={`mb-6 p-3 rounded-lg ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs — scrolls horizontally instead of overflowing on small screens */}
      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="flex gap-1 overflow-x-auto border-b border-surface-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-secondary hover:border-surface-6 hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div role="tabpanel" className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <SettingsSection label="Información de la Plataforma" icon={<Settings size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Nombre de la Plataforma"
                  value={settings.platformName}
                  onChange={v => handleSave('platformName', v)}
                  placeholder="MR Training"
                />
                <InputField
                  label="URL de la Plataforma"
                  type="url"
                  value={settings.platformUrl}
                  onChange={v => handleSave('platformUrl', v)}
                  placeholder="https://mrtraining.app"
                />
                <InputField
                  label="Email de Soporte"
                  type="email"
                  value={settings.supportEmail}
                  onChange={v => handleSave('supportEmail', v)}
                  placeholder="soporte@mrtraining.app"
                />
                <SelectField
                  label="Idioma por Defecto"
                  value={settings.defaultLanguage}
                  onChange={v => handleSave('defaultLanguage', v)}
                  options={[
                    { value: 'es-ES', label: 'Español (España)' },
                    { value: 'es-MX', label: 'Español (México)' },
                    { value: 'es-AR', label: 'Español (Argentina)' },
                    { value: 'en-US', label: 'English (US)' },
                    { value: 'en-GB', label: 'English (UK)' },
                  ]}
                />
                <SelectField
                  label="Zona Horaria"
                  value={settings.timezone}
                  onChange={v => handleSave('timezone', v)}
                  options={[
                    { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
                    { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
                    { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                />
              </div>
            </SettingsSection>

            <SettingsSection label="Modo de Mantenimiento" icon={<AlertCircle size={18} />}>
              <Toggle
                label="Modo de Mantenimiento"
                description="Deshabilita el acceso a la plataforma para todos excepto super admins"
                checked={settings.maintenanceMode}
                onChange={v => handleSave('maintenanceMode', v)}
              />
            </SettingsSection>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <SettingsSection label="Autenticación" icon={<Shield size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle
                  label="Autenticación de Dos Factores (2FA) Obligatoria"
                  description="Requerir 2FA para todos los usuarios"
                  checked={settings.require2FA}
                  onChange={v => handleSave('require2FA', v)}
                />
                <InputField
                  label="Tiempo de Sesión (minutos)"
                  type="number"
                  value={settings.sessionTimeout.toString()}
                  onChange={v => handleSave('sessionTimeout', v)}
                  placeholder="30"
                />
                <InputField
                  label="Máximos Intentos de Login"
                  type="number"
                  value={settings.maxLoginAttempts.toString()}
                  onChange={v => handleSave('maxLoginAttempts', v)}
                  placeholder="5"
                />
                <InputField
                  label="Longitud Mínima de Contraseña"
                  type="number"
                  value={settings.passwordMinLength.toString()}
                  onChange={v => handleSave('passwordMinLength', v)}
                  placeholder="8"
                />
              </div>
            </SettingsSection>

            <SettingsSection label="Claves de API" icon={<Key size={18} />}>
              <div className="space-y-4">
                <InputField
                  label="Clerk Publishable Key"
                  type="password"
                  value={settings.clerkPublishableKey}
                  onChange={v => handleSave('clerkPublishableKey', v)}
                  placeholder="pk_test_..."
                />
                <InputField
                  label="Clerk Secret Key"
                  type="password"
                  value={settings.clerkSecretKey}
                  onChange={v => handleSave('clerkSecretKey', v)}
                  placeholder="sk_test_..."
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <SettingsSection label="Canales de Notificación" icon={<Bell size={18} />}>
              <div className="space-y-4">
                <Toggle
                  label="Notificaciones por Email"
                  description="Enviar notificaciones por correo electrónico"
                  checked={settings.emailNotifications}
                  onChange={v => handleSave('emailNotifications', v)}
                />
                <Toggle
                  label="Notificaciones Push"
                  description="Enviar notificaciones push a dispositivos"
                  checked={settings.pushNotifications}
                  onChange={v => handleSave('pushNotifications', v)}
                />
                <Toggle
                  label="Notificaciones SMS"
                  description="Enviar notificaciones por mensaje de texto"
                  checked={settings.smsNotifications}
                  onChange={v => handleSave('smsNotifications', v)}
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <SettingsSection label="Tema y Colores" icon={<Palette size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Color Primario (Hex)"
                  type="color"
                  value={settings.primaryColor}
                  onChange={v => handleSave('primaryColor', v)}
                />
                <SelectField
                  label="Modo Oscuro"
                  value={settings.darkMode}
                  onChange={v => handleSave('darkMode', v)}
                  options={[
                    { value: 'light', label: 'Claro' },
                    { value: 'dark', label: 'Oscuro' },
                    { value: 'system', label: 'Sistema' },
                  ]}
                />
                <Toggle
                  label="Modo Compacto"
                  description="Reduce el espaciado para mostrar más información"
                  checked={settings.compactMode}
                  onChange={v => handleSave('compactMode', v)}
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <SettingsSection label="Wompi (Pagos)" icon={<DollarSign size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Clave Pública Wompi"
                  type="password"
                  value={settings.wompiPublicKey}
                  onChange={v => handleSave('wompiPublicKey', v)}
                  placeholder="pub_prod_... / pub_test_..."
                />
                <InputField
                  label="Clave Privada Wompi"
                  type="password"
                  value={settings.wompiPrivateKey}
                  onChange={v => handleSave('wompiPrivateKey', v)}
                  placeholder="prv_prod_... / prv_test_..."
                />
                <SelectField
                  label="Entorno Wompi"
                  value={settings.wompiEnv}
                  onChange={v => handleSave('wompiEnv', v)}
                  options={[
                    { value: 'sandbox', label: 'Sandbox (Pruebas)' },
                    { value: 'production', label: 'Producción' },
                  ]}
                />
                <InputField
                  label="Webhook URL Wompi"
                  type="url"
                  value={settings.wompiWebhookUrl || ''}
                  onChange={v => handleSave('wompiWebhookUrl', v)}
                  placeholder="https://tu-dominio.com/api/webhooks/wompi"
                />
              </div>
            </SettingsSection>

            <SettingsSection label="Clerk (Autenticación)" icon={<Shield size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Clerk Publishable Key"
                  type="password"
                  value={settings.clerkPublishableKey}
                  onChange={v => handleSave('clerkPublishableKey', v)}
                  placeholder="pk_test_..."
                />
                <InputField
                  label="Clerk Secret Key"
                  type="password"
                  value={settings.clerkSecretKey}
                  onChange={v => handleSave('clerkSecretKey', v)}
                  placeholder="sk_test_..."
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <SettingsSection label="Respaldo Automático" icon={<Database size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Toggle
                  label="Respaldo Automático Habilitado"
                  description="Realizar respaldos automáticos de la base de datos"
                  checked={settings.backupEnabled}
                  onChange={v => handleSave('backupEnabled', v)}
                />
                <SelectField
                  label="Frecuencia"
                  value={settings.backupFrequency}
                  onChange={v => handleSave('backupFrequency', v)}
                  options={[
                    { value: 'hourly', label: 'Cada hora' },
                    { value: 'daily', label: 'Diario' },
                    { value: 'weekly', label: 'Semanal' },
                  ]}
                />
                <SelectField
                  label="Retención (días)"
                  value={settings.backupRetention.toString()}
                  onChange={v => handleSave('backupRetention', v)}
                  options={[
                    { value: '7', label: '7 días' },
                    { value: '30', label: '30 días' },
                    { value: '90', label: '90 días' },
                    { value: '365', label: '1 año' },
                  ]}
                />
              </div>
            </SettingsSection>

            <SettingsSection label="Conexión a Base de Datos" icon={<Database size={18} />}>
              <p className="mb-4 text-sm text-text-secondary">
                La conexión se gestiona mediante variables de entorno de la API (DATABASE_URL).
                No es editable desde la interfaz.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField label="Database URL" type="password" value="••••••••" disabled onChange={() => {}} />
                <InputField label="Pool Size" type="number" value="10" disabled onChange={() => {}} />
              </div>
            </SettingsSection>
          </div>
        )}
      </div>
    </div>
  );
}