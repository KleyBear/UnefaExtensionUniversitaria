"use client"

import type React from "react"
import { use, useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileText, Video, Users, BarChart3, Settings, 
  Trash2, Plus, Edit2, Upload, Loader2, 
  ExternalLink, FileDown 
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import { ActivityManager } from "@/components/activity-manager"

// --- INTERFACES ---
interface Course {
  id: number
  title: string
  description: string
  videoUrl: string
}

interface Participant {
  id: number
  name: string
  email: string
  avatar: string
}

const getDownloadUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

const getEmbedUrl = (url: string) => {
  if (!url) return ""
  if (url.includes("youtube.com/embed/")) return url
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url
}

export default function CoursePage({ params }: { params: unknown }) {
  const resolvedParams = use(params as unknown as Promise<{ id: string }>)
  const idStr = (resolvedParams as { id: string }).id
  const id = Number(idStr)
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()

  const [course, setCourse] = useState<Course | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [isEditingVideo, setIsEditingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [dragActive, setDragActive] = useState(false)
  
  const [resourceForm, setResourceForm] = useState({
    name: "",
    url: "",
    type: "pdf",
  })

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadCourseData()
  }, [id])

  async function loadCourseData() {
    try {
      const courseData = await api.getCourseById(Number(id))
      const ownerId = (courseData as any).teacherId ?? (courseData as any).teacher_id
      
      if (String(ownerId) !== String(user?.id)) {
        router.push("/dashboard/teacher")
        return
      }

      setCourse(courseData)
      setVideoUrl(courseData.videoUrl || "")

      const [enrollments, usersRaw, resourcesResponse] = await Promise.all([
        api.getEnrollments(), 
        api.getUsers(),
        supabase.from('resources').select('*').eq('course_id', id)
      ])

      const users: any[] = usersRaw ?? []
      const courseEnrollments = enrollments.filter((e: any) => Number(e.courseId) === Number(id))

      // --- CORRECCIÓN AQUÍ: MAPEADO ROBUSTO DE AVATAR ---
      const participantList = courseEnrollments
        .map((e: any) => users.find((u: any) => String(u.id) === String(e.userId)))
        .filter((u: any) => u && u.role === "participant")
        .map((u: any) => ({ 
          id: u.id, 
          name: u.name || "Usuario", 
          email: u.email || "", 
          // Intentamos obtener la imagen de cualquier campo posible
          avatar: u.avatar || u.avatar_url || u.avatarUrl || "/placeholder.svg" 
        }))

      setParticipants(participantList)
      
      if (resourcesResponse.data) {
        setResources(resourcesResponse.data)
      }
      
    } catch (error) {
      console.error("Error loading course:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // ... (Funciones uploadToCloudinary, handleDrag, handleDrop, handleAddResource, handleDeleteResource, handleUpdateVideo se mantienen igual)
  const uploadToCloudinary = async (file: File) => {
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "Proyecto_Imp") 

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        { method: "POST", body: formData }
      )
      
      if (!response.ok) throw new Error("Error en la subida a Cloudinary")
      
      const data = await response.json()
      setIsUploading(false)
      return data.secure_url 
    } catch (error) {
      setIsUploading(false)
      console.error("Error subiendo a Cloudinary:", error)
      alert("Error al subir el archivo.")
      return null
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      const fileUrl = await uploadToCloudinary(file)
      
      if (fileUrl) {
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || "other"
        const typeMap: { [key: string]: string } = {
          pdf: "pdf", doc: "doc", docx: "doc", ppt: "ppt", pptx: "ppt",
          xls: "xls", xlsx: "xls", mp4: "video", mov: "video", png: "image", jpg: "image"
        }

        setResourceForm({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: fileUrl,
          type: typeMap[fileExtension] || "other",
        })
      }
    }
  }

  const handleAddResource = async () => {
    if (!resourceForm.name || !resourceForm.url) {
      alert("Por favor selecciona un archivo")
      return
    }

    try {
      const { data, error } = await supabase
        .from('resources')
        .insert([
          {
            course_id: id,
            name: resourceForm.name,
            type: resourceForm.type,
            file_url: resourceForm.url
          }
        ])
        .select()

      if (error) throw error

      if (data) {
        setResources([...resources, data[0]])
        setResourceForm({ name: "", url: "", type: "pdf" })
        setIsAddingResource(false)
        alert("Recurso agregado con éxito")
      }
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    }
  }

  const handleDeleteResource = async (resourceId: number) => {
    if (!confirm("¿Eliminar este recurso?")) return
    try {
      const { error } = await supabase.from('resources').delete().eq('id', resourceId)
      if (error) throw error
      setResources(resources.filter((r: any) => r.id !== resourceId))
    } catch (error) {
      alert("No se pudo eliminar el recurso")
    }
  }

  const handleUpdateVideo = async () => {
    if (!videoUrl) return alert("Ingresa una URL")
    try {
      await api.updateCourse(Number(id), { video_url: videoUrl })
      setCourse(course ? { ...course, videoUrl } : null)
      setIsEditingVideo(false)
      alert("Video actualizado")
    } catch (error) {
      alert("No se pudo actualizar el video")
    }
  }

  const menuItems = [
    { title: "Dashboard", href: "/dashboard/teacher", icon: <BarChart3 className="w-5 h-5" /> },
    { title: "Participantes", href: "/dashboard/teacher/participants", icon: <Users className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/teacher/settings", icon: <Settings className="w-5 h-5" /> },
  ]

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>
  if (!course) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{course.title}</h2>
              <p className="text-slate-600">{course.description}</p>
            </div>
            <Link href="/dashboard/teacher">
              <Button variant="outline">Volver</Button>
            </Link>
          </div>

          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content"><Video className="w-4 h-4 mr-2" />Contenido</TabsTrigger>
              <TabsTrigger value="activities"><FileText className="w-4 h-4 mr-2" />Actividades</TabsTrigger>
              <TabsTrigger value="participants"><Users className="w-4 h-4 mr-2" />Participantes ({participants.length})</TabsTrigger>
            </TabsList>

            {/* Contenido y Actividades se mantienen iguales... */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5" />Video del Curso</CardTitle>
                  <Dialog open={isEditingVideo} onOpenChange={setIsEditingVideo}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Edit2 className="w-4 h-4 mr-2" />Cambiar Video</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Actualizar Video</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL del video..." />
                        <Button onClick={handleUpdateVideo} className="w-full">Guardar Video</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {course.videoUrl ? (
                    <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                      {course.videoUrl.includes('cloudinary') ? (
                        <video src={course.videoUrl} controls className="w-full h-full" />
                      ) : (
                        <iframe width="100%" height="100%" src={getEmbedUrl(course.videoUrl)} frameBorder="0" allowFullScreen />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">Sin video</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Recursos del Curso</CardTitle>
                  <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Agregar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subir Archivo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-lg p-10 text-center transition ${
                            dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"
                          }`}
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                              <p className="mt-2 text-sm">Subiendo...</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                              <p className="text-sm">Arrastra aquí o selecciona un archivo</p>
                            </>
                          )}
                        </div>
                        <Input
                          placeholder="Nombre del recurso"
                          value={resourceForm.name}
                          onChange={(e) => setResourceForm({...resourceForm, name: e.target.value})}
                        />
                        <Button onClick={handleAddResource} className="w-full" disabled={isUploading || !resourceForm.url}>
                          Confirmar y Guardar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {resources.map((res: any) => (
                      <div key={res.id} className="flex items-center justify-between p-3 border rounded-xl bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-slate-900">{res.name}</p>
                            <p className="text-[10px] uppercase text-slate-400 font-bold">{res.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <a 
                            href={res.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <a 
                            href={getDownloadUrl(res.file_url)} 
                            download={res.name}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                            title="Descargar"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>

                          <Button variant="ghost" size="sm" onClick={() => handleDeleteResource(res.id)} className="rounded-full">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {resources.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No hay recursos cargados.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <ActivityManager courseId={id} />
            </TabsContent>

            {/* --- SECCIÓN CORREGIDA: PARTICIPANTES --- */}
            <TabsContent value="participants">
              <Card>
                <CardHeader>
                  <CardTitle>Participantes Inscritos ({participants.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative h-12 w-12 shrink-0">
                          <img 
                            src={p.avatar} 
                            className="h-full w-full rounded-full object-cover border border-slate-200" 
                            alt={p.name} 
                            onError={(e) => { (e.currentTarget.src = "/placeholder.svg") }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-sm text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                    ))}
                    {participants.length === 0 && (
                      <div className="text-center py-10">
                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No hay alumnos inscritos.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}