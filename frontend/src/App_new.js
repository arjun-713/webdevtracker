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
  const [plannedSessions, setPlannedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCourseDetail, setShowCourseDetail] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/init-database`);
      await Promise.all([
        fetchCourses(),
        fetchAnalytics(),
        fetchDailyLogs(),
        fetchPlannedSessions()
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

  const fetchPlannedSessions = async () => {
    try {
      const response = await axios.get(`${API}/planned`);
      setPlannedSessions(response.data);
    } catch (error) {
      console.error('Error fetching planned sessions:', error);
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
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            border: '8px solid var(--dark-brown)', 
            borderTop: '8px solid var(--beige)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--dark-brown)', textTransform: 'uppercase' }}>
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <header style={{ 
        background: 'var(--beige)', 
        borderBottom: '6px solid var(--dark-brown)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ 
                background: 'var(--dark-brown)', 
                padding: '12px', 
                border: '4px solid var(--dark-brown)'
              }}>
                <svg style={{ width: '40px', height: '40px', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d=\"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253\" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--dark-brown)', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                  DEV TRACKER
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--brown)', fontWeight: 'bold', margin: '4px 0 0 0' }}>
                  FULL-STACK LEARNING SYSTEM
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 'bold', margin: '0 0 4px 0' }}>CURRENT STREAK</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--dark-brown)', margin: 0 }}>
                {analytics?.current_streak || 0} DAYS 🔥
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div style={{ background: 'var(--white)', borderBottom: '4px solid var(--dark-brown)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {['dashboard', 'courses', 'daily-tracker', 'calendar', 'completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '16px 24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  background: activeTab === tab ? 'var(--dark-brown)' : 'transparent',
                  color: activeTab === tab ? 'var(--cream)' : 'var(--dark-brown)',
                  border: 'none',
                  borderBottom: activeTab === tab ? 'none' : '4px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '14px',
                  letterSpacing: '1px',
                  transition: 'all 0.1s'
                }}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
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
        
        {activeTab === 'calendar' && (
          <CalendarView
            courses={courses}
            plannedSessions={plannedSessions}
            dailyLogs={dailyLogs}
            onSessionAdded={() => fetchPlannedSessions()}
            onSessionDeleted={() => fetchPlannedSessions()}
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
  const recentLogs = dailyLogs.slice(0, 5);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <StatCard title="TOTAL COURSES" value={analytics.total_courses} subtitle={`${analytics.completed_courses} COMPLETED`} />
        <StatCard title="IN PROGRESS" value={analytics.in_progress_courses} subtitle="ACTIVE LEARNING" />
        <StatCard title="LEARNING HOURS" value={`${Math.round(analytics.total_completed_hours)}H`} subtitle={`OF ${Math.round(analytics.total_planned_hours)}H PLANNED`} />
        <StatCard title="COMPLETION" value={`${Math.round((analytics.completed_courses / analytics.total_courses) * 100)}%`} subtitle="OVERALL PROGRESS" />
      </div>

      {/* Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📊 RECENT ACTIVITY
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div key={idx} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--brown)' }}>
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--dark-brown)' }}>
                      {Math.floor(log.total_time_spent / 60)}H {log.total_time_spent % 60}M
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {log.courses.map((c, i) => (
                      <span key={i} className="brutal-badge" style={{ background: 'var(--white)' }}>
                        {c.course_title}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--brown)', fontWeight: 'bold' }}>
                NO ACTIVITY YET. START LOGGING!
              </p>
            )}
          </div>
        </div>

        <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🎯 RECENT COURSES
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analytics.recent_courses.slice(0, 5).map(course => (
              <div key={course.id} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', flex: 1 }}>{course.title}</h3>
                  <StatusBadge status={course.status} />
                </div>
                <BrutalProgressBar progress={course.progress} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Overview */}
      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          📈 PHASE PROGRESS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(phase => {
            const phaseCourses = courses.filter(c => c.phase === phase);
            const completed = phaseCourses.filter(c => c.status === 'Completed').length;
            const progress = phaseCourses.length > 0 ? Math.round((completed / phaseCourses.length) * 100) : 0;
            
            return (
              <div key={phase} style={{ background: 'var(--white)', border: '3px solid var(--dark-brown)', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--dark-brown)', marginBottom: '8px' }}>
                  P{phase}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 'bold', marginBottom: '10px' }}>
                  {completed}/{phaseCourses.length}
                </div>
                <BrutalProgressBar progress={progress} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Continue in next message due to length...
