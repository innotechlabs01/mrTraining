import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  signInWithPassword,
  registerWithPassword,
  signOutFromClerk,
  getCurrentUserClerk,
  verifyTokenForBackend,
} from '../services/clerkApi';
import { Alert } from 'react-native';

export interface AuthState {
  user: ClerkUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Hook personalizado para autenticación usando Clerk API REST.
 * 
 * Ventajas:
 * - Diseño UI completamente personalizable
 * - Funciona en Expo Go (sin TurboModule issues)
 * - Mismo token JWT para Go API
 * - Control total sobre flujos de auth
 */
export function useClerkAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });
  const navigation = useNavigation();

  // Cargar usuario al montar
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await getCurrentUserClerk();
      setState({
        user,
        isLoading: false,
        error: null,
        isAuthenticated: user !== null,
      });
    } catch (error: any) {
      console.error('Error cargando usuario de Clerk:', error);
      setState({
        user: null,
        isLoading: false,
        error: error.message,
        isAuthenticated: false,
      });
    }
  }, []);

  // Forzar recarga de datos del usuario
  const refreshUser = useCallback(() => {
    loadUser();
  }, []);

  /** Inicio de sesión con email y password */
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await signInWithPassword(email, password);
      
      // Verificar token con tu Go API antes de considerar autenticado
      if (result.token) {
        await verifyTokenForBackend(result.token);
      }
      
      setState({
        user: {
          id: result.user_id || '',
          email,
          full_name: result.full_name || null,
          image_url: result.image_url || null,
          username: result.username || null,
          last_sign_in_at: result.last_sign_in_at || null,
          created_at: result.created_at || new Date().toISOString(),
          token: result.token,
        },
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });
      
      // Después de sign-in exitoso, verificar membresía
      nav.replace('MembershipCheck');
    } catch (error: any) {
      console.error('Error en signIn:', error);
      setState({
        user: null,
        isLoading: false,
        error: error.message || 'Falló el inicio de sesión',
        isAuthenticated: false,
      });
      Alert.alert('Error', error.message || 'Credenciales inválidas');
    }
  }, [navigate]);

  /** Registro nuevo usuario con email y password */
  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await registerWithPassword(email, password, fullName);
        
        // Verificar token
        if (result.token) {
          await verifyTokenForBackend(result.token);
        }
        
        setState({
          user: {
            id: result.id || result.user_id || '',
            email,
            full_name: fullName || null,
            image_url: result.image_url || null,
            username: result.username || null,
            last_sign_in_at: null,
            created_at: result.created_at || new Date().toISOString(),
            token: result.token,
          },
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
        
navigation.navigate('AthleteTabs', { screen: 'Home' });
      } catch (error: any) {
        console.error('Error en signup:', error);
        setState({
          user: null,
          isLoading: false,
          error: error.message || 'Falló el registro',
          isAuthenticated: false,
        });
        Alert.alert('Error', error.message || 'No fue posible registrarse');
      }
    },
    [navigate],
  );

  /** Cierra la sesión */
  const handleSignOut = useCallback(async () => {
    try {
      await signOutFromClerk();
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
      navigation.navigate('AuthStack', 'SignIn');
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [navigate]);

  return {
    ...state,
    signIn,
    signup,
    handleSignOut,
    refreshUser,
  };
}