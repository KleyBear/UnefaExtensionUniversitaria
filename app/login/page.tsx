"use client";

import { supabase } from '@/lib/supabase'
import { useState } from "react"
import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image" 
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useAuthStore } from "@/lib/auth-store"
import { Home } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, login } = useAuthStore()

  useEffect(() => {
    if (user) {
      const roleRoutes: Record<string, string> = {
        admin: "/dashboard/admin",
        teacher: "/dashboard/teacher",
        participant: "/dashboard/participant",
      }
      router.push(roleRoutes[user.role] || "/")
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw new Error(error.message);

      if (!data) {
          setError("Usuario no encontrado");
          return;
      }

      if (data.password === password) {
        login({
          id: data.id,
          name: data.name,
          username: data.username,
          email: data.email,
          phone: data.phone,
          role: data.role,
          avatar: (data as any).avatar_url || (data as any).avatar || '',
        })

        const roleRoutes: Record<string, string> = {
          admin: "/dashboard/admin",
          teacher: "/dashboard/teacher",
          participant: "/dashboard/participant",
        }

        router.push(roleRoutes[data.role] || "/")
      } else {
        setError("Contraseña incorrecta");
      }

    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent border-blue-200 text-blue-700 hover:bg-blue-50">
              <Home className="w-4 h-4" />
              Volver a Inicio
            </Button>
          </Link>
        </div>

        {/* Encabezado con Escudo a la Izquierda y Título Centrado Grande */}
        <div className="relative mb-8 flex items-center justify-center min-h-[100px]">
          {/* Imagen a la izquierda (Posicionamiento Absoluto) */}
          <div className="absolute left-0">
            <Image 
              src="/Escudo_unefa.png" 
              alt="Escudo UNEFA" 
              width={70} 
              height={70} 
              className="object-contain" 
              priority 
            />
          </div>

          {/* Título Centrado y más Grande */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">
              UNEFA
            </h1>
            <p className="text-blue-700 font-bold text-base mt-1">Extensión Universitaria</p>
            <p className="text-gray-700 font-extrabold text-sm uppercase tracking-wide">Núcleo Táchira</p>
          </div>
        </div>

        <p className="text-gray-500 text-xs text-center mb-6 uppercase tracking-[0.25em] font-medium">
          Plataforma de Cursos en Línea
        </p>

        <Card className="border-0 shadow-2xl ring-1 ring-black/5">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl font-bold">Inicia Sesión</CardTitle>
            <CardDescription>Bienvenido al sistema académico</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@unefa.edu.ve"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-blue-600 h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-semibold transition-all" disabled={isLoading}>
                {isLoading ? "Validando..." : "Ingresar al Sistema"}
              </Button>

              <div className="text-center text-sm text-gray-600 mt-4">
                ¿No tienes una cuenta?{" "}
                <Link href="/register" className="text-blue-700 hover:underline font-bold">
                  Crea una aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}