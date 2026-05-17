import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Users, Award, ArrowRight, CheckCircle } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { useAppStore } from '../store/useStore';
import { mockCourses, learningPaths, testimonials } from '../data/mockData';

export function Home() {
  const navigate = useNavigate();
  const { setCourses } = useAppStore();

  useEffect(() => {
    setCourses(mockCourses);
  }, [setCourses]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&h=800&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeInUp">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                开启你的
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 block">
                  语言学习之旅
                </span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                无论你是零基础还是想要进阶，我们都有专业的课程和方法帮助你掌握多种语言，开启国际化的人生。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/courses')}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-lg font-semibold rounded-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>开始学习</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/courses')}
                  className="px-8 py-4 bg-white/10 backdrop-blur text-white text-lg font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center"
                >
                  浏览课程
                </button>
              </div>
              <div className="mt-12 flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-blue-100">200+ 专业课程</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-blue-100">50+ 语言选择</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-blue-100">10万+ 学员</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1527866959251-f2eba2747e68?w=600&h=500&fit=crop"
                  alt="Language Learning"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white text-gray-900 p-4 rounded-xl shadow-xl animate-bounce">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-2xl">
                    🎯
                  </div>
                  <div>
                    <p className="font-semibold">快速提升</p>
                    <p className="text-sm text-gray-600">30天见成效</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">为什么选择我们</h2>
            <p className="text-xl text-gray-600">专业、高效、有趣的语言学习体验</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="h-10 w-10 text-blue-600" />,
                title: '全球语言覆盖',
                description: '提供英语、日语、法语、德语、韩语等50多种语言的专业课程',
              },
              {
                icon: <Users className="h-10 w-10 text-blue-600" />,
                title: '专业师资团队',
                description: '所有讲师均为母语水平或持有专业资质认证的语言专家',
              },
              {
                icon: <Award className="h-10 w-10 text-blue-600" />,
                title: '学习成果保障',
                description: '系统化的学习路径和进度追踪，确保每一步都有收获',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">热门课程</h2>
              <p className="text-xl text-gray-600">精选最受欢迎的语言课程</p>
            </div>
            <button
              onClick={() => navigate('/courses')}
              className="hidden md:flex items-center space-x-2 text-blue-800 font-semibold hover:text-blue-600 transition-colors"
            >
              <span>查看全部</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockCourses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <div className="text-center mt-12 md:hidden">
            <button
              onClick={() => navigate('/courses')}
              className="px-6 py-3 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              查看全部课程
            </button>
          </div>
        </div>
      </section>

      {/* Learning Paths Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">学习路径</h2>
            <p className="text-xl text-gray-600">选择适合你的学习路径，系统提升语言能力</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {learningPaths.map((path, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 cursor-pointer"
                onClick={() => navigate('/courses')}
              >
                <div className={`h-48 bg-gradient-to-br ${path.color} flex items-center justify-center`}>
                  <span className="text-7xl">{path.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{path.title}</h3>
                  <div className="flex items-center space-x-2">
                    {path.levels.map((level, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-700">
                          {level}
                        </div>
                        {i < path.levels.length - 1 && (
                          <div className="absolute mt-[-24px] ml-[60px] w-8 h-0.5 bg-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">学员评价</h2>
            <p className="text-xl text-gray-600">听听他们的学习心得</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-all"
              >
                <div className="text-5xl text-amber-400 mb-4">"</div>
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">准备好开始了吗？</h2>
          <p className="text-xl text-blue-100 mb-8">
            加入我们，让语言成为你的优势，开启全新的可能
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-lg font-semibold rounded-xl hover:shadow-2xl transition-all transform hover:scale-105"
          >
            免费注册
          </button>
        </div>
      </section>
    </div>
  );
}
