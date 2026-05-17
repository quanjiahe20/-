import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, X, User, LogIn } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-800" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-amber-500 bg-clip-text text-transparent">
                LingoMaster
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-800 font-medium transition-colors">
              首页
            </Link>
            <Link to="/courses" className="text-gray-700 hover:text-blue-800 font-medium transition-colors">
              课程
            </Link>
            <Link to="/learning" className="text-gray-700 hover:text-blue-800 font-medium transition-colors">
              学习中心
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-blue-800 font-medium transition-colors">
              个人中心
            </Link>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center space-x-2 px-4 py-2 text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span>登录</span>
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-800 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              <User className="h-5 w-5" />
              <span>注册</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/"
              className="block text-gray-700 hover:text-blue-800 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              首页
            </Link>
            <Link
              to="/courses"
              className="block text-gray-700 hover:text-blue-800 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              课程
            </Link>
            <Link
              to="/learning"
              className="block text-gray-700 hover:text-blue-800 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              学习中心
            </Link>
            <Link
              to="/profile"
              className="block text-gray-700 hover:text-blue-800 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              个人中心
            </Link>
            <hr className="my-2" />
            <button
              onClick={() => {
                navigate('/login');
                setIsMenuOpen(false);
              }}
              className="block w-full text-left text-blue-800 font-medium py-2"
            >
              登录
            </button>
            <button
              onClick={() => {
                navigate('/signup');
                setIsMenuOpen(false);
              }}
              className="block w-full text-white font-medium py-2 px-4 bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg"
            >
              注册
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
