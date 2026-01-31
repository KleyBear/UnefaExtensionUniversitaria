"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Calendar, FileText, Loader2, AlertCircle, Upload, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Activity {
  id: number
  courseId: number
  title: string
  description: string
  dueDate?: string
  attachmentUrl?: string
  attachmentName?: string
}

interface ActivityManagerProps {
  courseId: number
}

// Función para limpiar URL de Cloudinary y permitir visualización
const getViewableUrl = (url: string) => {
  if (!url) return "";
  return url.replace("/upload/fl_attachment/", "/upload/");
};

export function ActivityManager({ courseId }: ActivityManagerProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    dueDate: "",
    attachmentUrl: "",
    attachmentName: "",
  })

  useEffect(() => {
    loadActivities()
  }, [courseId])

  async function loadActivities() {
    try {
      setIsLoading(true)
      const allActivities = await api.getActivities()
      const courseActivities = allActivities
        .filter((a: any) => Number(a.courseId ?? a.course_id) === Number(courseId))
        .map((a: any) => ({
          id: a.id,
          courseId: a.courseId ?? a.course_id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate ?? a.due_date,
          attachmentUrl: a.attachmentUrl ?? a.attachment_url,
          attachmentName: a.attachmentName ?? a.attachment_name,
        }))
      setActivities(courseActivities)
    } catch (error) {
      setError("Error al cargar las actividades.")
    } finally {
      setIsLoading(false)
    }
  }

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "Proyecto_Imp") 

    try {
      setIsUploading(true)
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        { method: "POST", body: formData }
      )
      const data = await response.json()
      return data.secure_url
    } catch (err) {
      console.error("Cloudinary Error:", err)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newActivity.title || !newActivity.description) {
      setError("Completa título y descripción")
      return
    }

    try {
      setIsSaving(true)
      let finalUrl = ""
      let finalName = ""

      if (selectedFile) {
        const url = await uploadToCloudinary(selectedFile)
        if (url) {
          finalUrl = url
          finalName = selectedFile.name
        }
      }

      await api.createActivity({
        title: newActivity.title,
        description: newActivity.description,
        due_date: newActivity.dueDate || null,
        course_id: courseId,
        attachment_url: finalUrl,
        attachment_name: finalName,
      })

      setNewActivity({ title: "", description: "", dueDate: "", attachmentUrl: "", attachmentName: "" })
      setSelectedFile(null)
      setIsAdding(false)
      loadActivities()
    } catch (error) {
      setError("Error al crear la actividad.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteActivity = async (id: number) => {
    if (confirm("¿Eliminar esta actividad?")) {
      await api.deleteActivity(id)
      loadActivities()
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Actividades del Curso
          </CardTitle>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nueva Actividad
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleCreateActivity} className="mb-8 p-6 border rounded-xl bg-slate-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  value={newActivity.title} 
                  onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Entrega</Label>
                <Input 
                  type="date" 
                  value={newActivity.dueDate}
                  onChange={e => setNewActivity({...newActivity, dueDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea 
                value={newActivity.description}
                onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Archivo Adjunto</Label>
              <div
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                  dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">Arrastra un archivo o haz clic para seleccionar</p>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="activity-file"
                />
                <label htmlFor="activity-file" className="mt-2 block text-xs text-blue-600 cursor-pointer">
                  {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving || isUploading} className="bg-blue-600">
                {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Actividad
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" /></div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">No hay actividades.</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 border rounded-lg hover:border-blue-300 flex justify-between items-start bg-white transition-all">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">{activity.title}</h4>
                  <p className="text-sm text-slate-600">{activity.description}</p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    {activity.dueDate && (
                      <span className="text-xs text-slate-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" /> {format(new Date(activity.dueDate), "dd MMM, yyyy", { locale: es })}
                      </span>
                    )}
                    {activity.attachmentUrl && (
                      <a
                        href={getViewableUrl(activity.attachmentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Ver: {activity.attachmentName || "Archivo"}
                      </a>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteActivity(activity.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}