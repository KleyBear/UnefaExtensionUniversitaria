# Conexión con Supabase

Pasos mínimos para conectar el frontend con la base de datos de Supabase usando este repo.

- Variables de entorno (ya tienes estas en `.env`):
  - `VITE_SUPABASE_URL` — tu URL de Supabase
  - `VITE_SUPABASE_ANON_KEY` — tu clave anon (publica)

- Dependencias: este proyecto ya incluye `@supabase/supabase-js` en `package.json`.

- Scripts de desarrollo (ejemplo):

```bash
npm install
npm run dev
```

Uso en código:

- Cliente compartido: [Frontend/lib/supabase.ts](Frontend/lib/supabase.ts#L1)
- Helpers CRUD: [Frontend/lib/supabaseHelpers.ts](Frontend/lib/supabaseHelpers.ts#L1)
- Hook de auth: [Frontend/hooks/useSupabaseAuth.ts](Frontend/hooks/useSupabaseAuth.ts#L1)

Ejemplo rápido en un componente React:

```tsx
import { useEffect, useState } from "react";
import { getCourses } from "lib/supabaseHelpers";

export default function CoursesList() {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    getCourses().then(setCourses).catch(console.error);
  }, []);

  return (
    <ul>
      {courses.map((c) => (
        <li key={c.id}>{c.title}</li>
      ))}
    </ul>
  );
}
```

Ejemplo de autenticación con el hook:

```tsx
import useSupabaseAuth from "hooks/useSupabaseAuth";

function Login() {
  const { signIn, session } = useSupabaseAuth();

  const onSubmit = async (email, password) => {
    await signIn(email, password);
  };

  return <div>{session ? "Logged" : "Not logged"}</div>;
}
```

Notas de seguridad:

- `VITE_SUPABASE_ANON_KEY` es pública y está pensada para uso en frontend. No pongas claves de servicio en el cliente.
- Para acciones administrativas o subida a Cloudinary usa un backend seguro (`VITE_BACKEND_URL` apunta a `http://localhost:4000`).
