import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

function Header(): React.ReactElement {
  return (
    <header className="border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-aurora-green via-aurora-blue to-aurora-purple flex items-center justify-center animate-glow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-aurora-green" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Access Policy Visualizer
              </h1>
              <p className="text-sm text-gray-500">
                Aidbox Access Policy Debugging Tool
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="https://docs.aidbox.app/security-and-access-control/security/access-control"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-aurora-green transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

