import * as sb from './supabaseHelpers'

export const api = {
  // Users
  getUsers: sb.getUsers,
  getUserById: sb.getUserById,
  createUser: sb.createUser,
  updateUser: sb.updateUser,
  deleteUser: sb.deleteUser,

  // Courses
  getCourses: sb.getCourses,
  getCourseById: sb.getCourseById,
  createCourse: sb.createCourse,
  updateCourse: sb.updateCourse,
  deleteCourse: sb.deleteCourse,

  // Enrollments
  getEnrollments: sb.getEnrollments,
  createEnrollment: sb.createEnrollment,
  updateEnrollment: sb.updateEnrollment,
  deleteEnrollment: sb.deleteEnrollment,
  getEnrollmentById: sb.getEnrollments, // note: you can filter client-side or use getEnrollments then find

  // Activities
  getActivities: sb.getActivities,
  createActivity: sb.createActivity,
  updateActivity: sb.updateActivity,
  deleteActivity: sb.deleteActivity,

  // Submissions
  getSubmissions: sb.getSubmissions,
  createSubmission: sb.createSubmission,
  updateSubmission: sb.updateSubmission,
  deleteSubmission: sb.deleteSubmission,

  // Helpers for recording simple events can be implemented by callers using updateEnrollment
  recordVideoView: async (enrollmentId: number) => {
    const enrollment: any = await sb.getEnrollments()
    // attempt to find enrollment and toggle
    const found = Array.isArray(enrollment) ? enrollment.find((e: any) => e.id === enrollmentId) : null
    const videoWatched = true
    return sb.updateEnrollment(enrollmentId, { ...found, videoWatched })
  },

  recordFileAccess: async (enrollmentId: number) => {
    const enrollmentData: any = await sb.getEnrollments()
    const found = Array.isArray(enrollmentData) ? enrollmentData.find((e: any) => e.id === enrollmentId) : null
    const filesAccessedCount = (found?.filesAccessedCount || 0) + 1
    return sb.updateEnrollment(enrollmentId, { ...found, filesAccessedCount })
  },
}
