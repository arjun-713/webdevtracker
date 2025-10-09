import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddLog, setShowAddLog] = useState(false);
  const [showCourseDetail, setShowCourseDetail] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      // Initialize database with course data
      await axios.post(`${API}/init-database`);
      
      // Fetch courses and analytics
      await Promise.all([
        fetchCourses(),
        fetchAnalytics(),
        fetchDailyLogs()
      ]);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses`);
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/summary`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchDailyLogs = async () => {
    try {
      const response = await axios.get(`${API}/logs`);
      setDailyLogs(response.data);
    } catch (error) {
      console.error('Error fetching daily logs:', error);
    }
  };

  const updateCourseProgress = async (courseId, progress, status) => {
    try {
      await axios.patch(`${API}/courses/${courseId}/progress?progress=${progress}&status=${status}`);
      await fetchCourses();
      await fetchAnalytics();
    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  };

  const handleStartCourse = async (course) => {
    if (course.status === 'Not Started') {
      await updateCourseProgress(course.id, 5, 'In Progress');
    }
  };

  const handleCompleteCourse = async (course) => {
    await updateCourseProgress(course.id, 100, 'Completed');
  };

  const getFilteredCourses = () => {
    return courses.filter(course => {
      if (selectedPhase && course.phase !== selectedPhase) return false;
      if (statusFilter !== 'all' && course.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && course.priority !== priorityFilter) return false;
      return true;
    });
  };

  const getCoursesByPhase = () => {
    const phases = {};
    courses.forEach(course => {
      if (!phases[course.phase]) {
        phases[course.phase] = {
          title: course.phase_title,
          courses: []
        };
      }
      phases[course.phase].courses.push(course);
    });
    return phases;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Dev Learning Tracker
                </h1>
                <p className="text-sm text-gray-400">Your Full-Stack Journey</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Current Streak</p>
                <p className="text-2xl font-bold text-orange-500">{analytics?.current_streak || 0} days 🔥</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-1">
            {['dashboard', 'courses', 'daily-tracker', 'completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'dashboard' && analytics && (
          <Dashboard analytics={analytics} courses={courses} dailyLogs={dailyLogs} />
        )}
        
        {activeTab === 'courses' && (
          <CoursesView 
            courses={courses}
            getFilteredCourses={getFilteredCourses}
            getCoursesByPhase={getCoursesByPhase}
            handleStartCourse={handleStartCourse}
            handleCompleteCourse={handleCompleteCourse}
            setShowCourseDetail={setShowCourseDetail}
            selectedPhase={selectedPhase}
            setSelectedPhase={setSelectedPhase}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
          />
        )}
        
        {activeTab === 'daily-tracker' && (
          <DailyTracker 
            courses={courses.filter(c => c.status !== 'Completed')}
            dailyLogs={dailyLogs}
            onLogAdded={() => {
              fetchDailyLogs();
              fetchCourses();
              fetchAnalytics();
            }}
          />
        )}
        
        {activeTab === 'completed' && (
          <CompletedCourses courses={courses.filter(c => c.status === 'Completed')} />
        )}
      </main>

      {/* Course Detail Modal */}
      {showCourseDetail && (
        <CourseDetailModal 
          course={showCourseDetail} 
          onClose={() => setShowCourseDetail(null)}
          onUpdate={async (progress, status) => {
            await updateCourseProgress(showCourseDetail.id, progress, status);
            setShowCourseDetail(null);
          }}
        />
      )}
    </div>
  );
}

