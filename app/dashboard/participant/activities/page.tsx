"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Zap, Award, Settings, FileText, ExternalLink, Search } from "lucide-react" // Importado Search
import { Input } from "@/components/ui/input" // Importado Input

interface Activity {
  id: number
  courseId: number
  title: string
  description: string
  dueDate: string
  courseName?: string
  submission?: any
  attachmentUrl?: string
  attachmentName?: string
}

const formatDate = (dateString: string) => {
  if (!dateString) return "Sin fecha"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const getViewableUrl = (url: string) => {
  if (!url) return ""
  return url.replace("/upload/fl_attachment/", "/upload/")
}

export default function ActivitiesPage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [searchTerm, setSearchTerm] = useState("") // Estado para la búsqueda
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "participant") {
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadActivities()
  }, [user])

  async function loadActivities() {
    try {
      const [enrollments, allActivities, submissions, courses] = await Promise.all([
        api.getEnrollments(),
        api.getActivities(),
        api.getSubmissions(),
        api.getCourses(),
      ])

      const userCourseIds = enrollments
        .filter((e: any) => e.userId === user?.id)
        .map((e: any) => e.courseId)

      const userActivities: Activity[] = allActivities
        .filter((a: any) => userCourseIds.includes(a.courseId))
        .map((a: any) => {
          const course = courses.find((c: any) => c.id === a.courseId)
          const submission = submissions.find((s: any) => s.activityId === a.id && s.userId === user?.id)

          return {
            ...a,
            attachmentUrl: a.attachmentUrl ?? a.attachment_url,
            attachmentName: a.attachmentName ?? a.attachment_name,
            courseName: course?.title || "Curso sin nombre",
            submission,
          }
        })

      setActivities(userActivities)
    } catch (error) {
      console.error("Error loading activities:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Lógica de filtrado ---
  const filteredActivities = activities.filter((activity) => {
    const search = searchTerm.toLowerCase()
    return (
      activity.courseName?.toLowerCase().includes(search) ||
      activity.title.toLowerCase().includes(search)
    )
  })

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Mis Actividades</h2>
            
            {/* Barra de Búsqueda */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por curso o actividad..."
                className="pl-10 bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Cargando actividades...</div>
          ) : filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="pt-8 text-center text-slate-500">
                {searchTerm ? "No se encontraron resultados para tu búsqueda" : "No hay actividades asignadas"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <Card key={activity.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-1"> 
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-blue-700 leading-tight mb-0.5">
                          {activity.courseName}
                        </p>
                        <CardTitle className="text-xl text-slate-900 font-semibold">
                          {activity.title}
                        </CardTitle>
                      </div>
                      {activity.submission && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Enviada
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {activity.description}
                    </p>
                    
                    {activity.attachmentUrl && (
                      <div className="pt-1">
                        <a 
                          href={getViewableUrl(activity.attachmentUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                        >
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span>{activity.attachmentName || "Ver material"}</span>
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400">Fecha de Entrega</p>
                        <p className="text-sm font-medium text-slate-900">{formatDate(activity.dueDate)}</p>
                      </div>
                      {activity.submission && (
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-slate-400">Calificación</p>
                          <p className="text-sm font-medium text-slate-900">
                            {activity.submission.grade !== null ? `${activity.submission.grade}/100` : "Pendiente"}
                          </p>
                        </div>
                      )}
                    </div>

                    {activity.submission?.feedback && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-700 mb-1 uppercase">Retroalimentación:</p>
                        <p className="text-xs text-blue-600 italic leading-snug">"{activity.submission.feedback}"</p>
                      </div>
                    )}
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