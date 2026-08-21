const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
  };
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const headerObj: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      headerObj[key] = value;
    });
  }

  if (auth) {
    let token: string | null = null;

    if (typeof window !== 'undefined') {
      const clerk = (window as unknown as ClerkWindow).Clerk;
      if (clerk?.session?.getToken) {
        try {
          token = await clerk.session.getToken();
        } catch { }
      }
    }

    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('mr-training-auth-token');
    }

    if (token) {
      headerObj['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...rest,
    headers: headerObj,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Workout API
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  section: string;
  sets: WorkoutSet[];
  focus?: string;
  estimatedDuration?: number;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  setType: string;
  prescribedReps: number | null;
  prescribedWeight: number | null;
  prescribedRPE: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  isCompleted: boolean;
  isSkipped: boolean;
  completedAt: string | null;
  notes: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  sportType: string;
  status: string;
  scheduledDate: string;
  coachNote: string;
  exercises: WorkoutExercise[];
  focus?: string;
  estimatedDuration?: number;
}

export const workoutApi = {
  create: (data: { name: string; description: string; sportType: string; scheduledDate: string; athleteId: string; programId?: string; exercises: unknown[] }) =>
    api.post<Workout>('/workouts', data),

  getById: (id: string) => api.get<Workout>(`/workouts/${id}`),

  complete: (id: string, data: { rpe: number; notes: string }) =>
    api.post<Workout>(`/workouts/${id}/complete`, data),

  getAthleteWorkouts: (athleteId: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.get<Workout[]>(`/athletes/${athleteId}/workouts?${params.toString()}`);
  },

  getTodayWorkout: (athleteId: string) => api.get<Workout>(`/athletes/${athleteId}/today`),

  getPendingReviews: () => api.get<Workout[]>('/workouts/pending-reviews'),
};

// Coach API
export interface CoachProfile {
  id: string;
  userId: string;
  specializations: string[];
  certifications: string[];
  certLevel: string;
  bio: string;
  experienceYears: number;
  websiteUrl: string;
  instagramHandle: string;
  youtubeHandle: string;
  athleteCount: number;
  maxAthletes: number;
  isVerified: boolean;
  status: string;
}

export const coachApi = {
  getProfile: () => api.get<CoachProfile>('/coach/profile'),
  updateProfile: (data: Partial<CoachProfile>) => api.put<CoachProfile>('/coach/profile', data),
};

// ---- Coaching API (Next.js API routes -> TursoDB) ----

const COACHING_BASE = '/api/coaching'

export const coachingApi = {
  // Time Blocks
  getTimeBlocks: <T>() => api.get<T>(`${COACHING_BASE}/time-blocks`),
  saveTimeBlocks: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/time-blocks`, data),

  // Athletes
  getAthletes: <T>() => api.get<T>(`${COACHING_BASE}/athletes`),
  getAthleteById: <T>(id: string) => api.get<T>(`${COACHING_BASE}/athletes/${id}`),
  saveAthlete: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/athletes`, data),
  updateAthlete: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/athletes/${id}`, data),
  deleteAthlete: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/athletes/${id}`),

  // Sessions
  getSessions: <T>() => api.get<T>(`${COACHING_BASE}/sessions`),
  saveSession: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/sessions`, data),
  updateSession: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/sessions/${id}`, data),
  deleteSession: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/sessions/${id}`),

  // Messages
  getMessageThreads: <T>() => api.get<T>(`${COACHING_BASE}/messages`),
  sendMessage: <T>(threadId: string, data: unknown) => api.post<T>(`${COACHING_BASE}/messages/${threadId}`, data),
  createThread: <T>(data: unknown) => api.put<T>(`${COACHING_BASE}/messages`, data),

  // Daily Summary
  getDailySummary: <T>() => api.get<T>(`${COACHING_BASE}/daily-summary`),

  // Events
  getEvents: <T>() => api.get<T>(`${COACHING_BASE}/events`),
  saveEvent: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/events`, data),
  updateEvent: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/events/${id}`, data),
  deleteEvent: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/events/${id}`),

  // Plans
  getPlans: <T>() => api.get<T>(`${COACHING_BASE}/plans`),
  savePlan: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/plans`, data),
  updatePlan: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/plans/${id}`, data),
  deletePlan: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/plans/${id}`),

  // Tickets
  getTickets: <T>() => api.get<T>(`${COACHING_BASE}/tickets`),
  saveTicket: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/tickets`, data),

  // Assigned Workouts
  getAssignedWorkouts: <T>() => api.get<T>(`${COACHING_BASE}/assigned-workouts`),
  saveAssignedWorkout: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/assigned-workouts`, data),
  updateAssignedWorkout: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/assigned-workouts/${id}`, data),
  deleteAssignedWorkout: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/assigned-workouts/${id}`),

  // AI Suggestions
  getAISuggestions: <T>() => api.get<T>(`${COACHING_BASE}/ai-suggestions`),
  saveAISuggestion: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/ai-suggestions`, data),

  // Live Sessions
  getLiveSessions: <T>() => api.get<T>(`${COACHING_BASE}/live-sessions`),
  saveLiveSession: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/live-sessions`, data),
  updateLiveSession: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/live-sessions/${id}`, data),
  deleteLiveSession: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/live-sessions/${id}`),

  // Products
  getProducts: <T>() => api.get<T>(`${COACHING_BASE}/products`),
  saveProduct: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/products`, data),
  updateProduct: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/products/${id}`, data),
  deleteProduct: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/products/${id}`),

  // Blog
  getBlogPosts: <T>() => api.get<T>(`${COACHING_BASE}/blog`),
  getBlogPost: <T>(slug: string) => api.get<T>(`${COACHING_BASE}/blog/${slug}`),
  saveBlogPost: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/blog`, data),
  updateBlogPost: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/blog/${id}`, data),
  deleteBlogPost: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/blog/${id}`),

  // Public Products
  getPublicProducts: <T>() => api.get<T>(`${COACHING_BASE}/public-products`),

  // Sales
  getSales: <T>() => api.get<T>(`${COACHING_BASE}/sales`),
  saveSale: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/sales`, data),
  deleteSale: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/sales/${id}`),

  // Dashboard
  getDashboard: <T>() => api.get<T>(`${COACHING_BASE}/dashboard`),

  // Payment Methods
  getPaymentMethods: <T>() => api.get<T>(`${COACHING_BASE}/payment-methods`),
  savePaymentMethod: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/payment-methods`, data),
  updatePaymentMethod: <T>(id: string, data: unknown) => api.put<T>(`${COACHING_BASE}/payment-methods/${id}`, data),
  deletePaymentMethod: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/payment-methods/${id}`),

  // Public Page Config
  getPublicPageConfig: <T>() => api.get<T>(`${COACHING_BASE}/public-page`),
  updatePublicPageConfig: <T>(data: unknown) => api.put<T>(`${COACHING_BASE}/public-page`, data),

  // Memberships
  getMemberships: <T>() => api.get<T>(`${COACHING_BASE}/memberships`),
  getMembership: <T>(athleteId: string) => api.get<T>(`${COACHING_BASE}/membership/${athleteId}`),
  createMembership: <T>(data: unknown) => api.post<T>(`${COACHING_BASE}/membership`, data),
  cancelMembership: <T>(id: string) => api.delete<T>(`${COACHING_BASE}/membership/${id}`),
  getPaymentHistory: <T>(athleteId: string) => api.get<T>(`${COACHING_BASE}/payment-history/${athleteId}`),

  // Generic get for dynamic paths
  get: <T>(path: string) => api.get<T>(`${COACHING_BASE}${path}`),
};