// Dashboard Component
function Dashboard({ analytics, courses, dailyLogs }) {
  const recentLogs = dailyLogs.slice(0, 7);
  
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Courses" 
          value={analytics.total_courses}
          subtitle={`${analytics.completed_courses} completed`}
          icon="📚"
          color="blue"
        />
        <StatCard 
          title="In Progress" 
          value={analytics.in_progress_courses}
          subtitle="Active learning"
          icon="🚀"
          color="purple"
        />
        <StatCard 
          title="Learning Hours" 
          value={`${Math.round(analytics.total_completed_hours)}h`}
          subtitle={`of ${Math.round(analytics.total_planned_hours)}h planned`}
          icon="⏱️"
          color="green"
        />
        <StatCard 
          title="Completion Rate" 
          value={`${Math.round((analytics.completed_courses / analytics.total_courses) * 100)}%`}
          subtitle="Overall progress"
          icon="🎯"
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div key={idx} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-400">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <span className="text-blue-400 font-semibold">{Math.round(log.total_time_spent / 60)}h {log.total_time_spent % 60}m</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {log.courses.map((c, i) => (
                      <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-600 rounded text-xs">
                        {c.course_title}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No activity yet. Start logging your progress!</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🎓</span>
            Recently Active Courses
          </h2>
          <div className="space-y-3">
            {analytics.recent_courses.slice(0, 5).map(course => (
              <div key={course.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{course.title}</h3>
                  <StatusBadge status={course.status} />
                </div>
                <div className="flex items-center justify-between">
                  <ProgressBar progress={course.progress} size="sm" />
                  <span className="text-xs text-gray-400 ml-3">{course.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <span className="mr-2">📊</span>
          Phase Progress Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(phase => {
            const phaseCourses = courses.filter(c => c.phase === phase);
            const completed = phaseCourses.filter(c => c.status === 'Completed').length;
            const progress = phaseCourses.length > 0 ? Math.round((completed / phaseCourses.length) * 100) : 0;
            
            return (
              <div key={phase} className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400 mb-1">Phase {phase}</div>
                <div className="text-xs text-gray-400 mb-3">{completed}/{phaseCourses.length} courses</div>
                <ProgressBar progress={progress} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Courses View Component
function CoursesView({ 
  courses, 
  getFilteredCourses, 
  getCoursesByPhase,
  handleStartCourse, 
  handleCompleteCourse,
  setShowCourseDetail,
  selectedPhase,
  setSelectedPhase,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter
}) {
  const filteredCourses = getFilteredCourses();
  const phases = getCoursesByPhase();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Phase</label>
            <select 
              value={selectedPhase || ''}
              onChange={(e) => setSelectedPhase(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Phases</option>
              {Object.keys(phases).map(phase => (
                <option key={phase} value={phase}>Phase {phase}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="MUST">MUST</option>
              <option value="Optional">Optional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses by Phase */}
      {Object.entries(phases).map(([phase, data]) => {
        const phaseCourses = data.courses.filter(c => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false;
          if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
          if (selectedPhase && c.phase !== selectedPhase) return false;
          return true;
        });

        if (phaseCourses.length === 0) return null;

        return (
          <div key={phase} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                <span className="text-blue-400">Phase {phase}</span>
                <span className="text-gray-400 ml-3">- {data.title}</span>
              </h2>
              <span className="text-sm text-gray-400">{phaseCourses.length} courses</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseCourses.map(course => (
                <CourseCard 
                  key={course.id}
                  course={course}
                  onStart={handleStartCourse}
                  onComplete={handleCompleteCourse}
                  onClick={() => setShowCourseDetail(course)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Course Card Component
function CourseCard({ course, onStart, onComplete, onClick }) {
  return (
    <div className="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600 hover:border-blue-500 transition-all duration-200 cursor-pointer group"
         onClick={onClick}>
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-900 overflow-hidden">
        <img 
          src={course.thumbnail} 
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/400x225/1f2937/60a5fa?text=${encodeURIComponent(course.title.substring(0, 20))}`;
          }}
        />
        <PriorityBadge priority={course.priority} />
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {course.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>⏱️ {course.duration_hours}h</span>
          <span>Phase {course.phase}</span>
        </div>
        
        <ProgressBar progress={course.progress} size="sm" />
        
        <div className="flex items-center justify-between mt-3">
          <StatusBadge status={course.status} />
          <div className="flex space-x-2">
            {course.status === 'Not Started' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(course); }}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Start
              </button>
            )}
            {course.status === 'In Progress' && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(course); }}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Daily Tracker Component
function DailyTracker({ courses, dailyLogs, onLogAdded }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState(null);

  const handleAddCourse = () => {
    setSelectedCourses([...selectedCourses, { course_id: '', course_title: '', time_spent: 0, progress_notes: '' }]);
  };

  const handleUpdateCourse = (index, field, value) => {
    const updated = [...selectedCourses];
    updated[index][field] = value;
    
    if (field === 'course_id' && value) {
      const course = courses.find(c => c.id === value);
      if (course) {
        updated[index].course_title = course.title;
      }
    }
    
    setSelectedCourses(updated);
  };

  const handleRemoveCourse = (index) => {
    setSelectedCourses(selectedCourses.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      alert('Please add at least one course');
      return;
    }

    const validCourses = selectedCourses.filter(c => c.course_id && c.time_spent > 0);
    if (validCourses.length === 0) {
      alert('Please select courses and add time spent');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/logs`, {
        date: selectedDate,
        courses: validCourses,
        notes,
        mood
      });
      
      // Reset form
      setSelectedCourses([]);
      setNotes('');
      setMood(null);
      onLogAdded();
      alert('Daily log saved successfully!');
    } catch (error) {
      console.error('Error saving log:', error);
      alert('Error saving log. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Log Form */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">📝</span>
          Log Today's Progress
        </h2>
        
        <div className="space-y-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Date</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none w-full md:w-auto"
            />
          </div>

          {/* Course Entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm text-gray-400">Courses Worked On</label>
              <button
                onClick={handleAddCourse}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
              >
                + Add Course
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedCourses.map((courseEntry, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <select
                        value={courseEntry.course_id}
                        onChange={(e) => handleUpdateCourse(index, 'course_id', e.target.value)}
                        className="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none w-full"
                      >
                        <option value="">Select course...</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        placeholder="Minutes"
                        value={courseEntry.time_spent}
                        onChange={(e) => handleUpdateCourse(index, 'time_spent', parseInt(e.target.value) || 0)}
                        className="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none w-full"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        placeholder="What did you learn?"
                        value={courseEntry.progress_notes}
                        onChange={(e) => handleUpdateCourse(index, 'progress_notes', e.target.value)}
                        className="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none w-full"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center">
                      <button
                        onClick={() => handleRemoveCourse(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or reflections..."
              rows={3}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none w-full resize-none"
            />
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">How was your learning session?</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setMood(rating)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    mood === rating ? 'scale-125' : 'opacity-50'
                  }`}
                >
                  {rating <= 2 ? '😞' : rating === 3 ? '😐' : rating === 4 ? '🙂' : '😄'}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all duration-200"
          >
            Save Daily Log
          </button>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">📚</span>
          Recent Logs
        </h2>
        <div className="space-y-4">
          {dailyLogs.slice(0, 10).map(log => (
            <div key={log.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-sm text-blue-400 mt-1">Total: {Math.floor(log.total_time_spent / 60)}h {log.total_time_spent % 60}m</p>
                </div>
                {log.mood && (
                  <span className="text-2xl">
                    {log.mood <= 2 ? '😞' : log.mood === 3 ? '😐' : log.mood === 4 ? '🙂' : '😄'}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {log.courses.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{c.course_title}</span>
                    <span className="text-gray-400">{c.time_spent} min</span>
                  </div>
                ))}
              </div>
              {log.notes && (
                <p className="mt-3 text-sm text-gray-400 italic">{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Completed Courses Component
function CompletedCourses({ courses }) {
  const totalHours = courses.reduce((sum, c) => sum + c.total_time_spent, 0) / 60;
  const avgHoursPerCourse = courses.length > 0 ? totalHours / courses.length : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Completed Courses" 
          value={courses.length}
          subtitle="Awesome progress!"
          icon="🎉"
          color="green"
        />
        <StatCard 
          title="Total Hours" 
          value={`${Math.round(totalHours)}h`}
          subtitle="Time invested"
          icon="⏰"
          color="blue"
        />
        <StatCard 
          title="Avg per Course" 
          value={`${Math.round(avgHoursPerCourse)}h`}
          subtitle="Learning pace"
          icon="📊"
          color="purple"
        />
      </div>

      {/* Completed Courses Grid */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">🏆</span>
          Your Achievements
        </h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div key={course.id} className="bg-gray-700/50 rounded-lg overflow-hidden border border-green-500/30">
                <div className="relative h-32 bg-gray-900">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/400x200/1f2937/10b981?text=${encodeURIComponent(course.title.substring(0, 20))}`;
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    ✓ DONE
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{course.title}</h3>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Phase {course.phase}</span>
                    <span>{Math.round(course.total_time_spent / 60)}h spent</span>
                  </div>
                  {course.completion_date && (
                    <p className="text-xs text-green-400 mt-2">
                      Completed: {new Date(course.completion_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">No completed courses yet</p>
            <p className="text-gray-500 text-sm">Keep learning! Your achievements will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Course Detail Modal
function CourseDetailModal({ course, onClose, onUpdate }) {
  const [progress, setProgress] = useState(course.progress);

  const handleUpdate = () => {
    const status = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';
    onUpdate(progress, status);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
            <p className="text-gray-400">Phase {course.phase} - {course.phase_title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Video Preview */}
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex justify-center">
            <a
              href={course.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.75a6.25 6.25 0 100 12.5 6.25 6.25 0 000-12.5zM8.75 11.25v-2.5l2.5 1.25-2.5 1.25z" />
              </svg>
              Watch on YouTube
            </a>
          </div>

          {/* Course Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="font-semibold">{course.duration_hours}h</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Priority</p>
              <p className="font-semibold">{course.priority}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Time Spent</p>
              <p className="font-semibold">{Math.round(course.total_time_spent / 60)}h</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <StatusBadge status={course.status} />
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-400 text-sm">{course.description}</p>
            </div>
          )}

          {/* Progress Update */}
          <div>
            <h3 className="font-semibold mb-3">Update Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-blue-400 w-16">{progress}%</span>
              </div>
              <ProgressBar progress={progress} />
              <button
                onClick={handleUpdate}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all duration-200"
              >
                Update Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility Components
function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    blue: 'from-blue-600/20 to-blue-900/20 border-blue-500/30',
    purple: 'from-purple-600/20 to-purple-900/20 border-purple-500/30',
    green: 'from-green-600/20 to-green-900/20 border-green-500/30',
    orange: 'from-orange-600/20 to-orange-900/20 border-orange-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm rounded-xl p-6 border`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-gray-400 text-sm">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-gray-400 text-xs">{subtitle}</p>
    </div>
  );
}

function ProgressBar({ progress, size = 'md' }) {
  const heights = { sm: 'h-1.5', md: 'h-2.5' };
  
  return (
    <div className={`w-full bg-gray-700 rounded-full ${heights[size]} overflow-hidden`}>
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Not Started': 'bg-gray-600 text-gray-300',
    'In Progress': 'bg-blue-600 text-blue-100',
    'Completed': 'bg-green-600 text-green-100'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${
      priority === 'MUST' ? 'bg-orange-500 text-white' : 'bg-gray-600 text-gray-300'
    }`}>
      {priority}
    </span>
  );
}

export default App;