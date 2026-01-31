"use client"

import { Suspense, useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Zap, Award, Settings, Search, AwardIcon, X, Loader2, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface EnrolledCourse {
  id: number
  title: string
  description: string
  category: string
  imageUrl: string
  progress: number
  status: string
}

function ParticipantDashboardContent() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [completedCourses, setCompletedCourses] = useState<EnrolledCourse[]>([])
  const [filteredEnrolled, setFilteredEnrolled] = useState<EnrolledCourse[]>([])
  const [filteredCompleted, setFilteredCompleted] = useState<EnrolledCourse[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "participant") {
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    loadCourses()
    checkWelcomeStatus()
  }, [user])

  const checkWelcomeStatus = () => {
    if (user) {
      const welcomeShown = localStorage.getItem(`welcome_shown_${user.id}`)
      if (!welcomeShown) {
        setShowWelcome(true)
        localStorage.setItem(`welcome_shown_${user.id}`, "true")
      }
    }
  }

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase()
    const enrolledFiltered = enrolledCourses.filter(
      (c) => c.title.toLowerCase().includes(lowerSearch) || c.description.toLowerCase().includes(lowerSearch),
    )
    const completedFiltered = completedCourses.filter(
      (c) => c.title.toLowerCase().includes(lowerSearch) || c.description.toLowerCase().includes(lowerSearch),
    )
    setFilteredEnrolled(enrolledFiltered)
    setFilteredCompleted(completedFiltered)
  }, [searchTerm, enrolledCourses, completedCourses])

  async function loadCourses() {
    try {
      const [enrollments, courses] = await Promise.all([api.getEnrollments(), api.getCourses()])
      const userEnrollments = enrollments.filter((e: any) => e.userId === user?.id)

      const enrolled: EnrolledCourse[] = []
      const completed: EnrolledCourse[] = []

      userEnrollments.forEach((enrollment: any) => {
        const course = courses.find((c: any) => c.id === enrollment.courseId)
        if (course) {
          const courseData = {
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            imageUrl: course.imageUrl || course.image_url || course.image || "/placeholder.svg",
            progress: enrollment.progress,
            status: enrollment.status,
          }

          if (enrollment.progress === 100) {
            completed.push(courseData)
          } else {
            enrolled.push(courseData)
          }
        }
      })

      setEnrolledCourses(enrolled)
      setCompletedCourses(completed)
    } catch (error) {
      console.error("Error loading courses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const menuItems = [
    { title: "Mis Cursos", href: "/dashboard/participant", icon: <BookOpen className="w-5 h-5" /> },
    { title: "Cursos Disponibles", href: "/dashboard/participant/courses", icon: <Zap className="w-5 h-5" /> },
    { title: "Actividades", href: "/dashboard/participant/activities", icon: <Award className="w-5 h-5" /> },
    { title: "Tutorial", href: "/dashboard/participant/tutorial", icon: <BookOpen className="w-5 h-5" /> },
    { title: "Configuración", href: "/dashboard/participant/settings", icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={menuItems} />
      <div className="flex-1 md:ml-0 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0">
          {showWelcome && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300">
              <CardContent className="pt-6 relative">
                <button 
                  onClick={() => setShowWelcome(false)} 
                  className="absolute top-4 right-4 text-blue-600 hover:text-blue-700"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* He quitado max-w-lg para que el texto ocupe el ancho normal */}
                <div className="w-full pr-8"> 
                  <h3 className="text-2xl font-bold text-blue-900 mb-4 italic">¡Bienvenid@, {user?.name}!</h3>
                  <p className="text-blue-800 font-medium italic mb-4 leading-relaxed">
                    Los participantes que se inscriban en cualquiera de nuestros cursos o Diplomados deberán, una vez finalizada la inscripción a través de la página web, enviar al correo electrónico de Extensión <span className="font-bold underline">extensionuniversitariatachira@gmail.com</span> los siguientes documentos en formato JPG:
                  </p>
                  <ul className="list-disc list-inside text-blue-800 font-medium italic space-y-1 ml-2">
                    <li>Planilla de inscripción</li>
                    <li>Cédula de identidad</li>
                    <li>Comprobante de pago avalado por ASOBIES</li>
                    <li>Título universitario (título de pregrado)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <h2 className="text-3xl font-bold text-slate-900 mb-8 ">Mis Cursos</h2>

          <Card className="mb-8 ">
            <CardContent className="pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar mis cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 italic"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            </div>
          ) : (
            <div className="space-y-12 ">
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 italic">
                  <Zap className="w-5 h-5 text-amber-500" /> Cursos en Progreso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEnrolled.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                      <Link href={`/dashboard/participant/course/${course.id}`} className="flex flex-col h-full">
                        <div className="h-44 overflow-hidden">
                          <img
                            src={course.imageUrl}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardHeader className="pt-4 pb-2">
                          <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                          <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-500 uppercase italic">Progreso</span>
                              <span className="text-sm font-bold text-blue-600">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2 bg-slate-100" />
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 italic">
                  <Award className="w-5 h-5 text-green-600" /> Cursos Completados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCompleted.map((course) => (
                    <Card key={course.id} className="border-green-200 bg-green-50/30 overflow-hidden flex flex-col italic">
                      <Link href={`/dashboard/participant/course/${course.id}`} className="flex flex-col h-full italic">
                        <div className="h-44 overflow-hidden relative">
                          <img
                            src={course.imageUrl}
                            alt={course.title}
                            className="w-full h-full object-cover opacity-80"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="bg-white/90 p-3 rounded-full shadow-xl">
                              <AwardIcon className="w-8 h-8 text-green-600" />
                            </div>
                          </div>
                        </div>
                        <CardHeader className="pt-4 pb-2">
                          <CardTitle className="line-clamp-2 text-lg text-green-800">{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end italic">
                          <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-100/50 p-2 rounded-md justify-center italic">
                            <Check className="w-4 h-4" /> Curso Completado
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ParticipantDashboard() {
  return (
    <Suspense fallback={null}>
      <ParticipantDashboardContent />
    </Suspense>
  )
}