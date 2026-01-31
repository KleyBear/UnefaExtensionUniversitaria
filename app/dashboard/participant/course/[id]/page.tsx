"use client"

import type React from "react"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  FileText, Video, Award, BookOpen, Zap, 
  Trash2, ArrowLeft, ExternalLink, 
  Upload, Paperclip, Loader2 
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useAuthStore } from "@/lib/auth-store"
import { Sidebar } from "@/components/layout/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const CLOUDINARY_CLOUD_NAME = "dlto9ydwc";
const CLOUDINARY_UPLOAD_PRESET = "Proyecto_Imp";

interface Course {
  id: number
  title: string
  description: string
  videoUrl?: string
}

const getEmbedUrl = (url: string) => {
  if (!url) return ""
  if (url.includes("youtube.com/embed/")) return url
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params)
  const id = Number(resolved.id)
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [resources, setResources] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [currentProgress, setCurrentProgress] = useState(0)
  const [videoWatched, setVideoWatched] = useState(false)
  const [isMarkingVideo, setIsMarkingVideo] = useState(false)
  const [filesAccessedCount, setFilesAccessedCount] = useState(0)
  const [accessedResourceIds, setAccessedResourceIds] = useState<number[]>([])
  
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false)
  const [submissionForm, setSubmissionForm] = useState<{
    activityId: number | null
    files: File[]
  }>({
    activityId: null,
    files: [],
  })

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "participant") {
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadCourseData()
  }, [id])

  useEffect(() => {
    if (course && enrollments.length > 0) {
      updateProgress()
    }
  }, [videoWatched, accessedResourceIds, submissions, activities, resources])

  async function loadCourseData() {
    try {
      const [courseData, allActivities, allEnrollments, resourcesResponse] = await Promise.all([
        api.getCourseById(id),
        api.getActivities(id),
        api.getEnrollments(),
        supabase.from('resources').select('*').eq('course_id', id)
      ])

      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user?.id)

      const normalizedActivities = (allActivities || []).map((a: any) => ({
        ...a,
        safeFileUrl: a.fileUrl || a.file_url || a.attachment_url || a.attachmentUrl || a.url,
        safeFileName: a.attachment_name || a.file_name || "Documento de la actividad"
      }))

      setCourse(courseData)
      setActivities(normalizedActivities)
      setEnrollments(allEnrollments || [])
      setResources(resourcesResponse.data || [])
      setSubmissions((allSubmissions || []).map((s: any) => ({
        ...s,
        activityId: s.activity_id,
        fileUrl: s.file_url
      })))

      const userEnrollment = allEnrollments.find(e => e.courseId === id && String(e.userId) === String(user?.id))
      if (userEnrollment) {
        setVideoWatched(userEnrollment.videoWatched || false)
        setFilesAccessedCount(userEnrollment.filesAccessedCount || 0)
      }
    } catch (error) { console.error(error) } finally { setIsLoading(false) }
  }

  async function updateProgress() {
    try {
      const userEnrollment = enrollments.find(e => e.courseId === id && String(e.userId) === String(user?.id))
      if (!userEnrollment) return

      let progress = 0
      if (videoWatched) progress += 50

      const hasActivities = activities.length > 0
      const weightResources = hasActivities ? 20 : 50
      const weightActivities = 30

      if (resources.length > 0) {
        const uniqueAccesses = Math.min(Math.max(accessedResourceIds.length, filesAccessedCount), resources.length)
        progress += (uniqueAccesses / resources.length) * weightResources
      } else if (!hasActivities && videoWatched) {
        progress = 100
      }

      if (hasActivities) {
        const completedCount = activities.filter(act => submissions.some(sub => sub.activityId === act.id)).length
        progress += (completedCount / activities.length) * weightActivities
      }

      const finalProgress = Math.min(Math.round(progress), 100)
      if (finalProgress !== userEnrollment.progress) {
        await api.updateEnrollment(userEnrollment.id, { 
          progress: finalProgress, 
          videoWatched, 
          filesAccessedCount: Math.max(filesAccessedCount, accessedResourceIds.length) 
        })
      }
      setCurrentProgress(finalProgress)
    } catch (error) { console.error(error) }
  }

  const handleFileAccess = async (resourceId: number) => {
    if (accessedResourceIds.includes(resourceId)) return
    const userEnrollment = enrollments.find(e => e.courseId === id && String(e.userId) === String(user?.id))
    if (userEnrollment) {
      try {
        setAccessedResourceIds(prev => [...prev, resourceId])
        await api.recordFileAccess(userEnrollment.id)
      } catch (error) { console.error(error) }
    }
  }

  const handleMarkVideoWatched = async () => {
    const userEnrollment = enrollments.find(e => e.courseId === id && String(e.userId) === String(user?.id))
    if (userEnrollment && !videoWatched) {
      setIsMarkingVideo(true)
      try {
        await api.recordVideoView(userEnrollment.id)
        setVideoWatched(true)
      } catch (error) { console.error(error) } finally { setIsMarkingVideo(false) }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    if (e.target.files) {
      setSubmissionForm({ activityId: actId, files: Array.from(e.target.files) })
    }
  }

  const handleSubmitActivity = async (activityId: number) => {
    if (!user || submissionForm.files.length === 0) return
    setIsSubmittingActivity(true)
    try {
      const urls = await Promise.all(submissionForm.files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file); formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: formData })
        const data = await res.json()
        return data.secure_url
      }))
      
      await supabase.from('submissions').insert([{
        activity_id: activityId, user_id: user.id, course_id: id, file_url: urls.join(", ")
      }])
      
      setSubmissionForm({ activityId: null, files: [] })
      await loadCourseData()
    } catch (error) { alert("Error al subir") } finally { setIsSubmittingActivity(false) }
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center font-bold">Cargando curso...</div>

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={[
        { title: "Mis Cursos", href: "/dashboard/participant", icon: <BookOpen className="w-5 h-5" /> },
        { title: "Cursos Disponibles", href: "/dashboard/participant/courses", icon: <Zap className="w-5 h-5" /> },
        { title: "Actividades", href: "/dashboard/participant/activities", icon: <Award className="w-5 h-5" /> },
      ]} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{course?.title}</h2>
                <p className="text-slate-600 text-sm">{course?.description}</p>
              </div>
              <Link href="/dashboard/participant">
                <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
              </Link>
            </div>

            <Card className="mb-8 bg-blue-600 text-white border-none shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Tu progreso</p>
                    <h3 className="text-4xl font-black">{currentProgress}%</h3>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-300 opacity-80" />
                </div>
                <Progress value={currentProgress} className="h-2 bg-black/20" />
              </CardContent>
            </Card>

            <Tabs defaultValue="content" className="space-y-6">
              <TabsList className="bg-slate-200">
                <TabsTrigger value="content"><Video className="w-4 h-4 mr-2" /> Contenido</TabsTrigger>
                <TabsTrigger value="activities"><Award className="w-4 h-4 mr-2" /> Actividades ({activities.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="overflow-hidden border-none shadow-sm">
                    <CardHeader className="bg-white border-b">
                      <CardTitle className="text-lg flex items-center justify-between">
                        Clase en Video
                        {videoWatched && <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-black">VISTO</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 bg-black aspect-video">
                      {course?.videoUrl ? (
                        <iframe width="100%" height="100%" src={getEmbedUrl(course.videoUrl)} frameBorder="0" allowFullScreen />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">Video no disponible</div>
                      )}
                    </CardContent>
                    {!videoWatched && course?.videoUrl && (
                      <div className="p-4 bg-white border-t text-center">
                        <Button onClick={handleMarkVideoWatched} disabled={isMarkingVideo} className="bg-blue-600 text-white w-full">
                          {isMarkingVideo ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2 w-4 h-4" />}
                          Marcar como completado 
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="text-md">Recursos Descargables</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {resources.map((res: any) => (
                        <div key={res.id} className="flex items-center justify-between p-3 border rounded-xl bg-white hover:border-blue-300 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-slate-900">{res.name}</p>
                            </div>
                          </div>
                          <a href={res.file_url} target="_blank" onClick={() => handleFileAccess(res.id)} className="p-2 text-slate-400 hover:text-blue-600">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activities">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activities.map((activity: any) => {
                    const userSubmission = submissions.find(s => s.activityId === activity.id)
                    const isCurrent = submissionForm.activityId === activity.id

                    return (
                      <Card key={activity.id} className="border-none shadow-sm flex flex-col">
                        <CardHeader className="bg-white border-b py-4">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="truncate">{activity.title}</span>
                            {userSubmission && (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-green-100 text-green-700">
                                {userSubmission.grade ? `Nota: ${userSubmission.grade}` : "Enviado"}
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex-1 flex flex-col">
                          <p className="text-slate-600 text-sm mb-4">{activity.description}</p>
                          
                          {activity.safeFileUrl && (
                            <div className="mb-6 p-3 border border-blue-100 bg-blue-50/30 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-medium text-blue-800 truncate max-w-[150px]">{activity.safeFileName}</span>
                              </div>
                              <a href={activity.safeFileUrl} target="_blank" className="p-1.5 bg-white text-blue-600 rounded-md border shadow-sm"><ExternalLink className="w-3.5 h-3.5" /></a>
                            </div>
                          )}

                          {userSubmission ? (
                            <div className="mt-auto space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><Zap className="w-3 h-3" /> Tarea Entregada</p>
                              
                              {userSubmission.fileUrl && userSubmission.fileUrl !== "sin-archivos" && (
                                <div className="flex flex-wrap gap-2">
                                  {userSubmission.fileUrl.split(", ").map((url: string, idx: number) => {
                                    const isOffice = url.match(/\.(docs?|xlsx?|ppts?)$/i);
                                    const viewUrl = isOffice ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` : url;
                                    return (
                                      <Button key={idx} variant="outline" size="sm" className="text-[11px] h-8 bg-white" onClick={() => window.open(viewUrl, "_blank")}>
                                        <ExternalLink className="w-3 h-3 mr-1" /> Ver Archivo {idx + 1}
                                      </Button>
                                    )
                                  })}
                                </div>
                              )}
                              {/* FEEDBACK ELIMINADO AQUÍ */}
                            </div>
                          ) : (
                            <div className="mt-auto space-y-4">
                              <div onClick={() => document.getElementById(`file-${activity.id}`)?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer">
                                <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase">Subir Entrega</p>
                                <input type="file" multiple id={`file-${activity.id}`} className="hidden" onChange={(e) => handleFileSelect(e, activity.id)} />
                              </div>
                              {isCurrent && submissionForm.files.length > 0 && (
                                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 p-2 rounded truncate">Listo: {submissionForm.files[0].name}</div>
                              )}
                              <Button onClick={() => handleSubmitActivity(activity.id)} disabled={isSubmittingActivity} className="w-full bg-blue-600 text-white">
                                {isSubmittingActivity && isCurrent ? <Loader2 className="animate-spin w-4 h-4" /> : "Enviar Actividad"}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}