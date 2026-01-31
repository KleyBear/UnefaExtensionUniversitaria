"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BarChart3, Settings, FileText, Search, Eye, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// --- INTERFACES ---
interface SubmissionFile {
  name: string
  type: string
  data: string
}

interface CourseParticipants {
  courseId: number
  courseName: string
  participants: {
    participantId: number
    participantName: string
    email: string
    avatarUrl: string
    progress: number
    submissions: any[]
  }[]
}

export default function ParticipantsPage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [courseParticipants, setCourseParticipants] = useState<CourseParticipants[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [gradingSubmission, setGradingSubmission] = useState<any>(null)
  const [gradeValue, setGradeValue] = useState("")
  const [feedbackValue, setFeedbackValue] = useState("")
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadParticipantData()
  }, [user])

  async function loadParticipantData() {
    try {
      const [teacherCourses, enrollments, users, submissions, allActivities] = await Promise.all([
        api.getCourses(),
        api.getEnrollments(),
        api.getUsers(),
        api.getSubmissions(),
        api.getActivities(),
      ])

      setActivities(allActivities)
      const teacherCourseList = teacherCourses.filter((c: any) => c.teacherId === user?.id)

      const data: CourseParticipants[] = teacherCourseList.map((course: any) => {
        const courseEnrollments = enrollments.filter((e: any) => e.courseId === course.id)
        const participants = courseEnrollments
          .map((e: any) => {
            const participant = users.find((u: any) => u.id === e.userId)
            if (participant && participant.role === "participant") {
              const participantSubmissions = submissions.filter(
                (s: any) => s.userId === e.userId && s.courseId === course.id,
              )
              const enrichedSubmissions = participantSubmissions.map((s: any) => {
                const activity = allActivities.find((a: any) => a.id === s.activityId)
                return {
                  ...s,
                  activityTitle: activity?.title || `Actividad #${s.activityId}`,
                }
              })

              return {
                participantId: e.userId,
                participantName: participant.name,
                email: participant.email,
                avatarUrl: participant.avatarUrl,
                progress: e.progress || 0,
                submissions: enrichedSubmissions,
              }
            }
            return null
          })
          .filter(Boolean)

        return {
          courseId: course.id,
          courseName: course.title,
          participants,
        }
      })

      setCourseParticipants(data)
    } catch (error) {
      console.error("Error loading participant data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- VALIDACIÓN DE CALIFICACIÓN ---
  const handleGradeChange = (val: string) => {
    const num = Number(val)
    if (num < 0) return
    if (num > 100) return
    setGradeValue(val)
  }

  const handleSubmitGrade = async () => {
    if (!gradeValue || isNaN(Number(gradeValue))) {
      alert("Por favor ingresa una calificación válida")
      return
    }
    const grade = Number(gradeValue)
    if (grade < 0 || grade > 100) {
      alert("La calificación debe estar entre 0 y 100")
      return
    }

    try {
      await api.updateSubmission(gradingSubmission.id, {
        grade: grade,
        feedback: feedbackValue,
      })
      setGradingSubmission(null)
      setGradeValue("")
      setFeedbackValue("")
      loadParticipantData()
      alert("Calificación guardada correctamente")
    } catch (error) {
      console.error("Error updating grade:", error)
      alert("Error al guardar la calificación")
    }
  }

  // --- LÓGICA DE ARCHIVOS REPARADA ---
  const normalizeFileData = (data: any, type: string) => {
    if (!data || typeof data !== "string") return ""
    if (data.startsWith("http") || data.startsWith("data:")) return data
    if (data.length > 100) return `data:${type || "application/octet-stream"};base64,${data}`
    return data
  }

  const getSubmissionFiles = (submission: any): SubmissionFile[] => {
    const files: SubmissionFile[] = []
    
    // Caso 1: Array de archivos estructurado
    if (submission.files && Array.isArray(submission.files) && submission.files.length > 0) {
      submission.files.forEach((f: any) => {
        const fileSource = f.url || f.secure_url || f.data || f.content
        if (fileSource) {
          files.push({
            name: f.name || "archivo_adjunto",
            type: f.type || "application/octet-stream",
            data: normalizeFileData(fileSource, f.type),
          })
        }
      })
    }

    // Caso 2: URL o contenido en string (Fallback)
    if (files.length === 0) {
      const possibleUrl = submission.fileUrl || submission.url || submission.content
      if (possibleUrl && possibleUrl !== "sin-archivos" && typeof possibleUrl === "string") {
        const parts = possibleUrl.split(", ")
        parts.forEach((part, i) => {
          if (part.startsWith("http") || part.length > 50) {
            // Extraer nombre de la URL si es posible
            let fileName = `Archivo ${i + 1}`
            try {
              if (part.startsWith("http")) {
                const urlParts = part.split('/')
                const lastPart = urlParts[urlParts.length - 1].split('?')[0]
                if (lastPart.includes('.')) fileName = decodeURIComponent(lastPart)
              }
            } catch (e) { /* fallback a Archivo i */ }

            files.push({
              name: fileName,
              type: "application/pdf",
              data: normalizeFileData(part, "application/pdf"),
            })
          }
        })
      }
    }
    return files
  }

  const handleFileDownload = (file: SubmissionFile) => {
    if (!file.data) return alert("Archivo no disponible")
    if (file.data.startsWith("http")) {
      window.open(file.data, "_blank")
    } else {
      const link = document.createElement("a")
      link.href = file.data
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePreview = (file: SubmissionFile) => {
    if (!file.data) return alert("Previsualización no disponible")
    if (file.data.startsWith("http")) {
      window.open(file.data, "_blank")
    } else {
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(
          `<iframe src="${file.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        )
      }
    }
  }

  // --- BÚSQUEDA CORREGIDA ---
  const filteredCourses = courseParticipants.filter((cp) => {
    const searchLower = searchTerm.toLowerCase()
    const courseMatches = cp.courseName.toLowerCase().includes(searchLower)
    const participantMatches = cp.participants.some(
      (p) =>
        p.participantName.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower),
    )
    return courseMatches || participantMatches
  })

  const menuItems = [
    { title: "Dashboard", href: "/dashboard/teacher", icon: <BarChart3 className="w-5 h-5" /> },
    { title: "Participantes", href: "/dashboard/teacher/participants", icon: <Users className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/teacher/settings", icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 md:ml-0 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Mis Participantes y Actividades</h2>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por curso o nombre de participante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Cargando datos...</div>
          ) : (
            <div className="space-y-6">
              {filteredCourses.map((courseData) => (
                <Card key={courseData.courseId}>
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-900">{courseData.courseName}</CardTitle>
                    <p className="text-sm text-blue-700 mt-2">{courseData.participants.length} participante(s)</p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {courseData.participants.map((participant) => {
                        // Opcional: Si quieres que la búsqueda oculte participantes individuales dentro de un curso que sí coincide:
                        if (searchTerm && 
                            !cpContainsParticipant(participant, searchTerm) && 
                            !courseData.courseName.toLowerCase().includes(searchTerm.toLowerCase())) {
                           return null;
                        }

                        return (
                        <div key={participant.participantId} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <img src={participant.avatarUrl || "/placeholder.svg"} className="w-12 h-12 rounded-full" alt="avatar" />
                              <div>
                                <p className="font-medium text-slate-900">{participant.participantName}</p>
                                <p className="text-sm text-slate-500">{participant.email}</p>
                                <div className="mt-2 w-48">
                                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span>PROGRESO</span>
                                    <span>{participant.progress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${participant.progress}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              {participant.submissions.length} entrega(s)
                            </span>
                          </div>

                          <div className="space-y-2">
                            {participant.submissions.map((submission: any) => (
                              <div key={submission.id} className="bg-slate-50 p-3 rounded text-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-slate-900">{submission.activityTitle}</span>
                                  </div>
                                  <span className="font-bold text-blue-600">
                                    {submission.grade !== null ? `${submission.grade}/100` : "Sin calificar"}
                                  </span>
                                </div>

                                {getSubmissionFiles(submission).length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {getSubmissionFiles(submission).map((file: SubmissionFile, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <span className="text-xs text-slate-600 truncate flex-1 mr-4" title={file.name}>
                                          {file.name}
                                        </span>
                                        <div className="flex gap-2">
                                          <Button variant="ghost" size="sm" className="h-7 text-blue-600 px-2" onClick={() => handlePreview(file)}>
                                            <Eye className="w-3 h-3 mr-1" /> Ver
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-slate-600 px-2" onClick={() => handleFileDownload(file)}>
                                            <Download className="w-3 h-3 mr-1" /> Bajar
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-2 mt-3 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-white"
                                    onClick={() => {
                                      setGradingSubmission(submission)
                                      setGradeValue(String(submission.grade || ""))
                                      setFeedbackValue(submission.feedback || "")
                                    }}
                                  >
                                    Calificar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )})}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!gradingSubmission} onOpenChange={() => setGradingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nota (0-100)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={gradeValue} 
                onChange={(e) => handleGradeChange(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === '-') e.preventDefault();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Retroalimentación</Label>
              <Textarea value={feedbackValue} onChange={(e) => setFeedbackValue(e.target.value)} rows={4} />
            </div>
            <Button className="w-full" onClick={handleSubmitGrade}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper para limpiar el renderizado de la búsqueda
function cpContainsParticipant(p: any, term: string) {
  const t = term.toLowerCase();
  return p.participantName.toLowerCase().includes(t) || p.email.toLowerCase().includes(t);
}