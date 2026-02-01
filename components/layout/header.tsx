"use client"

import { useAuthStore } from "@/lib/auth-store"

export function Header() {
  const user = useAuthStore((state) => state.user)

  const roleNames: Record<string, string> = {
    admin: "Administrador",
    teacher: "Docente",
    participant: "Participante",
  }

  return (
    <header className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/Escudo_unefa.png" 
            alt="Escudo UNEFA" 
            className="h-12 w-12 object-contain" 
          />
        </div>

        {/* pr-1 para móviles y md:pr-10 para computadoras */}
        <div className="flex items-center gap-3 pr-1 md:pr-4">
          <img 
            src={user?.avatar || "/placeholder.svg"} 
            alt={user?.name} 
            className="w-10 h-10 rounded-full border border-slate-100" 
          />
          <div>
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 font-medium">
              {user?.role ? roleNames[user.role] || user.role : "Usuario"}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}