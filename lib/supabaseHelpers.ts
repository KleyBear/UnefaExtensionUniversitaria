import { supabase, SUPABASE_CONFIGURED, SUPABASE_URL } from './supabase'

function handleNetworkError(err: any) {
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
    const msg = `Error de red: no se pudo conectar a Supabase en ${SUPABASE_URL || '(URL desconocida)'} — revisa variables de entorno, CORS, y la conectividad de red.`
    throw new Error(msg)
  }
  throw err
}

// Convert camelCase keys in an object to snake_case (shallow).
function normalizeKeysToSnake(obj: any) {
  const out: any = {}
  if (!obj || typeof obj !== 'object') return out
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (/[A-Z]/.test(key)) {
      const snake = key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
        .toLowerCase()
      out[snake] = val
    } else {
      out[key] = val
    }
  }
  // Remove empty strings for timestamp/date-like fields to avoid Postgres timestamp parse errors
  for (const k of Object.keys(out)) {
    if ((/_at$|_date$/).test(k) && out[k] !== null && out[k] !== undefined && String(out[k]).trim() === '') {
      delete out[k]
    }
  }
  return out
}

// Convert snake_case keys in an object to camelCase (shallow).
function normalizeKeysToCamel(obj: any) {
  const out: any = {}
  if (!obj || typeof obj !== 'object') return out
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (/_/.test(key)) {
      const camel = key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
      out[camel] = val
    } else {
      out[key] = val
    }
  }
  // Provide compatibility aliases: if backend uses student_id, expose userId too
  if (Object.prototype.hasOwnProperty.call(out, 'studentId') && !Object.prototype.hasOwnProperty.call(out, 'userId')) {
    out.userId = out.studentId
  }
  if (Object.prototype.hasOwnProperty.call(out, 'user_id') && !Object.prototype.hasOwnProperty.call(out, 'userId')) {
    out.userId = out['user_id']
  }
  if (Object.prototype.hasOwnProperty.call(out, 'courseId') && !Object.prototype.hasOwnProperty.call(out, 'course_id')) {
    // nothing
  }
  return out
}

// Users
export async function getUsers() {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  try {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
    return normalizeKeysToCamel(data)
  } catch (err: any) {
    handleNetworkError(err)
  }
}

export async function getUserById(id: string | number) {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
  } catch (err: any) {
    handleNetworkError(err)
  }
}

export async function createUser(payload: any) {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  try {
    const { data, error } = await supabase.from('users').insert(payload).select()
    if (error) throw error
    return data
  } catch (err: any) {
    handleNetworkError(err)
  }
}

export async function updateUser(id: string | number, payload: any) {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  try {
    const { data, error } = await supabase.from('users').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  } catch (err: any) {
    handleNetworkError(err)
  }
}

export async function deleteUser(id: string | number) {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  try {
    const { data, error } = await supabase.from('users').delete().eq('id', id).select()
    if (error) throw error
    return data
  } catch (err: any) {
    handleNetworkError(err)
  }
}

// Courses
export async function getCourses() {
  const { data, error } = await supabase.from('courses').select('*')
  if (error) throw error
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return normalizeKeysToCamel(data)
}

export async function getCourseById(id: string | number) {
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).single()
  if (error) throw error
  return normalizeKeysToCamel(data)
}

export async function createCourse(payload: any) {
  // Normalize payload to match DB schema: prefer snake_case keys
  const p: any = { ...payload }
  if (p.image) {
    p.image_url = p.image
    delete p.image
  }
  if (p.createdAt) {
    p.created_at = p.createdAt
    delete p.createdAt
  }
  if (p.teacherId) {
    p.teacher_id = p.teacherId
    delete p.teacherId
  }
  // Remove client-only shim fields that may not exist in DB
  if ('students' in p) delete p.students

  const { data, error } = await supabase.from('courses').insert(p).select()
  if (error) throw error
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return normalizeKeysToCamel(data)
}

