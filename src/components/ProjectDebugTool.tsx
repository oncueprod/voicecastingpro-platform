import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, RefreshCw, User, Settings, Bug } from 'lucide-react';

const ProjectDebugTool: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testFormData, setTestFormData] = useState({
    title: 'Test Commercial Project',
    description: 'This is a test project to debug the creation process',
    budget: '$500-1000',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Remote',
    category: 'Commercial',
    skills: 'Commercial Voice Over, Professional'
  });

  const runDiagnostics = () => {
    const info: any = {};
    
    // Check localStorage availability
    info.localStorageAvailable = typeof(Storage) !== "undefined";
    
    // Check user data
    info.userData = {
      userId: localStorage.getItem('userId') || localStorage.getItem('user_id'),
      userType: localStorage.getItem('userType') || localStorage.getItem('user_type'),
      userName: localStorage.getItem('userName') || localStorage.getItem('user_name'),
      userRole: localStorage.getItem('userRole') || localStorage.getItem('user_role'),
      isTalent: localStorage.getItem('isTalent')
    };
    
    // Check if user is detected as client
    const userType = localStorage.getItem('userType') || localStorage.getItem('user_type') || 'talent';
    info.isDetectedAsClient = userType === 'client';
    
    // Check existing projects
    const existingProjects = localStorage.getItem('projects');
    info.existingProjects = {
      exists: !!existingProjects,
      raw: existingProjects,
      parsed: existingProjects ? JSON.parse(existingProjects) : null,
      count: existingProjects ? JSON.parse(existingProjects).length : 0
    };
    
    // Check console errors
    info.timestamp = new Date().toISOString();
    
    setDebugInfo(info);
  };

  const setUserAsClient = () => {
    localStorage.setItem('userType', 'client');
    localStorage.setItem('userId', 'debug_client_' + Date.now());
    localStorage.setItem('userName', 'Debug Client User');
    alert('✅ User type set to CLIENT. Refresh the debug info.');
  };

  const setUserAsTalent = () => {
    localStorage.setItem('userType', 'talent');
    localStorage.setItem('userId', 'debug_talent_' + Date.now());
    localStorage.setItem('userName', 'Debug Talent User');
    alert('✅ User type set to TALENT. Refresh the debug info.');
  };

  const testProjectCreation = () => {
    try {
      console.log('🧪 Testing project creation...');
      
      // Check user info first
      const userInfo = {
        id: localStorage.getItem('userId') || localStorage.getItem('user_id') || 'demo_client_' + Date.now(),
        name: localStorage.getItem('userName') || localStorage.getItem('user_name') || 'Demo Client',
        type: localStorage.getItem('userType') || localStorage.getItem('user_type') || 'client'
      };
      
      console.log('👤 User Info:', userInfo);
      
      // Create test project
      const projectData = {
        ...testFormData,
        clientId: userInfo.id,
        clientName: userInfo.name,
        skills: testFormData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0),
        location: testFormData.location || 'Remote'
      };
      
      console.log('📋 Project Data:', projectData);
      
      // Create the project object
      const newProject = {
        ...projectData,
        id: 'project_' + Date.now(),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        applicants: [],
        viewCount: 0
      };
      
      console.log('🎯 New Project Object:', newProject);
      
      // Get existing projects
      const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      console.log('📚 Existing Projects:', existingProjects);
      
      // Add new project
      const updatedProjects = [newProject, ...existingProjects];
      console.log('📈 Updated Projects Array:', updatedProjects);
      
      // Save to localStorage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      console.log('💾 Saved to localStorage');
      
      // Verify it was saved
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      console.log('✅ Verification - Saved Projects:', savedProjects);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('projectsUpdated', { detail: updatedProjects }));
      console.log('📡 Event dispatched');
      
      alert(`✅ TEST PROJECT CREATED SUCCESSFULLY!\n\nProject ID: ${newProject.id}\nTotal Projects: ${updatedProjects.length}\n\nCheck console for details.`);
      
      // Refresh diagnostics
      runDiagnostics();
      
    } catch (error) {
      console.error('❌ Error in test creation:', error);
      alert(`❌ ERROR: ${error.message}\n\nCheck console for details.`);
    }
  };

  const clearAllProjects = () => {
    localStorage.removeItem('projects');
    alert('🗑️ All projects cleared!');
    runDiagnostics();
  };

  const clearAllUserData = () => {
    const keysToRemove = ['userId', 'user_id', 'userType', 'user_type', 'userName', 'user_name', 'userRole', 'user_role', 'isTalent'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    alert('🗑️ All user data cleared!');
    runDiagnostics();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Project Creation Debug Tool</h2>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <button
              onClick={runDiagnostics}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Debug
            </button>
            
            <button
              onClick={setUserAsClient}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Set as Client
            </button>
            
            <button
              onClick={testProjectCreation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Test Create Project
            </button>
            
            <button
              onClick={clearAllProjects}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Projects
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Status */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                User Status
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {debugInfo.userData?.userId ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">
                    User ID: {debugInfo.userData?.userId || 'NOT SET'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {debugInfo.userData?.userType ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">
                    User Type: {debugInfo.userData?.userType || 'NOT SET'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {debugInfo.isDetectedAsClient ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className="text-gray-300">
                    Detected as Client: {debugInfo.isDetectedAsClient ? 'YES' : 'NO'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {debugInfo.userData?.userName ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className="text-gray-300">
                    User Name: {debugInfo.userData?.userName || 'NOT SET'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-xs text-gray-400">All User Data:</p>
                <pre className="text-xs text-green-400 mt-1 overflow-auto">
                  {JSON.stringify(debugInfo.userData, null, 2)}
                </pre>
              </div>
            </div>

            {/* Project Status */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Project Status
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {debugInfo.localStorageAvailable ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">
                    localStorage Available: {debugInfo.localStorageAvailable ? 'YES' : 'NO'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {debugInfo.existingProjects?.exists ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className="text-gray-300">
                    Projects Exist: {debugInfo.existingProjects?.exists ? 'YES' : 'NO'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">
                    Project Count: {debugInfo.existingProjects?.count || 0}
                  </span>
                </div>
              </div>

              {debugInfo.existingProjects?.exists && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <p className="text-xs text-gray-400">Raw Projects Data:</p>
                  <pre className="text-xs text-green-400 mt-1 overflow-auto max-h-32">
                    {debugInfo.existingProjects?.raw}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Test Project Form */}
          <div className="mt-6 bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Test Project Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-400">Title:</label>
                <input
                  type="text"
                  value={testFormData.title}
                  onChange={(e) => setTestFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded text-white"
                />
              </div>
              <div>
                <label className="text-gray-400">Budget:</label>
                <select
                  value={testFormData.budget}
                  onChange={(e) => setTestFormData(prev => ({ ...prev, budget: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded text-white"
                >
                  <option value="$100-250">$100-250</option>
                  <option value="$250-500">$250-500</option>
                  <option value="$500-1000">$500-1000</option>
                  <option value="$1000-2500">$1000-2500</option>
                </select>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">Debug Steps:</h3>
            <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
              <li>Click "Set as Client" to ensure user type is correct</li>
              <li>Click "Refresh Debug" to see updated user status</li>
              <li>Click "Test Create Project" to simulate project creation</li>
              <li>Check console (F12) for detailed logs</li>
              <li>If it works here but not in your form, there's a form submission issue</li>
            </ol>
          </div>

          {/* Additional Actions */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={setUserAsTalent}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Set as Talent
            </button>
            <button
              onClick={clearAllUserData}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Clear All User Data
            </button>
            <button
              onClick={() => console.log('Current localStorage:', { ...localStorage })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Log All localStorage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDebugTool;








