import { createClient } from '@supabase/supabase-js';

// Soportar Next.js (`process.env.NEXT_PUBLIC_*`) y Vite (`import.meta.env`/`VITE_*`).
// Preferimos las vars públicas de Next si están disponibles.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = supabaseUrl || ''

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseKey)

if (!SUPABASE_CONFIGURED) {
	// En desarrollo es útil avisar; en producción asegúrate de configurar correctamente.
	// eslint-disable-next-line no-console
	console.warn('Supabase: faltan variables de entorno (NEXT_PUBLIC_/VITE_). Revisa .env')
}

export const supabase = SUPABASE_CONFIGURED
	? createClient(supabaseUrl as string, supabaseKey as string)
	: // crear un cliente mínimo que fallará con mensajes claros si se usa sin configurar
		// @ts-ignore
		({
			from: () => {
				throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
			},
		})
;