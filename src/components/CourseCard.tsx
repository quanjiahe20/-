import { Star, Clock, PlayCircle } from 'lucide-react';
import { Course } from '../types';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate();

  const levelLabels = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };

  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      <div className="relative">
        <img
          src={course.coverImage}
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="px-3 py-1 bg-white/90 text-blue-800 text-sm font-semibold rounded-full">
            {course.language}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full">
            {levelLabels[course.level]}
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <PlayCircle className="h-8 w-8 text-blue-800" />
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="ml-1 text-sm font-medium text-gray-900">
              {course.rating}
            </span>
            <span className="ml-1 text-sm text-gray-500">
              ({course.reviewCount})
            </span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="h-4 w-4 mr-1" />
            {course.duration}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600">{course.instructor}</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
            ¥{course.price}
          </span>
        </div>
      </div>
    </div>
  );
}
