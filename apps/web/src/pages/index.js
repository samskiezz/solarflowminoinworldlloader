import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth, projects } from '../lib/api';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const currentUser = auth.getUser();
    setUser(currentUser);
    loadProjects();
  }, [router]);

  const loadProjects = async () => {
    try {
      const data = await projects.list();
      setProjectList(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  SolarFlow Dashboard
                </h1>
                <p className="text-blue-200">
                  Welcome back, {user?.name}
                </p>
              </div>
              <div className="flex gap-4">
                <Link href="/projects/new">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    New Project
                  </button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-medium text-white mb-2">Total Projects</h3>
              <p className="text-3xl font-bold text-blue-300">{projectList.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-medium text-white mb-2">Active Installations</h3>
              <p className="text-3xl font-bold text-green-300">
                {projectList.filter(p => p.systemType === 'residential').length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-medium text-white mb-2">Compliance Runs</h3>
              <p className="text-3xl font-bold text-yellow-300">
                {projectList.reduce((sum, p) => sum + (p._count?.runs || 0), 0)}
              </p>
            </div>
          </div>

          {/* Projects List */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
              <Link href="/projects">
                <button className="text-blue-300 hover:text-blue-100 font-medium">
                  View All →
                </button>
              </Link>
            </div>

            {projectList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
                <p className="text-blue-200 mb-6">Get started by creating your first solar installation project</p>
                <Link href="/projects/new">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                    Create Project
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectList.slice(0, 6).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-all duration-200 cursor-pointer">
                      <h3 className="text-lg font-medium text-white mb-2 truncate">
                        {project.name}
                      </h3>
                      <p className="text-blue-200 text-sm mb-4 line-clamp-2">
                        {project.siteAddress}
                      </p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-300 font-medium capitalize">
                          {project.systemType}
                        </span>
                        <span className="text-gray-300">
                          {project._count?.assets || 0} assets
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-medium text-white mb-4">Standards & Compliance</h3>
              <div className="space-y-3">
                <Link href="/standards">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <span className="text-white">AS/NZS Standards Database</span>
                    <span className="text-blue-300">→</span>
                  </div>
                </Link>
                <Link href="/cer-products">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <span className="text-white">CER Product Registry</span>
                    <span className="text-blue-300">→</span>
                  </div>
                </Link>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-medium text-white mb-4">AI Agents & Tools</h3>
              <div className="space-y-3">
                <Link href="/agents">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <span className="text-white">🤖 AI Agent Management</span>
                    <span className="text-purple-300">→</span>
                  </div>
                </Link>
                <Link href="/compliance">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <span className="text-white">Compliance Checker</span>
                    <span className="text-green-300">→</span>
                  </div>
                </Link>
                <Link href="/reports">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <span className="text-white">Generate Reports</span>
                    <span className="text-yellow-300">→</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}