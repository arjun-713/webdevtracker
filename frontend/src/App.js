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
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--dark-brown)', textTransform: 'uppercase' }}>
            LOADING YOUR JOURNEY...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <BrutalHeader streak={analytics?.current_streak || 0} />

      {/* Navigation */}
      <BrutalNav activeTab={activeTab} setActiveTab={setActiveTab} />

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

// Brutal Header
function BrutalHeader({ streak }) {
  return (
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
            <div style={{ background: 'var(--dark-brown)', padding: '12px', border: '4px solid var(--dark-brown)' }}>
              <span style={{ fontSize: '32px' }}>📚</span>
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
              {streak} DAYS 🔥
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Brutal Navigation
function BrutalNav({ activeTab, setActiveTab }) {
  return (
    <div style={{ background: 'var(--white)', borderBottom: '4px solid var(--dark-brown)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                letterSpacing: '1px'
              }}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ analytics, courses, dailyLogs }) {
  const recentLogs = dailyLogs.slice(0, 5);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <StatCard title="TOTAL COURSES" value={analytics.total_courses} subtitle={`${analytics.completed_courses} COMPLETED`} />
        <StatCard title="IN PROGRESS" value={analytics.in_progress_courses} subtitle="ACTIVE LEARNING" />
        <StatCard title="HOURS" value={`${Math.round(analytics.total_completed_hours)}H`} subtitle={`OF ${Math.round(analytics.total_planned_hours)}H`} />
        <StatCard title="COMPLETION" value={`${Math.round((analytics.completed_courses / analytics.total_courses) * 100)}%`} subtitle="PROGRESS" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
            RECENT ACTIVITY
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div key={idx} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--brown)' }}>
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {Math.floor(log.total_time_spent / 60)}H {log.total_time_spent % 60}M
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {log.courses.map((c, i) => (
                      <span key={i} className="brutal-badge" style={{ background: 'var(--white)', fontSize: '10px' }}>
                        {c.course_title}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>NO ACTIVITY YET</p>
            )}
          </div>
        </div>

        <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
            RECENT COURSES
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analytics.recent_courses.slice(0, 5).map(course => (
              <div key={course.id} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'start' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', flex: 1, marginRight: '10px' }}>{course.title}</h3>
                  <StatusBadge status={course.status} />
                </div>
                <BrutalProgressBar progress={course.progress} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
          PHASE PROGRESS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(phase => {
            const phaseCourses = courses.filter(c => c.phase === phase);
            const completed = phaseCourses.filter(c => c.status === 'Completed').length;
            const progress = phaseCourses.length > 0 ? Math.round((completed / phaseCourses.length) * 100) : 0;
            
            return (
              <div key={phase} style={{ background: 'var(--white)', border: '3px solid var(--dark-brown)', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>P{phase}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>{completed}/{phaseCourses.length}</div>
                <BrutalProgressBar progress={progress} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Courses View
function CoursesView({ 
  courses, getCoursesByPhase, handleStartCourse, handleCompleteCourse,
  setShowCourseDetail, selectedPhase, setSelectedPhase,
  statusFilter, setStatusFilter, priorityFilter, setPriorityFilter
}) {
  const phases = getCoursesByPhase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>PHASE</label>
            <select 
              value={selectedPhase || ''}
              onChange={(e) => setSelectedPhase(e.target.value ? parseInt(e.target.value) : null)}
              style={{ minWidth: '150px' }}
            >
              <option value="">ALL PHASES</option>
              {Object.keys(phases).map(phase => (
                <option key={phase} value={phase}>PHASE {phase}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>STATUS</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: '150px' }}>
              <option value="all">ALL STATUS</option>
              <option value="Not Started">NOT STARTED</option>
              <option value="In Progress">IN PROGRESS</option>
              <option value="Completed">COMPLETED</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>PRIORITY</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ minWidth: '150px' }}>
              <option value="all">ALL</option>
              <option value="MUST">MUST</option>
              <option value="Optional">OPTIONAL</option>
            </select>
          </div>
        </div>
      </div>

      {Object.entries(phases).map(([phase, data]) => {
        const phaseCourses = data.courses.filter(c => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false;
          if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
          if (selectedPhase && c.phase !== selectedPhase) return false;
          return true;
        });

        if (phaseCourses.length === 0) return null;

        return (
          <div key={phase} className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                PHASE {phase} - {data.title}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--brown)', fontWeight: 'bold', marginTop: '5px' }}>
                {phaseCourses.length} COURSES
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
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

// Course Card
function CourseCard({ course, onStart, onComplete, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        background: 'var(--white)', 
        border: '4px solid var(--dark-brown)', 
        cursor: 'pointer',
        transition: 'transform 0.1s',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-3px, -3px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
    >
      <div style={{ position: 'relative', height: '150px', background: 'var(--beige)', borderBottom: '4px solid var(--dark-brown)', overflow: 'hidden' }}>
        <img 
          src={course.thumbnail} 
          alt={course.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/400x200/E8DCC4/3E2A1F?text=${encodeURIComponent(course.title.substring(0, 15))}`;
          }}
        />
        <PriorityBadge priority={course.priority} />
      </div>
      
      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', minHeight: '40px' }}>
          {course.title}
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--brown)' }}>
          <span>{course.duration_hours}H</span>
          <span>PHASE {course.phase}</span>
        </div>
        
        <BrutalProgressBar progress={course.progress} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <StatusBadge status={course.status} />
          <div style={{ display: 'flex', gap: '8px' }}>
            {course.status === 'Not Started' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(course); }}
                className="brutalism-button"
                style={{ padding: '6px 12px', fontSize: '10px' }}
              >
                START
              </button>
            )}
            {course.status === 'In Progress' && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(course); }}
                className="brutalism-button"
                style={{ padding: '6px 12px', fontSize: '10px', background: 'var(--brown)', color: 'var(--cream)' }}
              >
                DONE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// Daily Tracker
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
      if (course) updated[index].course_title = course.title;
    }
    
    setSelectedCourses(updated);
  };

  const handleRemoveCourse = (index) => {
    setSelectedCourses(selectedCourses.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      alert('ADD AT LEAST ONE COURSE');
      return;
    }

    const validCourses = selectedCourses.filter(c => c.course_id && c.time_spent > 0);
    if (validCourses.length === 0) {
      alert('SELECT COURSES AND ADD TIME');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/logs`, {
        date: selectedDate,
        courses: validCourses,
        notes,
        mood
      });
      
      setSelectedCourses([]);
      setNotes('');
      setMood(null);
      onLogAdded();
      alert('LOG SAVED!');
    } catch (error) {
      console.error('Error saving log:', error);
      alert('ERROR SAVING LOG');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '25px', textTransform: 'uppercase' }}>
          LOG TODAY'S PROGRESS
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>DATE</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', maxWidth: '300px' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>COURSES WORKED ON</label>
              <button onClick={handleAddCourse} className="brutalism-button" style={{ padding: '8px 16px', fontSize: '12px' }}>
                + ADD COURSE
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedCourses.map((courseEntry, index) => (
                <div key={index} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={courseEntry.course_id}
                      onChange={(e) => handleUpdateCourse(index, 'course_id', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">SELECT COURSE...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="MINS"
                      value={courseEntry.time_spent}
                      onChange={(e) => handleUpdateCourse(index, 'time_spent', parseInt(e.target.value) || 0)}
                      style={{ width: '100%' }}
                    />
                    <input
                      type="text"
                      placeholder="WHAT DID YOU LEARN?"
                      value={courseEntry.progress_notes}
                      onChange={(e) => handleUpdateCourse(index, 'progress_notes', e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <button
                      onClick={() => handleRemoveCourse(index)}
                      style={{ 
                        background: 'var(--dark-brown)', 
                        color: 'var(--cream)', 
                        border: '3px solid var(--dark-brown)', 
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="REFLECTIONS..."
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>SESSION RATING</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setMood(rating)}
                  style={{
                    fontSize: '32px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: mood === rating ? 1 : 0.3,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {rating <= 2 ? '😞' : rating === 3 ? '😐' : rating === 4 ? '🙂' : '😄'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} className="brutalism-button" style={{ padding: '15px', fontSize: '16px', width: '100%' }}>
            SAVE DAILY LOG
          </button>
        </div>
      </div>

      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
          RECENT LOGS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {dailyLogs.slice(0, 10).map(log => (
            <div key={log.id} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{new Date(log.date).toLocaleDateString()}</p>
                  <p style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 'bold', marginTop: '4px' }}>
                    {Math.floor(log.total_time_spent / 60)}H {log.total_time_spent % 60}M
                  </p>
                </div>
                {log.mood && <span style={{ fontSize: '24px' }}>{log.mood <= 2 ? '😞' : log.mood === 3 ? '😐' : log.mood === 4 ? '🙂' : '😄'}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {log.courses.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>{c.course_title}</span>
                    <span style={{ fontWeight: 'bold' }}>{c.time_spent}MIN</span>
                  </div>
                ))}
              </div>
              {log.notes && <p style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: 'var(--brown)' }}>{log.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Calendar View - NEW FEATURE
function CalendarView({ courses, plannedSessions, dailyLogs, onSessionAdded, onSessionDeleted }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [planNotes, setPlanNotes] = useState('');

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getActivityForDate = (dateStr) => {
    const log = dailyLogs.find(l => l.date === dateStr);
    const planned = plannedSessions.filter(p => p.planned_date === dateStr);
    return { log, planned };
  };

  const handleAddSession = async () => {
    if (!selectedCourse || !selectedDate) {
      alert('SELECT COURSE AND DATE');
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/planned`, {
        course_id: selectedCourse,
        planned_date: selectedDate,
        estimated_time: estimatedTime,
        notes: planNotes
      });
      
      setShowAddModal(false);
      setSelectedCourse('');
      setEstimatedTime(60);
      setPlanNotes('');
      onSessionAdded();
      alert('SESSION PLANNED!');
    } catch (error) {
      console.error('Error adding session:', error);
      alert('ERROR PLANNING SESSION');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('DELETE THIS PLANNED SESSION?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/planned/${sessionId}`);
      onSessionDeleted();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase' }}>{monthName}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="brutalism-button"
              style={{ padding: '10px 20px' }}
            >
              ← PREV
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="brutalism-button"
              style={{ padding: '10px 20px' }}
            >
              TODAY
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="brutalism-button"
              style={{ padding: '10px 20px' }}
            >
              NEXT →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ marginBottom: '20px' }}>
          <div className="calendar-grid">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} style={{ 
                padding: '10px', 
                textAlign: 'center', 
                fontWeight: 'bold', 
                fontSize: '12px',
                background: 'var(--dark-brown)',
                color: 'var(--cream)'
              }}>
                {day}
              </div>
            ))}
            
            {[...Array(startingDayOfWeek)].map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'var(--light-beige)', border: '2px solid var(--beige)' }} />
            ))}
            
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const { log, planned } = getActivityForDate(dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setShowAddModal(true);
                  }}
                  className={`calendar-day ${log ? 'has-activity' : ''} ${planned.length > 0 ? 'has-planned' : ''} ${isToday ? 'today' : ''}`}
                >
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{day}</span>
                  {log && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                  {planned.length > 0 && <span style={{ fontSize: '10px' }}>📅{planned.length}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--brown)', border: '2px solid var(--dark-brown)' }} />
            COMPLETED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--beige)', border: '2px solid var(--dark-brown)' }} />
            PLANNED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--white)', border: '2px solid var(--dark-brown)' }} />
            AVAILABLE
          </div>
        </div>
      </div>

      {/* Planned Sessions List */}
      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
          UPCOMING PLANNED SESSIONS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plannedSessions
            .filter(s => s.planned_date >= new Date().toISOString().split('T')[0])
            .slice(0, 10)
            .map(session => (
              <div key={session.id} style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>{session.course_title}</h3>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: 'var(--brown)', fontWeight: 'bold' }}>
                      <span>📅 {new Date(session.planned_date).toLocaleDateString()}</span>
                      <span>⏱ {session.estimated_time} MIN</span>
                    </div>
                    {session.notes && <p style={{ marginTop: '8px', fontSize: '12px', fontStyle: 'italic' }}>{session.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    style={{
                      background: 'var(--dark-brown)',
                      color: 'var(--cream)',
                      border: '3px solid var(--dark-brown)',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          {plannedSessions.filter(s => s.planned_date >= new Date().toISOString().split('T')[0]).length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>NO PLANNED SESSIONS</p>
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="brutal-card"
            style={{ 
              maxWidth: '500px', 
              width: '100%',
              boxShadow: '10px 10px 0px var(--dark-brown)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
              PLAN SESSION FOR {new Date(selectedDate).toLocaleDateString()}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>COURSE</label>
                <select 
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">SELECT COURSE...</option>
                  {courses.filter(c => c.status !== 'Completed').map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>ESTIMATED TIME (MINUTES)</label>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 60)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>NOTES</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="WHAT TO FOCUS ON..."
                  rows={3}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleAddSession} className="brutalism-button" style={{ flex: 1, padding: '12px' }}>
                  ADD SESSION
                </button>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="brutalism-button" 
                  style={{ flex: 1, padding: '12px', background: 'var(--white)' }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Completed Courses
function CompletedCourses({ courses }) {
  const totalHours = courses.reduce((sum, c) => sum + c.total_time_spent, 0) / 60;
  const avgHoursPerCourse = courses.length > 0 ? totalHours / courses.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <StatCard title="COMPLETED" value={courses.length} subtitle="COURSES DONE" />
        <StatCard title="TOTAL HOURS" value={`${Math.round(totalHours)}H`} subtitle="TIME INVESTED" />
        <StatCard title="AVG PER COURSE" value={`${Math.round(avgHoursPerCourse)}H`} subtitle="LEARNING PACE" />
      </div>

      <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
          YOUR ACHIEVEMENTS
        </h2>
        {courses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {courses.map(course => (
              <div key={course.id} style={{ background: 'var(--white)', border: '4px solid var(--dark-brown)' }}>
                <div style={{ position: 'relative', height: '130px', background: 'var(--beige)', borderBottom: '4px solid var(--dark-brown)' }}>
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/400x200/6B4E3D/FFF8E7?text=DONE`;
                    }}
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'var(--brown)', 
                    color: 'var(--cream)', 
                    padding: '6px 12px',
                    border: '3px solid var(--dark-brown)',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>
                    ✓ DONE
                  </div>
                </div>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>{course.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: 'var(--brown)' }}>
                    <span>PHASE {course.phase}</span>
                    <span>{Math.round(course.total_time_spent / 60)}H</span>
                  </div>
                  {course.completion_date && (
                    <p style={{ marginTop: '8px', fontSize: '11px', fontWeight: 'bold', color: 'var(--brown)' }}>
                      {new Date(course.completion_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>NO COMPLETED COURSES YET</p>
            <p style={{ fontSize: '14px', color: 'var(--brown)', fontWeight: 'bold' }}>KEEP LEARNING!</p>
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
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 100,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="brutal-card"
        style={{ 
          maxWidth: '700px', 
          width: '100%', 
          maxHeight: '90vh', 
          overflow: 'auto',
          boxShadow: '10px 10px 0px var(--dark-brown)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
              {course.title}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--brown)', fontWeight: 'bold' }}>
              PHASE {course.phase} - {course.phase_title}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--dark-brown)',
              color: 'var(--cream)',
              border: '3px solid var(--dark-brown)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            X
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <img 
            src={course.thumbnail} 
            alt={course.title}
            style={{ width: '100%', height: '300px', objectFit: 'cover', border: '4px solid var(--dark-brown)' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <a
            href={course.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="brutalism-button"
            style={{ padding: '15px 30px', fontSize: '14px', display: 'inline-block', textDecoration: 'none' }}
          >
            ▶ WATCH ON YOUTUBE
          </a>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--brown)' }}>DURATION</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{course.duration_hours}H</p>
          </div>
          <div style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--brown)' }}>PRIORITY</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{course.priority}</p>
          </div>
          <div style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--brown)' }}>TIME SPENT</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{Math.round(course.total_time_spent / 60)}H</p>
          </div>
          <div style={{ background: 'var(--beige)', border: '3px solid var(--dark-brown)', padding: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--brown)' }}>STATUS</p>
            <StatusBadge status={course.status} />
          </div>
        </div>

        {course.description && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
              DESCRIPTION
            </h3>
            <p style={{ fontSize: '13px', lineHeight: '1.6' }}>{course.description}</p>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>
            UPDATE PROGRESS
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              style={{ flex: 1, height: '30px' }}
            />
            <span style={{ fontSize: '24px', fontWeight: 'bold', minWidth: '60px' }}>{progress}%</span>
          </div>
          <BrutalProgressBar progress={progress} />
          <button
            onClick={handleUpdate}
            className="brutalism-button"
            style={{ width: '100%', padding: '15px', marginTop: '15px', fontSize: '16px' }}
          >
            UPDATE PROGRESS
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility Components
function StatCard({ title, value, subtitle }) {
  return (
    <div className="brutal-card" style={{ boxShadow: '6px 6px 0px var(--dark-brown)', background: 'var(--white)' }}>
      <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--brown)' }}>{title}</p>
      <p style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>{value}</p>
      <p style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--brown)' }}>{subtitle}</p>
    </div>
  );
}

function BrutalProgressBar({ progress }) {
  return (
    <div className="brutal-progress">
      <div className="brutal-progress-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Not Started': { background: 'var(--light-beige)', color: 'var(--brown)' },
    'In Progress': { background: 'var(--brown)', color: 'var(--cream)' },
    'Completed': { background: 'var(--dark-brown)', color: 'var(--cream)' }
  };

  return (
    <span className="brutal-badge" style={styles[status]}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span 
      className="brutal-badge"
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: priority === 'MUST' ? 'var(--dark-brown)' : 'var(--beige)',
        color: priority === 'MUST' ? 'var(--cream)' : 'var(--dark-brown)'
      }}
    >
      {priority}
    </span>
  );
}

export default App;
