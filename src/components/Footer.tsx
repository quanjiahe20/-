import { BookOpen, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold">LingoMaster</span>
            </div>
            <p className="text-gray-400 mb-4">
              让语言学习更简单、更有趣。我们致力于提供高质量的在线语言课程，帮助你实现语言梦想。
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">快速链接</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-amber-500 transition-colors">首页</Link></li>
              <li><Link to="/courses" className="text-gray-400 hover:text-amber-500 transition-colors">课程中心</Link></li>
              <li><Link to="/learning" className="text-gray-400 hover:text-amber-500 transition-colors">学习中心</Link></li>
              <li><Link to="/profile" className="text-gray-400 hover:text-amber-500 transition-colors">个人中心</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">语言课程</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">英语</a></li>
              <li><a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">日语</a></li>
              <li><a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">法语</a></li>
              <li><a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">更多语言</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">联系我们</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3 text-gray-400">
                <Mail className="h-5 w-5 text-amber-500" />
                <span>contact@lingomaster.com</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400">
                <Phone className="h-5 w-5 text-amber-500" />
                <span>400-123-4567</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400">
                <MapPin className="h-5 w-5 text-amber-500" />
                <span>北京市朝阳区</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>&copy; 2024 LingoMaster. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