export async function updateCourse(id: string | number, payload: any) {
  const p: any = { ...payload }
  if (p.image) {
    p.image_url = p.image
    delete p.image
  }
  if (p.createdAt) {
    p.created_at = p.createdAt
    delete p.createdAt
  }
  if (p.teacherId) {
    p.teacher_id = p.teacherId
    delete p.teacherId
  }
  // Remove client-only shim fields that may not exist in DB
  if ('students' in p) delete p.students

  const { data, error } = await supabase.from('courses').update(p).eq('id', id).select()
  if (error) throw error
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return normalizeKeysToCamel(data)
}

export async function deleteCourse(id: string | number) {
  const { data, error } = await supabase.from('courses').delete().eq('id', id).select()
  if (error) throw error
  return data
}

// Enrollments
export async function getEnrollments() {
  const { data, error } = await supabase.from('enrollments').select('*')
  if (error) throw error
  // Normalize rows so frontend expects camelCase keys like `userId` and `courseId`
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return data
}

export async function createEnrollment(payload: any) {
  // If incoming payload already uses camelCase keys, try sending it directly first
  const hasCamelKeys = Object.keys(payload || {}).some((k) => /[A-Z]/.test(k))
  if (hasCamelKeys) {
    try {
      const { data, error } = await supabase.from('enrollments').insert(payload).select()
      if (!error) return data
      // if error, fall through to normalization/fallback logic
      throw error
    } catch (err: any) {
      // If error is PGRST204 we will try the normalized path below; otherwise rethrow
      if (!err || err.code !== 'PGRST204') throw err
    }
  }

  // Shallow normalize camelCase keys to snake_case and drop empty timestamps
  let p: any = normalizeKeysToSnake(payload)
  // don't forcibly map user_id -> student_id; some schemas use `userId`/`user_id`.
  if (Object.prototype.hasOwnProperty.call(p, 'course_id') && p.course_id === '') {
    delete p.course_id
  }
  try {
    const { data, error } = await supabase.from('enrollments').insert(p).select()
    if (error) throw error
    return data
  } catch (err: any) {
    // Handle duplicate key (unique constraint) -> return existing enrollment instead of failing
    if (err && (err.code === '23505' || err.code === '409')) {
      // derive identifiers from payload (support camelCase and snake_case)
      const userId = payload?.userId ?? payload?.user_id ?? payload?.studentId ?? payload?.student_id
      const courseId = payload?.courseId ?? payload?.course_id
      try {
        if (userId == null || courseId == null) throw err
        const { data: existing, error: findErr } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle()
        if (findErr) throw findErr
        // normalize to camelCase for the frontend
        return existing ? [normalizeKeysToCamel(existing)] : []
      } catch (findErr) {
        throw err
      }
    }

    // If PostgREST complains about missing columns (PGRST204), try a camelCase fallback
    if (err && err.code === 'PGRST204') {
      try {
        const camel: any = {}
        for (const k of Object.keys(p)) {
          // convert snake_case back to camelCase
          const camelKey = k.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
          camel[camelKey] = p[k]
        }
        const { data: data2, error: error2 } = await supabase.from('enrollments').insert(camel).select()
        if (error2) throw error2
        return data2
      } catch (err2) {
        // rethrow original for visibility
        throw err
      }
    }
    throw err
  }
}

export async function updateEnrollment(id: string | number, payload: any) {
  let p: any = normalizeKeysToSnake(payload)
  // don't forcibly map user_id -> student_id on update either.
  try {
    const { data, error } = await supabase.from('enrollments').update(p).eq('id', id).select()
    if (error) throw error
    return data
  } catch (err: any) {
    if (err && err.code === 'PGRST204') {
      try {
        const camel: any = {}
        for (const k of Object.keys(p)) {
          const camelKey = k.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
          camel[camelKey] = p[k]
        }
        const { data: data2, error: error2 } = await supabase.from('enrollments').update(camel).eq('id', id).select()
        if (error2) throw error2
        return data2
      } catch (err2) {
        throw err
      }
    }
    throw err
  }
}

