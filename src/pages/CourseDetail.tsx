import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Users, Play, CheckCircle, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mockCourses } from '../data/mockData';
import { Course } from '../types';

export function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const found = mockCourses.find((c) => c.id === id);
    setCourse(found || null);
  }, [id]);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">课程不存在</p>
          <button
            onClick={() => navigate('/courses')}
            className="mt-4 px-6 py-2 bg-blue-800 text-white rounded-lg"
          >
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  const levelLabels = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };

  const lessons = [
    { id: 1, title: '课程介绍与学习方法', duration: '15:00', free: true },
    { id: 2, title: '基础发音规则', duration: '25:00', free: true },
    { id: 3, title: '日常问候用语', duration: '30:00', free: false },
    { id: 4, title: '数字与时间表达', duration: '28:00', free: false },
    { id: 5, title: '自我介绍', duration: '32:00', free: false },
    { id: 6, title: '购物对话', duration: '25:00', free: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <span className="px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full">
                  {levelLabels[course.level]}
                </span>
                <span className="text-blue-200">{course.language}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl text-blue-100 mb-6">{course.description}</p>
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <span className="font-semibold">{course.rating}</span>
                  <span className="text-blue-200">({course.reviewCount} 评价)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>5,234 学员</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>{course.lessonCount} 课时</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                  alt={course.instructor}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-semibold">{course.instructor}</p>
                  <p className="text-blue-200 text-sm">主讲讲师</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="relative">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-blue-800 ml-1" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent mb-4">
                    ¥{course.price}
                  </div>
                  <button className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all mb-3">
                    立即购买
                  </button>
                  <button className="w-full py-4 border-2 border-blue-800 text-blue-800 font-semibold rounded-xl hover:bg-blue-50 transition-all">
                    加入购物车
                  </button>
                  <div className="mt-6 space-y-3">
                    {[
                      '无限期观看所有课程',
                      '下载课程资料',
                      '专属学习社群',
                      '结业证书',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center space-x-3 text-gray-600">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Description */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">课程简介</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                这是一门精心设计的{course.language}课程，适合{levelLabels[course.level]}水平的学习者。
                通过系统性的学习，你将掌握日常交流所需的词汇、语法和表达技巧。
              </p>
              <p className="text-gray-600 leading-relaxed">
                课程采用互动式教学方法，结合真实场景对话，让你在轻松愉快的氛围中提升语言能力。
                每节课都配有练习和作业，帮助你巩固所学知识。
              </p>
            </div>

            {/* Curriculum */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">课程大纲</h2>
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lesson.title}</p>
                        <p className="text-sm text-gray-500">{lesson.duration}</p>
                      </div>
                    </div>
                    {lesson.free ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                        试看
                      </span>
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <LockIcon className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skills */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">你将学到</h3>
              <div className="space-y-3">
                {[
                  '流利的日常对话',
                  '标准的发音技巧',
                  '实用的词汇积累',
                  '基础语法知识',
                  '文化背景了解',
                ].map((skill, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">学习要求</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-xs">•</span>
                  </div>
                  <span className="text-gray-600">无需基础，从零开始</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-xs">•</span>
                  </div>
                  <span className="text-gray-600">每天30分钟学习时间</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
