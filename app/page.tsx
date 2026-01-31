"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Users, BarChart3, Award, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react"
import { useAuthStore } from "@/lib/auth-store"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      const roleRoutes: Record<string, string> = {
        admin: "/dashboard/admin",
        teacher: "/dashboard/teacher",
        participant: "/dashboard/participant",
      }
      router.push(roleRoutes[user.role] || "/")
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 
                        flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo y Título: Se centra en móvil, se alinea a la izquierda en desktop */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Image 
              src="/Escudo_unefa.png" 
              alt="Escudo UNEFA" 
              width={45} 
              height={45} 
              className="object-contain"
            />
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">
              UNEFA Extensión Universitaria Núcleo Táchira
            </h1>
          </div>

          {/* Botones: Se estiran al 100% en móvil para mejor usabilidad */}
          <div className="flex gap-3 w-full md:w-auto justify-center">
            <Link href="/login" className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full border-white text-white hover:bg-blue-700 bg-transparent">
                Inicia Sesión
              </Button>
            </Link>
            <Link href="/register" className="flex-1 md:flex-none">
              <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                Regístrate
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center text-center md:text-left">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Plataforma Educativa de Clase Mundial
              </h2>
              <p className="text-lg mb-8 text-blue-100">
                Accede a cursos de excelencia de la UNEFA Extensión Universitaria Táchira. 
                Aprende de expertos y obtén certificaciones reconocidas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100">
                    Comenzar Ahora <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white text-white hover:bg-blue-700 bg-transparent"
                  >
                    Ver Cursos
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur rounded-lg p-8 border border-white/20">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-yellow-300" />
                    <span>Excelencia Educativa</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-yellow-300" />
                    <span>Comunidad Activa</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-300" />
                    <span>Aprendizaje Flexible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">¿Por qué elegirnos?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
              <BarChart3 className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold mb-2 text-gray-900">Dashboards Inteligentes</h4>
              <p className="text-gray-600">
                Monitoreo en tiempo real de tu progreso académico con analíticas detalladas.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold mb-2 text-gray-900">Plataforma Segura</h4>
              <p className="text-gray-600">
                Tu información académica protegida con los más altos estándares de seguridad.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
              <TrendingUp className="w-12 h-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-bold mb-2 text-gray-900">Crecimiento Académico</h4>
              <p className="text-gray-600">
                Desarrolla tus habilidades con cursos diseñados por expertos universitarios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-6">¿Listo para transformar tu educación?</h3>
          <p className="text-lg mb-8 text-blue-100">
            Únete a miles de estudiantes exitosos de la Extensión Universitaria Táchira
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Registrarse Ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Unefa Extensión Universitaria Núcleo Táchira. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}