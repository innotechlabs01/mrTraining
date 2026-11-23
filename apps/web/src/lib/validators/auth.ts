import { z } from 'zod';

/**
 * Zod schemas for authentication forms.
 * Shared between client (real-time validation) and server (route handlers).
 * Never trust client-side validation alone — the Go API re-validates everything.
 */

export const signInEmailSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .email({ message: 'Introduce un correo electrónico válido.' }),
});

export const signInPasswordSchema = z.object({
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(1, { message: 'La contraseña es obligatoria.' }),
});

export const signInCodeSchema = z.object({
  code: z
    .string({ required_error: 'El código es obligatorio.' })
    .length(6, { message: 'El código debe tener 6 dígitos.' })
    .regex(/^\d{6}$/, { message: 'El código debe contener solo dígitos.' }),
});

export const signUpEmailSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .email({ message: 'Introduce un correo electrónico válido.' }),
});

export const signUpPasswordSchema = z.object({
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    .regex(/[A-Z]/, {
      message: 'La contraseña debe incluir al menos una mayúscula.',
    })
    .regex(/\d/, {
      message: 'La contraseña debe incluir al menos un número.',
    })
    .regex(/[^A-Za-z0-9]/, {
      message: 'La contraseña debe incluir al menos un carácter especial.',
    }),
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;
export type SignInPasswordInput = z.infer<typeof signInPasswordSchema>;
export type SignInCodeInput = z.infer<typeof signInCodeSchema>;
export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;
export type SignUpPasswordInput = z.infer<typeof signUpPasswordSchema>;
