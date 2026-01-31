"use client"

import type React from "react"
import { PasswordInput } from "@/components/ui/password-input"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Zap, Award, Settings, Upload, Loader2 } from "lucide-react"

export default function ParticipantSettingsPage() {
  const { user, isAuthenticated, setUser } = useAuthStore()
  const router = useRouter()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false) // Estado para Cloudinary

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "participant") {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      await api.updateUser(user!.id, {
        name: formData.name,
        username: formData.username,
        email: formData.email,
      })
      setUser({ ...user!, ...formData })
      setIsEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- LÓGICA DE SUBIDA A CLOUDINARY ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validación rápida de tamaño (opcional pero recomendada: 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado pesada. El máximo es 2MB.")
      return
    }

    setIsUploadingAvatar(true)
    try {
      const data = new FormData()
      data.append("file", file)
      data.append("upload_preset", "Proyecto_Imp") // Asegúrate de que este preset sea correcto

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: data,
        }
      )

      const result = await response.json()
      const imageUrl = result.secure_url

      if (imageUrl) {
        // Actualizar en base de datos
        await api.updateUser(user.id, { avatar_url: imageUrl })
        // Actualizar en el estado global (Zustand)
        setUser({ ...user, avatar: imageUrl })
      }
    } catch (error) {
      console.error("Error al subir avatar:", error)
      alert("No se pudo subir la imagen.")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      return
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres")
      return
    }

    setIsLoading(true)
    try {
      await api.updateUser(user!.id, {
        password: passwordData.newPassword,
      })
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setIsEditingPassword(false)
      alert("Contraseña actualizada exitosamente")
    } catch (error) {
      console.error("Error updating password:", error)
      setPasswordError("Error al cambiar la contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  const menuItems = [
    { title: "Mis Cursos", href: "/dashboard/participant", icon: <BookOpen className="w-5 h-5" /> },
    { title: "Cursos Disponibles", href: "/dashboard/participant/courses", icon: <Zap className="w-5 h-5" /> },
    { title: "Actividades", href: "/dashboard/participant/activities", icon: <Award className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/participant/settings", icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 md:ml-0 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Configuración de Perfil</h2>

          <div className="space-y-6 max-w-2xl">
            {/* Foto de Perfil */}
            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="relative">
                  <img
                    src={user?.avatar || "/placeholder.svg"}
                    alt={user?.name}
                    className={`w-20 h-20 rounded-full object-cover border-2 border-slate-100 ${isUploadingAvatar ? 'opacity-40' : ''}`}
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <Button asChild variant="outline" disabled={isUploadingAvatar}>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploadingAvatar ? "Subiendo..." : "Cambiar Foto"}
                      </span>
                    </Button>
                  </Label>
                  <input 
                    id="avatar" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                    disabled={isUploadingAvatar}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Nombre de Usuario</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={isLoading}>
                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Nombre</p>
                      <p className="font-medium text-slate-900">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Usuario</p>
                      <p className="font-medium text-slate-900">{formData.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">{formData.email}</p>
                    </div>
                    <Button onClick={() => setIsEditingProfile(true)}>Editar Perfil</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cambio de Contraseña */}
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingPassword ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">Nueva Contraseña</Label>
                      <PasswordInput
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <PasswordInput
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(value) => setPasswordData({ ...passwordData, confirmPassword: value })}
                        placeholder="Confirma tu nueva contraseña"
                      />
                    </div>
                    {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
                    <div className="flex gap-2">
                      <Button onClick={handleChangePassword} disabled={isLoading}>
                        {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingPassword(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setIsEditingPassword(true)}>Cambiar Contraseña</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}