export async function deleteEnrollment(id: string | number) {
  const { data, error } = await supabase.from('enrollments').delete().eq('id', id).select()
  if (error) throw error
  return data
}

// Activities
export async function getActivities(courseId?: string | number) {
  // Use snake_case column names in queries to match DB schema
  if (courseId) {
    const { data, error } = await supabase.from('activities').select('*').eq('course_id', courseId)
    if (error) throw error
    if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
    return normalizeKeysToCamel(data)
  }
  const { data, error } = await supabase.from('activities').select('*')
  if (error) throw error
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return normalizeKeysToCamel(data)
}

export async function createActivity(payload: any) {
  // Normalize payload keys to snake_case expected by DB
  const p: any = { ...payload }
  if (Object.prototype.hasOwnProperty.call(p, 'courseId')) {
    p.course_id = p.courseId as any
    delete p.courseId
  }
  if (Object.prototype.hasOwnProperty.call(p, 'dueDate')) {
    // Only set due_date when a non-empty value is provided; PostgREST rejects empty strings for timestamp
    if (p.dueDate !== null && p.dueDate !== undefined && String(p.dueDate).trim() !== "") {
      p.due_date = p.dueDate as any
    }
    delete p.dueDate
  }
  if (Object.prototype.hasOwnProperty.call(p, 'attachmentUrl')) {
    p.attachment_url = p.attachmentUrl as any
    delete p.attachmentUrl
  }
  if (Object.prototype.hasOwnProperty.call(p, 'attachmentName')) {
    p.attachment_name = p.attachmentName as any
    delete p.attachmentName
  }
  // Remove client-only arrays that DB may not have as columns
  if (Object.prototype.hasOwnProperty.call(p, 'submissions')) delete p.submissions

  const { data, error } = await supabase.from('activities').insert(p).select()
  if (error) throw error
  return data
}

export async function updateActivity(id: string | number, payload: any) {
  const p: any = { ...payload }
  if (Object.prototype.hasOwnProperty.call(p, 'courseId')) {
    p.course_id = p.courseId as any
    delete p.courseId
  }
  if (Object.prototype.hasOwnProperty.call(p, 'dueDate')) {
    if (p.dueDate !== null && p.dueDate !== undefined && String(p.dueDate).trim() !== "") {
      p.due_date = p.dueDate as any
    }
    delete p.dueDate
  }
  if (Object.prototype.hasOwnProperty.call(p, 'attachmentUrl')) {
    p.attachment_url = p.attachmentUrl as any
    delete p.attachmentUrl
  }
  if (Object.prototype.hasOwnProperty.call(p, 'attachmentName')) {
    p.attachment_name = p.attachmentName as any
    delete p.attachmentName
  }
  if (Object.prototype.hasOwnProperty.call(p, 'submissions')) delete p.submissions

  const { data, error } = await supabase.from('activities').update(p).eq('id', id).select()
  if (error) throw error
  return data
}

export async function deleteActivity(id: string | number) {
  const { data, error } = await supabase.from('activities').delete().eq('id', id).select()
  if (error) throw error
  return data
}

// Submissions
export async function getSubmissions(activityId?: string | number) {
  const query = supabase.from('submissions').select('*')
  const { data, error } = activityId ? await query.eq('activityId', activityId) : await query
  if (error) throw error
  if (Array.isArray(data)) return data.map((d) => normalizeKeysToCamel(d))
  return normalizeKeysToCamel(data)
}

export async function createSubmission(payload: any) {
  const { data, error } = await supabase.from('submissions').insert(payload).select()
  if (error) throw error
  return data
}

export async function updateSubmission(id: string | number, payload: any) {
  const { data, error } = await supabase.from('submissions').update(payload).eq('id', id).select()
  if (error) throw error
  return data
}

export async function deleteSubmission(id: string | number) {
  const { data, error } = await supabase.from('submissions').delete().eq('id', id).select()
  if (error) throw error
  return data
}

export default {
  // users
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  // courses
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  // enrollments
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  // activities
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  // submissions
  getSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission,
}
