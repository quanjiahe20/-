import { create } from 'zustand';
import { Course, User, Enrollment } from '../types';

interface AppState {
  courses: Course[];
  user: User | null;
  enrollments: Enrollment[];
  setCourses: (courses: Course[]) => void;
  setUser: (user: User | null) => void;
  setEnrollments: (enrollments: Enrollment[]) => void;
  addEnrollment: (enrollment: Enrollment) => void;
}

export const useAppStore = create<AppState>((set) => ({
  courses: [],
  user: null,
  enrollments: [],
  setCourses: (courses) => set({ courses }),
  setUser: (user) => set({ user }),
  setEnrollments: (enrollments) => set({ enrollments }),
  addEnrollment: (enrollment) =>
    set((state) => ({ enrollments: [...state.enrollments, enrollment] })),
}));
