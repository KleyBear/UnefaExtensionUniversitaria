"use client"

import { Suspense, useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Trash2, Edit2, Users, BookOpen, 
  BarChart3, Settings, Search, Upload, Loader2, Plus 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Course {
  id: number
  title: string
  description: string
  teacherId: number
  teacherName?: string
  category: string
  image: string
  duration: string
  students: number
  status: string
  createdAt: string
}

function CoursesPageContent() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  
  // Estados
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  
  // Estados para subida de imagen
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const initialFormState = {
    title: "",
    description: "",
    category: "Programación",
    duration: "4 semanas",
    image: "",
  }

  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase()
    const filtered = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerSearch) ||
        c.description.toLowerCase().includes(lowerSearch) ||
        c.category.toLowerCase().includes(lowerSearch) ||
        c.teacherName?.toLowerCase().includes(lowerSearch),
    )
    setFilteredCourses(filtered)
  }, [searchTerm, courses])

  async function loadCourses() {
    try {
      const [allCourses, users] = await Promise.all([api.getCourses(), api.getUsers()])
      const coursesWithTeacher = allCourses.map((c: any) => ({
        ...c,
        image: c.image || c.imageUrl || "",
        teacherName: users.find((u: any) => u.id === c.teacherId)?.name || "Desconocido",
      }))
      setCourses(coursesWithTeacher)
      setFilteredCourses(coursesWithTeacher)
    } catch (error) {
      console.error("Error loading courses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- LÓGICA DE CLOUDINARY ---
  const uploadToCloudinary = async (file: File) => {
    setIsUploading(true)
    const data = new FormData()
    data.append("file", file)
    data.append("upload_preset", "Proyecto_Imp") 

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        { method: "POST", body: data }
      )
      if (!response.ok) throw new Error("Error en subida")
      const res = await response.json()
      setFormData(prev => ({ ...prev, image: res.secure_url }))
    } catch (error) {
      console.error("Cloudinary error:", error)
      alert("Error al subir la imagen")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadToCloudinary(e.dataTransfer.files[0])
    }
  }

  const handleSaveCourse = async () => {
    if (!formData.image) return alert("Por favor sube una imagen para el curso")
    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse.id, formData)
      } else {
        await api.createCourse({
          ...formData,
          teacherId: user?.id,
          students: 0,
          status: "active",
          created_at: new Date().toISOString().split("T")[0],
        })
      }
      setIsDialogOpen(false)
      loadCourses()
    } catch (error) {
      console.error("Error saving course:", error)
    }
  }

  const handleDeleteCourse = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar este curso?")) {
      await api.deleteCourse(id)
      loadCourses()
    }
  }

  const menuItems = [
    { title: "Dashboard", href: "/dashboard/admin", icon: <BarChart3 className="w-5 h-5" /> },
    { title: "Usuarios", href: "/dashboard/admin/users", icon: <Users className="w-5 h-5" /> },
    { title: "Cursos", href: "/dashboard/admin/courses", icon: <BookOpen className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/admin/settings", icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Gestión de Cursos</h2>
            <Button onClick={() => { setEditingCourse(null); setFormData(initialFormState); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Curso
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6 text-slate-400 focus-within:text-blue-500 transition-colors">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                <Input
                  placeholder="Buscar curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="group hover:shadow-xl transition-all border-none overflow-hidden bg-white">
                  <div className="h-44 bg-slate-200 relative overflow-hidden">
                    <img
                      src={course.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={course.title}
                    />
                    <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {course.category}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <CardTitle className="text-lg mb-2 line-clamp-1">{course.title}</CardTitle>
                    <p className="text-sm text-slate-black line-clamp-2 mb-4 h-10">{course.description}</p>
                    
                    <div className="flex justify-between items-center text-xs font-medium text-slate-black mb-5 pb-4 border-b">
                       <span>{course.teacherName}</span>
                       <span className="bg-slate-100 px-2 py-1 rounded">{course.duration}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/dashboard/admin/course/${course.id}`} className="w-full">
                        <Button className="w-full bg-blue-800 hover:bg-blue-600 transition-colors" size="sm">
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Contenido y Video
                        </Button>
                      </Link>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 text-xs" size="sm" onClick={() => {
                          setEditingCourse(course);
                          setFormData({
                            title: course.title,
                            description: course.description,
                            category: course.category,
                            duration: course.duration,
                            image: course.image
                          });
                          setIsDialogOpen(true);
                        }}>
                          Info Básica
                        </Button>
                        <Button variant="outline" className="text-red-500 hover:bg-red-50 border-red-100" size="sm" onClick={() => handleDeleteCourse(course.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Dialogo con Subida de Imagen estilo "Teacher" */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Editar Curso" : "Nuevo Curso"}</DialogTitle>
                <DialogDescription>Configura los detalles principales y la imagen de portada.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                {/* Zona de Carga de Imagen */}
                <div
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                    dragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {formData.image ? (
                    <>
                      <img src={formData.image} className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium">Soltar nueva imagen para cambiar</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500">Arrastra la portada aquí</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Título</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Descripción</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Categoría</Label>
                    <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Duración</Label>
                    <Input value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
                  </div>
                </div>

                <Button onClick={handleSaveCourse} className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={isUploading}>
                  {editingCourse ? "Actualizar Curso" : "Crear Curso"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesPageContent />
    </Suspense>
  )
}