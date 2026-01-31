"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookPlus, Trash2, Edit2, Users, BarChart3, Settings, Search, BookOpen, Upload, Loader2, ImageIcon } from "lucide-react"
import Link from "next/link"

interface Course {
  id: number
  title: string
  description: string
  teacherId?: number
  teacher_id?: number
  category: string
  imageUrl?: string
  duration: string
  students: number
  status: string
  created_at?: string
}

function TeacherDashboardContent() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null) // Referencia para el input de archivo

  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false) // Estado de carga para la imagen
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const initialFormState = {
    title: "",
    description: "",
    category: "Programación",
    duration: "4 semanas",
    image_url: "",
  }

  const [formData, setFormData] = useState(initialFormState)
  const [originalFormData, setOriginalFormData] = useState(initialFormState)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadCourses()
  }, [user])

  useEffect(() => {
    const filtered = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredCourses(filtered)
  }, [searchTerm, courses])

  async function loadCourses() {
    try {
      const allCourses = await api.getCourses()
    console.log("Cursos recibidos de la API:", allCourses[0]) // Revisa los nombres en la consola
      
      const teacherCourses = allCourses.filter((c: any) => (c.teacherId ?? c.teacher_id) === user?.id)
      setCourses(teacherCourses)
      setFilteredCourses(teacherCourses)
    } catch (error) {
      console.error("Error loading courses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- LÓGICA DE CLOUDINARY PARA IMÁGENES ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const data = new FormData()
    data.append("file", file)
    data.append("upload_preset", "Proyecto_Imp") // Asegúrate de usar tu preset real

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      )

      if (!response.ok) throw new Error("Error en Cloudinary")
      
      const resData = await response.json()
      setFormData({ ...formData, image_url: resData.secure_url })
      alert("Imagen subida correctamente")
    } catch (error) {
      console.error("Upload error:", error)
      alert("No se pudo subir la imagen")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveCourse = async () => {
    try {
      // Usamos 'image_url' para que coincida con tu columna en Supabase
      if (editingCourse) {
        const changedFields: any = {}
        if (formData.title !== originalFormData.title) changedFields.title = formData.title
        if (formData.description !== originalFormData.description) changedFields.description = formData.description
        if (formData.category !== originalFormData.category) changedFields.category = formData.category
        if (formData.duration !== originalFormData.duration) changedFields.duration = formData.duration
        if (formData.image_url !== originalFormData.image_url) changedFields.image_url = formData.image_url

        if (Object.keys(changedFields).length > 0) {
          await api.updateCourse(editingCourse.id, changedFields)
        }
      } else {
        await api.createCourse({
          ...formData,
          teacher_id: user?.id, // Cambiado a snake_case para Supabase
          status: "active",
          created_at: new Date().toISOString(),
          students: 0
        })
      }
      setIsDialogOpen(false)
      setFormData(initialFormState)
      loadCourses()
    } catch (error) {
      console.error("Error saving course:", error)
    }
  }

  const handleDeleteCourse = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este curso?")) {
      try {
        await api.deleteCourse(id)
        loadCourses()
      } catch (error) {
        console.error("Error deleting course:", error)
      }
    }
  }

  const handleEditCourse = (course: any) => {
    setEditingCourse(course)
    const courseFormData = {
      title: course.title,
      description: course.description,
      category: course.category,
      duration: course.duration,
      image_url: course.imageUrl || "",
    }
    setFormData(courseFormData)
    setOriginalFormData({ ...courseFormData })
    setIsDialogOpen(true)
  }

  const menuItems = [
    { title: "Dashboard", href: "/dashboard/teacher", icon: <BarChart3 className="w-5 h-5" /> },
    { title: "Participantes", href: "/dashboard/teacher/participants", icon: <Users className="w-5 h-5" /> },
    { title: "Tutorial", href: "/dashboard/teacher/tutorial", icon: <BookOpen className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/teacher/settings", icon: <Settings className="w-5 h-5" /> },
  ]


  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 md:ml-0 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Mis Cursos</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingCourse(null); setFormData(initialFormState); }}>
                  <BookPlus className="w-4 h-4 mr-2" />
                  Crear Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCourse ? "Editar Curso" : "Crear Nuevo Curso"}</DialogTitle>
                  <DialogDescription>Completa los detalles del curso y sube una imagen de portada.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  
                  {/* SECCIÓN DE SUBIDA DE IMAGEN */}
                  <div className="grid gap-2">
                    <Label>Imagen de Portada</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded border overflow-hidden bg-slate-100 flex items-center justify-center">
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {formData.image_url ? "Cambiar Imagen" : "Subir Imagen"}
                        </Button>
                        <p className="text-[10px] text-slate-500 mt-1 text-center">Recomendado: 800x450px</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duración</Label>
                      <Input id="duration" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleSaveCourse} className="w-full" disabled={isUploading}>
                    {editingCourse ? "Actualizar" : "Crear"} Curso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ... Resto del componente (Buscador y Grid de cursos) ... */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <div className="h-40 bg-slate-200 relative">
                    <img 
                      src={course.imageUrl || "/placeholder.svg"} 
                      alt={course.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">{course.description}</p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/dashboard/teacher/course/${course.id}`}>Gestionar</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditCourse(course)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteCourse(course.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={null}>
      <TeacherDashboardContent />
    </Suspense>
  )
}