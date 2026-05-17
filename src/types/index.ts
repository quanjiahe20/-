export interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  coverImage: string;
  instructor: string;
  rating: number;
  reviewCount: number;
  lessonCount: number;
  duration: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
  videoUrl: string;
  duration: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  progress: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}
