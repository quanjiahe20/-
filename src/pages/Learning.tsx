import { BookOpen, Award, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Learning() {
  const navigate = useNavigate();

  const learningProgress = [
    {
      course: '零基础英语入门',
      progress: 75,
      lastStudy: '昨天 19:30',
      nextLesson: '第24课：购物对话',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop',
    },
    {
      course: '日语N5-N4考级班',
      progress: 30,
      lastStudy: '3天前',
      nextLesson: '第12课：日期表达',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
    },
  ];

  const achievements = [
    { icon: '🔥', title: '连续学习', description: '连续学习7天' },
    { icon: '📚', title: '勤奋学员', description: '完成10节课' },
    { icon: '⭐', title: '优秀表现', description: '作业全部满分' },
  ];

  const stats = [
    { label: '学习天数', value: '23', icon: <CalendarIcon className="h-6 w-6 text-blue-600" /> },
    { label: '完成课时', value: '36', icon: <BookOpen className="h-6 w-6 text-green-600" /> },
    { label: '学习时长', value: '48h', icon: <Clock className="h-6 w-6 text-amber-600" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">学习中心</h1>
          <p className="text-xl text-gray-600">继续你的语言学习之旅</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                {stat.icon}
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Continue Learning */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">继续学习</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {learningProgress.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                onClick={() => navigate('/courses/1')}
              >
                <div className="flex">
                  <img
                    src={item.image}
                    alt={item.course}
                    className="w-48 h-36 object-cover"
                  />
                  <div className="flex-1 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.course}</h3>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">学习进度</span>
                        <span className="font-semibold text-blue-800">{item.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-800 to-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">上次学习：{item.lastStudy}</p>
                    <button className="flex items-center space-x-2 text-blue-800 font-semibold hover:text-blue-600">
                      <span>继续学习：{item.nextLesson}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">我的成就</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all"
              >
                <div className="text-5xl mb-4">{achievement.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{achievement.title}</h3>
                <p className="text-gray-600">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">为你推荐</h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">探索更多课程</h3>
                <p className="text-gray-600">根据你的学习兴趣，我们为你精选了更多优质课程</p>
              </div>
              <button
                onClick={() => navigate('/courses')}
                className="px-8 py-3 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                浏览课程
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
