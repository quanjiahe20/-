import { User, Mail, Phone, BookOpen, Settings, LogOut, Award, Calendar } from 'lucide-react';
import { useState } from 'react';

export function Profile() {
  const [activeTab, setActiveTab] = useState('profile');

  const user = {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138-0000-0000',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    joinDate: '2024年1月15日',
    coursesCompleted: 5,
    hoursLearned: 128,
  };

  const menuItems = [
    { id: 'profile', label: '个人资料', icon: <User className="h-5 w-5" /> },
    { id: 'courses', label: '我的课程', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'achievements', label: '我的成就', icon: <Award className="h-5 w-5" /> },
    { id: 'settings', label: '账户设置', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 text-center border-b border-gray-100">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                <p className="text-gray-600 text-sm">{user.email}</p>
              </div>
              <nav className="p-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-all mt-2">
                  <LogOut className="h-5 w-5" />
                  <span>退出登录</span>
                </button>
              </nav>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">学习天数</span>
                  <span className="font-bold text-gray-900">87天</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">完成课程</span>
                  <span className="font-bold text-gray-900">{user.coursesCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">学习时长</span>
                  <span className="font-bold text-gray-900">{user.hoursLearned}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">加入时间</span>
                  <span className="font-bold text-gray-900">{user.joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">个人资料</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">头像</label>
                        <div className="flex items-center space-x-4">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            更换头像
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>邮箱</span>
                          </div>
                        </label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>手机号</span>
                          </div>
                        </label>
                        <input
                          type="tel"
                          defaultValue={user.phone}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>学习目标</span>
                          </div>
                        </label>
                        <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                          <option>日常交流</option>
                          <option>出国旅游</option>
                          <option>工作需要</option>
                          <option>考试考级</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
                        <textarea
                          rows={4}
                          placeholder="介绍一下自己..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8">
                    <button className="px-8 py-3 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                      保存修改
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'courses' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">我的课程</h2>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无课程</h3>
                    <p className="text-gray-600 mb-4">浏览课程中心，开始你的语言学习之旅</p>
                    <button className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700">
                      浏览课程
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'achievements' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">我的成就</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: '🌟', title: '新手上路', unlocked: true },
                      { icon: '🔥', title: '连续7天', unlocked: true },
                      { icon: '📖', title: '勤学苦练', unlocked: false },
                      { icon: '🏆', title: '语言达人', unlocked: false },
                    ].map((achievement, index) => (
                      <div
                        key={index}
                        className={`p-6 rounded-2xl text-center ${
                          achievement.unlocked
                            ? 'bg-amber-50 border-2 border-amber-200'
                            : 'bg-gray-50 border-2 border-gray-200 opacity-50'
                        }`}
                      >
                        <div className="text-4xl mb-3">{achievement.icon}</div>
                        <p className="font-semibold text-gray-900">{achievement.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">账户设置</h2>
                  <div className="space-y-6">
                    <div className="p-6 border border-gray-200 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">密码设置</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <button className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700">
                          更新密码
                        </button>
                      </div>
                    </div>

                    <div className="p-6 border border-red-200 rounded-xl bg-red-50">
                      <h3 className="text-lg font-semibold text-red-900 mb-4">危险区域</h3>
                      <p className="text-red-700 mb-4">删除账户后，所有数据将永久丢失，无法恢复。</p>
                      <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        删除账户
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
