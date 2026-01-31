"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image" // Importamos Image
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { api } from "@/lib/api"
import { Home } from "lucide-react" // Quitamos BookOpen

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const validateFullName = (name: string): string | null => {
    if (name.trim().length < 3) return "El nombre debe tener al menos 3 caracteres"
    if (/\d/.test(name)) return "El nombre no puede contener números"
    if (!/^[a-záéíóúñ\s]+$/i.test(name)) return "El nombre solo puede contener letras y espacios"
    return null
  }

  const validateUsername = (username: string): string | null => {
    if (username.trim().length < 3) return "El nombre de usuario debe tener al menos 3 caracteres"
    if (!/^[a-z0-9_-]+$/i.test(username)) return "Solo letras, números, guiones y guiones bajos permitidos"
    return null
  }

  const validateEmail = (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Email inválido"
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres"
    if (!/[A-Z]/.test(password)) return "Debe contener al menos una mayúscula"
    if (!/[a-z]/.test(password)) return "Debe contener al menos una minúscula"
    if (!/\d/.test(password)) return "Debe contener al menos un número"
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    const fullNameError = validateFullName(formData.fullName)
    if (fullNameError) newErrors.fullName = fullNameError

    const usernameError = validateUsername(formData.username)
    if (usernameError) newErrors.username = usernameError

    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError

    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      const users: any[] = (await api.getUsers()) ?? []
      if (users.some((u: any) => u.email === formData.email)) {
        setErrors({ email: "Este email ya está registrado" })
        setIsLoading(false)
        return
      }

      if (users.some((u: any) => u.username === formData.username)) {
        setErrors({ username: "Este nombre de usuario ya está en uso" })
        setIsLoading(false)
        return
      }

      const newUser = {
        name: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: "participant",
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
        phone: "",
        created_at: new Date().toISOString().split("T")[0],
      }

      await api.createUser(newUser)
      setSuccess(true)

      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err) {
      const message = (err as any)?.message || 'Error desconocido'
      setErrors({ form: `Error al registrarse: ${message}` })
      console.error("Register error detallado:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-green-50">
          <CardContent className="pt-8 text-center">
            <div className="text-4xl mb-4 text-green-600 font-bold">✓</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">¡Registro Exitoso!</h2>
            <p className="text-green-600 mb-4">Tu cuenta ha sido creada. Redirigiendo al inicio...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          {/* Escudo UNEFA a la izquierda */}
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

          {/* Título Institucional Centrado */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">
              UNEFA
            </h1>
            <p className="text-blue-700 font-bold text-base mt-1">Extensión Universitaria</p>
            <p className="text-gray-700 font-extrabold text-sm uppercase tracking-wide">Núcleo Táchira</p>
          </div>
        </div>

        <p className="text-gray-500 text-xs text-center mb-6 uppercase tracking-[0.25em] font-medium">
          Regístrate como Participante
        </p>

        <Card className="border-0 shadow-2xl ring-1 ring-black/5">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
            {/* <CardDescription>Solo participantes pueden registrarse</CardDescription> */}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Form Fields */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Juan Pérez García"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-blue-600"}
                  required
                />
                {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="juan_perez"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-blue-600"}
                  required
                />
                {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-blue-600"}
                  required
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  placeholder="••••••••"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                {!errors.password && <p className="text-[10px] text-gray-500">Mínimo 8 caracteres, mayúscula, minúscula y número</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {errors.form && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm animate-shake">
                  {errors.form}
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-semibold transition-all mt-2" disabled={isLoading}>
                {isLoading ? "Procesando..." : "Completar Registro"}
              </Button>

              <div className="text-center text-sm text-gray-600 mt-4">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-blue-700 hover:underline font-bold">
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}