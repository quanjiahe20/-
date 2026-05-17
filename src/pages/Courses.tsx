import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { useAppStore } from '../store/useStore';
import { mockCourses } from '../data/mockData';
import { Course } from '../types';

export function Courses() {
  const { courses, setCourses } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  useEffect(() => {
    setCourses(mockCourses);
  }, [setCourses]);

  useEffect(() => {
    let result = [...courses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description.toLowerCase().includes(term) ||
          course.language.toLowerCase().includes(term)
      );
    }

    if (languageFilter !== 'all') {
      result = result.filter((course) => course.language === languageFilter);
    }

    if (levelFilter !== 'all') {
      result = result.filter((course) => course.level === levelFilter);
    }

    setFilteredCourses(result);
  }, [courses, searchTerm, languageFilter, levelFilter]);

  const languages = ['all', ...new Set(courses.map((c) => c.language))];
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];
  const levelLabels = {
    all: '全部级别',
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">全部课程</h1>
          <p className="text-xl text-gray-600">探索我们的语言课程，找到适合你的学习内容</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索课程、语言..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Language Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang === 'all' ? '全部语言' : lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {levelLabels[level as keyof typeof levelLabels]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            找到 <span className="font-semibold text-gray-900">{filteredCourses.length}</span> 门课程
          </p>
        </div>

        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">没有找到相关课程</h3>
            <p className="text-gray-600">试试其他搜索条件或筛选选项</p>
          </div>
        )}
      </div>
    </div>
  );
}
