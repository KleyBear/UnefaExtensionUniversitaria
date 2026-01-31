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

// --- UTILS ---
const getDownloadUrl = (url: string) => {
  if (!url) return ""
  return url.includes("cloudinary.com") ? url.replace("/upload/", "/upload/fl_attachment/") : url
}

const getEmbedUrl = (url: string) => {
  if (!url) return ""
  if (url.includes("youtube.com/embed/")) return url
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url
}

export default function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = Number(resolvedParams.id)
  
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  
  // States principales
  const [course, setCourse] = useState<Course | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // States de gestión (Video y Recursos)
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
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (id) loadCourseData()
  }, [id])

  async function loadCourseData() {
    try {
      setIsLoading(true)
      const courseData = await api.getCourseById(id)
      setCourse(courseData)
      setVideoUrl(courseData.videoUrl || "")

      const [resourcesResponse, enrollments, allUsersRaw] = await Promise.all([
        supabase.from('resources').select('*').eq('course_id', id),
        api.getEnrollments(),
        api.getUsers()
      ])

      if (resourcesResponse.data) setResources(resourcesResponse.data)

      const users = allUsersRaw || []
      const courseEnrollments = enrollments.filter((e: any) => Number(e.courseId) === id)
      
      const participantList = courseEnrollments
        .map((e: any) => users.find((u: any) => String(u.id) === String(e.userId)))
        .filter((u: any) => u && u.role === "participant")
        .map((u: any) => ({
          id: u.id,
          name: u.name || "Usuario",
          email: u.email || "",
          avatar: u.avatar || u.avatar_url || u.avatarUrl || "/placeholder.svg"
        }))

      setParticipants(participantList)
    } catch (error) {
      console.error("Error loading course data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- LÓGICA DE SUBIDA Y GESTIÓN ---
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
      if (!response.ok) throw new Error("Error en Cloudinary")
      const data = await response.json()
      return data.secure_url 
    } catch (error) {
      alert("Error al subir el archivo.")
      return null
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
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const fileUrl = await uploadToCloudinary(file)
      if (fileUrl) {
        const ext = file.name.split(".").pop()?.toLowerCase() || ""
        const typeMap: any = { pdf: "pdf", doc: "doc", docx: "doc", mp4: "video", png: "image", jpg: "image" }
        setResourceForm({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: fileUrl,
          type: typeMap[ext] || "other",
        })
      }
    }
  }

  const handleAddResource = async () => {
    if (!resourceForm.name || !resourceForm.url) return alert("Selecciona un archivo")
    try {
      const { data, error } = await supabase.from('resources').insert([{
        course_id: id,
        name: resourceForm.name,
        type: resourceForm.type,
        file_url: resourceForm.url
      }]).select()
      if (error) throw error
      setResources([...resources, data[0]])
      setResourceForm({ name: "", url: "", type: "pdf" })
      setIsAddingResource(false)
    } catch (error: any) {
      alert("Error: " + error.message)
    }
  }

  const handleDeleteResource = async (resourceId: number) => {
    if (!confirm("¿Eliminar este recurso?")) return
    try {
      const { error } = await supabase.from('resources').delete().eq('id', resourceId)
      if (error) throw error
      setResources(prev => prev.filter(r => r.id !== resourceId))
    } catch (error) {
      alert("Error al eliminar")
    }
  }

  const handleUpdateVideo = async () => {
    if (!videoUrl) return alert("Ingresa una URL")
    try {
      await api.updateCourse(id, { video_url: videoUrl })
      setCourse(course ? { ...course, videoUrl } : null)
      setIsEditingVideo(false)
      alert("Video actualizado")
    } catch (error) {
      alert("No se pudo actualizar")
    }
  }

  const menuItems = [
    { title: "Dashboard", href: "/dashboard/admin", icon: <BarChart3 className="w-5 h-5" /> },
    { title: "Usuarios", href: "/dashboard/admin/users", icon: <Users className="w-5 h-5" /> },
    { title: "Cursos", href: "/dashboard/admin/courses", icon: <FileText className="w-5 h-5" /> },
  ]

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{course?.title}</h2>
              <p className="text-slate-600 font-medium max-w-2xl">{course?.description}</p>
            </div>
            <Link href="/dashboard/admin/courses">
              <Button variant="outline">Volver al listado</Button>
            </Link>
          </div>

          <Tabs defaultValue="content" className="space-y-4">
            <TabsList className="bg-slate-200 p-1">
              <TabsTrigger value="content" className="font-bold data-[state=active]:bg-white">Contenido</TabsTrigger>
              <TabsTrigger value="activities" className="font-bold data-[state=active]:bg-white">Actividades</TabsTrigger>
              <TabsTrigger value="participants" className="font-bold data-[state=active]:bg-white">Participantes ({participants.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              {/* Video Card */}
              <Card>
                <CardHeader className="flex items-center justify-between flex-row bg-white border-b">
                  <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-blue-600" /> Video Principal</CardTitle>
                  <Dialog open={isEditingVideo} onOpenChange={setIsEditingVideo}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Edit2 className="w-4 h-4 mr-2" />Cambiar Video</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Actualizar Video</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL del video (YouTube o Cloudinary)" />
                        <Button onClick={handleUpdateVideo} className="w-full">Guardar Video</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-6">
                  {course?.videoUrl ? (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg border">
                      {course.videoUrl.includes('cloudinary') ? (
                        <video src={course.videoUrl} controls className="w-full h-full" />
                      ) : (
                        <iframe width="100%" height="100%" src={getEmbedUrl(course.videoUrl)} frameBorder="0" allowFullScreen />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed">
                      <Video className="w-12 h-12 mb-2 opacity-20" />
                      <p>Sin video configurado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resources Card */}
              <Card>
                <CardHeader className="flex items-center justify-between flex-row bg-white border-b">
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Archivos y Recursos</CardTitle>
                  <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Agregar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Subir Recurso</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div onDragOver={handleDrag} onDrop={handleDrop} className={`border-2 border-dashed rounded-lg p-10 text-center transition ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
                          {isUploading ? (
                            <div className="flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p className="mt-2 text-sm">Subiendo...</p></div>
                          ) : (
                            <><Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" /><p className="text-sm">Arrastra aquí o haz clic</p></>
                          )}
                        </div>
                        <Input placeholder="Nombre del recurso" value={resourceForm.name} onChange={(e) => setResourceForm({...resourceForm, name: e.target.value})} />
                        <Button onClick={handleAddResource} className="w-full" disabled={isUploading || !resourceForm.url}>Confirmar y Guardar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-3">
                    {resources.map((res) => (
                      <div key={res.id} className="flex items-center justify-between p-4 border rounded-xl bg-white hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{res.name}</p>
                            <span className="text-[10px] font-black uppercase bg-slate-100 px-1 text-slate-500">{res.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a href={res.file_url} target="_blank" className="p-2 text-slate-400 hover:text-blue-600"><ExternalLink className="w-5 h-5" /></a>
                          <a href={getDownloadUrl(res.file_url)} download={res.name} className="p-2 text-slate-400 hover:text-blue-600"><FileDown className="w-5 h-5" /></a>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(res.id)} className="hover:text-red-600"><Trash2 className="w-5 h-5" /></Button>
                        </div>
                      </div>
                    ))}
                    {resources.length === 0 && <p className="text-center py-8 text-slate-500">No hay archivos vinculados.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <ActivityManager courseId={id} />
            </TabsContent>

            <TabsContent value="participants">
              <Card>
                <CardHeader><CardTitle>Participantes Inscritos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-4 border rounded-xl bg-white">
                        <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border" onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                    ))}
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