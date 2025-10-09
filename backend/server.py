from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to extract YouTube video ID
def extract_youtube_id(url: str) -> str:
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com/watch\?v=)([^&]+)',
        r'(?:youtu\.be/)([^?]+)',
        r'(?:youtube\.com/embed/)([^?]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return ""

def get_youtube_thumbnail(url: str) -> str:
    """Generate YouTube thumbnail URL from video URL"""
    video_id = extract_youtube_id(url)
    if video_id:
        return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    return ""

# Define Models
class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    phase: int
    phase_title: str
    duration_hours: float
    priority: str  # "MUST" or "Optional"
    youtube_url: str
    thumbnail: str = ""
    description: str = ""
    status: str = "Not Started"  # "Not Started", "In Progress", "Completed"
    progress: int = 0  # 0-100
    start_date: Optional[str] = None
    completion_date: Optional[str] = None
    total_time_spent: int = 0  # in minutes
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CourseCreate(BaseModel):
    title: str
    phase: int
    phase_title: str
    duration_hours: float
    priority: str
    youtube_url: str
    description: str = ""

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    phase: Optional[int] = None
    phase_title: Optional[str] = None
    duration_hours: Optional[float] = None
    priority: Optional[str] = None
    youtube_url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    start_date: Optional[str] = None
    completion_date: Optional[str] = None

class CourseActivity(BaseModel):
    course_id: str
    course_title: str
    time_spent: int  # in minutes
    progress_notes: str = ""

class DailyLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # ISO date string
    courses: List[CourseActivity]
    total_time_spent: int = 0  # in minutes
    notes: str = ""
    mood: Optional[int] = None  # 1-5
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DailyLogCreate(BaseModel):
    date: str
    courses: List[CourseActivity]
    notes: str = ""
    mood: Optional[int] = None

class PlannedSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    course_title: str
    planned_date: str  # ISO date string
    estimated_time: int = 60  # in minutes
    notes: str = ""
    is_completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlannedSessionCreate(BaseModel):
    course_id: str
    planned_date: str
    estimated_time: int = 60
    notes: str = ""

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Full-Stack Development Tracker API"}

# Course endpoints
@api_router.get("/courses", response_model=List[Course])
async def get_courses(
    status: Optional[str] = None,
    phase: Optional[int] = None,
    priority: Optional[str] = None
):
    """Get all courses with optional filters"""
    query = {}
    if status:
        query['status'] = status
    if phase:
        query['phase'] = phase
    if priority:
        query['priority'] = priority
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(1000)
    return courses

@api_router.get("/courses/{course_id}", response_model=Course)
async def get_course(course_id: str):
    """Get a single course by ID"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api_router.post("/courses", response_model=Course)
async def create_course(course_input: CourseCreate):
    """Create a new course"""
    course_dict = course_input.model_dump()
    course = Course(**course_dict)
    
    # Generate thumbnail from YouTube URL
    course.thumbnail = get_youtube_thumbnail(course.youtube_url)
    
    doc = course.model_dump()
    await db.courses.insert_one(doc)
    return course

@api_router.put("/courses/{course_id}", response_model=Course)
async def update_course(course_id: str, course_update: CourseUpdate):
    """Update a course"""
    existing_course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = course_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update thumbnail if YouTube URL changed
    if 'youtube_url' in update_data:
        update_data['thumbnail'] = get_youtube_thumbnail(update_data['youtube_url'])
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    
    updated_course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return updated_course

@api_router.patch("/courses/{course_id}/progress")
async def update_course_progress(course_id: str, progress: int, status: str):
    """Update course progress and status"""
    update_data = {
        'progress': progress,
        'status': status,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if status == "In Progress" and progress > 0:
        existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
        if existing and not existing.get('start_date'):
            update_data['start_date'] = datetime.now(timezone.utc).date().isoformat()
    
    if progress == 100 or status == "Completed":
        update_data['completion_date'] = datetime.now(timezone.utc).date().isoformat()
        update_data['progress'] = 100
        update_data['status'] = "Completed"
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    return {"message": "Progress updated successfully"}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    """Delete a course"""
    result = await db.courses.delete_one({"id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted successfully"}

# Daily Log endpoints
@api_router.get("/logs", response_model=List[DailyLog])
async def get_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get all daily logs with optional date range"""
    query = {}
    if start_date and end_date:
        query['date'] = {'$gte': start_date, '$lte': end_date}
    elif start_date:
        query['date'] = {'$gte': start_date}
    elif end_date:
        query['date'] = {'$lte': end_date}
    
    logs = await db.daily_logs.find(query, {"_id": 0}).sort('date', -1).to_list(1000)
    return logs

@api_router.get("/logs/{log_date}")
async def get_log_by_date(log_date: str):
    """Get daily log for a specific date"""
    log = await db.daily_logs.find_one({"date": log_date}, {"_id": 0})
    return log if log else None

@api_router.post("/logs", response_model=DailyLog)
async def create_log(log_input: DailyLogCreate):
    """Create a daily log"""
    log_dict = log_input.model_dump()
    
    # Calculate total time spent
    total_time = sum(course.time_spent for course in log_input.courses)
    log_dict['total_time_spent'] = total_time
    
    log = DailyLog(**log_dict)
    doc = log.model_dump()
    
    # Update course time spent and progress
    for course_activity in log_input.courses:
        existing_course = await db.courses.find_one({"id": course_activity.course_id}, {"_id": 0})
        if existing_course:
            new_time_spent = existing_course.get('total_time_spent', 0) + course_activity.time_spent
            duration_minutes = existing_course['duration_hours'] * 60
            new_progress = min(100, int((new_time_spent / duration_minutes) * 100))
            
            update_data = {
                'total_time_spent': new_time_spent,
                'progress': new_progress,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            if existing_course['status'] == "Not Started":
                update_data['status'] = "In Progress"
                update_data['start_date'] = log_input.date
            
            if new_progress >= 100:
                update_data['status'] = "Completed"
                update_data['completion_date'] = log_input.date
            
            await db.courses.update_one({"id": course_activity.course_id}, {"$set": update_data})
    
    # Check if log exists for this date, if so update it
    existing_log = await db.daily_logs.find_one({"date": log_input.date})
    if existing_log:
        await db.daily_logs.update_one({"date": log_input.date}, {"$set": doc})
    else:
        await db.daily_logs.insert_one(doc)
    
    return log

@api_router.delete("/logs/{log_id}")
async def delete_log(log_id: str):
    """Delete a daily log"""
    result = await db.daily_logs.delete_one({"id": log_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Log deleted successfully"}

# Planned Sessions endpoints
@api_router.get("/planned", response_model=List[PlannedSession])
async def get_planned_sessions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    course_id: Optional[str] = None
):
    """Get all planned sessions with optional filters"""
    query = {}
    if start_date and end_date:
        query['planned_date'] = {'$gte': start_date, '$lte': end_date}
    elif start_date:
        query['planned_date'] = {'$gte': start_date}
    elif end_date:
        query['planned_date'] = {'$lte': end_date}
    if course_id:
        query['course_id'] = course_id
    
    sessions = await db.planned_sessions.find(query, {"_id": 0}).sort('planned_date', 1).to_list(1000)
    return sessions

@api_router.post("/planned", response_model=PlannedSession)
async def create_planned_session(session_input: PlannedSessionCreate):
    """Create a planned session"""
    # Get course title
    course = await db.courses.find_one({"id": session_input.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    session_dict = session_input.model_dump()
    session_dict['course_title'] = course['title']
    
    session = PlannedSession(**session_dict)
    doc = session.model_dump()
    
    await db.planned_sessions.insert_one(doc)
    return session

@api_router.put("/planned/{session_id}", response_model=PlannedSession)
async def update_planned_session(session_id: str, estimated_time: Optional[int] = None, notes: Optional[str] = None, is_completed: Optional[bool] = None):
    """Update a planned session"""
    existing = await db.planned_sessions.find_one({"id": session_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Planned session not found")
    
    update_data = {}
    if estimated_time is not None:
        update_data['estimated_time'] = estimated_time
    if notes is not None:
        update_data['notes'] = notes
    if is_completed is not None:
        update_data['is_completed'] = is_completed
    
    if update_data:
        await db.planned_sessions.update_one({"id": session_id}, {"$set": update_data})
    
    updated = await db.planned_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated

@api_router.delete("/planned/{session_id}")
async def delete_planned_session(session_id: str):
    """Delete a planned session"""
    result = await db.planned_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Planned session not found")
    return {"message": "Planned session deleted successfully"}

# Analytics endpoints
@api_router.get("/analytics/summary")
async def get_analytics_summary():
    """Get dashboard analytics summary"""
    all_courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    all_logs = await db.daily_logs.find({}, {"_id": 0}).to_list(1000)
    
    total_courses = len(all_courses)
    completed_courses = len([c for c in all_courses if c['status'] == 'Completed'])
    in_progress_courses = len([c for c in all_courses if c['status'] == 'In Progress'])
    
    total_planned_hours = sum(c['duration_hours'] for c in all_courses)
    total_completed_hours = sum(c['total_time_spent'] for c in all_courses) / 60
    
    # Calculate streak
    if all_logs:
        sorted_logs = sorted(all_logs, key=lambda x: x['date'], reverse=True)
        streak = 0
        current_date = date.today()
        
        for log in sorted_logs:
            log_date = datetime.fromisoformat(log['date']).date()
            expected_date = current_date if streak == 0 else (current_date - __import__('datetime').timedelta(days=streak))
            
            if log_date == expected_date:
                streak += 1
            else:
                break
    else:
        streak = 0
    
    # Recent courses
    recent_courses = sorted(all_courses, key=lambda x: x['updated_at'], reverse=True)[:5]
    
    return {
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "in_progress_courses": in_progress_courses,
        "not_started_courses": total_courses - completed_courses - in_progress_courses,
        "total_planned_hours": round(total_planned_hours, 2),
        "total_completed_hours": round(total_completed_hours, 2),
        "current_streak": streak,
        "recent_courses": recent_courses
    }

@api_router.get("/analytics/progress")
async def get_progress_analytics():
    """Get progress over time data"""
    logs = await db.daily_logs.find({}, {"_id": 0}).sort('date', 1).to_list(1000)
    
    daily_data = []
    for log in logs:
        daily_data.append({
            "date": log['date'],
            "hours": round(log['total_time_spent'] / 60, 2),
            "courses_count": len(log['courses'])
        })
    
    return {"daily_progress": daily_data}

@api_router.get("/analytics/heatmap")
async def get_heatmap_data():
    """Get calendar heatmap data"""
    logs = await db.daily_logs.find({}, {"_id": 0}).to_list(1000)
    
    heatmap_data = {}
    for log in logs:
        heatmap_data[log['date']] = {
            "hours": round(log['total_time_spent'] / 60, 2),
            "courses": len(log['courses'])
        }
    
    return {"heatmap": heatmap_data}

# Initialize database with course data
@api_router.post("/init-database")
async def initialize_database():
    """Initialize database with course data from PDF"""
    # Check if courses already exist
    existing = await db.courses.find_one({})
    if existing:
        return {"message": "Database already initialized"}
    
    courses_data = [
        {"title": "Mastering HTML & CSS", "phase": 1, "phase_title": "Frontend Foundations", "duration_hours": 15.0, "priority": "MUST", "youtube_url": "https://youtu.be/bWACo_pvKxg?si=GnEbpuzMxXTPH04P", "description": "Build 15 Professional Projects in 15 Hours 2023. Welcome to the ultimate HTML and CSS course that empowers you to become a proficient web developer!"},
        {"title": "Tailwind CSS", "phase": 1, "phase_title": "Frontend Foundations", "duration_hours": 3.78, "priority": "MUST", "youtube_url": "https://youtu.be/WvBnTJK7Khk?si=Ihf_tQv3L-d-pv_7", "description": "Build 3 Projects. Welcome To The Tailwind CSS Masterclass."},
        {"title": "From Zero to Full Stack: JavaScript", "phase": 2, "phase_title": "Core JavaScript + TypeScript", "duration_hours": 15.0, "priority": "MUST", "youtube_url": "https://youtu.be/H3XIJYEPdus?si=dG_tPuxgnebtParH", "description": "Master JavaScript and Create Dynamic Web Apps."},
        {"title": "TypeScript Pro", "phase": 2, "phase_title": "Core JavaScript + TypeScript", "duration_hours": 4.0, "priority": "MUST", "youtube_url": "https://youtu.be/zeCDuo74uzA?si=EvXCH10PwWAGpSvH", "description": "A 4-Hour Deep Dive from Basics to Expert Level."},
        {"title": "50+ Hours React Monster", "phase": 3, "phase_title": "React (The Beast Stage)", "duration_hours": 50.0, "priority": "MUST", "youtube_url": "https://youtu.be/M9O5AjEFzKw?si=npWlr4Xjh3FP8S5u", "description": "This is your main frontend mastery. Includes projects, hooks, TS with React, UI libraries, state management, testing."},
        {"title": "Node.js Bootcamp", "phase": 4, "phase_title": "Backend Basics", "duration_hours": 2.93, "priority": "MUST", "youtube_url": "https://youtu.be/EsUL2bfKKLc?si=53OHd-ZdiqdCmiax", "description": "Intro to servers."},
        {"title": "Express.js", "phase": 4, "phase_title": "Backend Basics", "duration_hours": 2.47, "priority": "MUST", "youtube_url": "https://youtu.be/EsUL2bfKKLc?si=53OHd-ZdiqdCmiax", "description": "Framework for Node APIs."},
        {"title": "MongoDB & Mongoose", "phase": 4, "phase_title": "Backend Basics", "duration_hours": 1.72, "priority": "MUST", "youtube_url": "https://youtu.be/xdbm7n9dWHM?si=cgqSmyNa1NDIZX-c", "description": "NoSQL DB skills. Welcome to MongoDB and Mongoose Mastery!"},
        {"title": "MySQL", "phase": 4, "phase_title": "Backend Basics", "duration_hours": 3.0, "priority": "Optional", "youtube_url": "https://youtu.be/h4R-nJbM_ac?si=ckOJTmEC822a6qff", "description": "Only if you want SQL exposure. Good for DevOps later, but not urgent."},
        {"title": "MERN Movies App", "phase": 5, "phase_title": "Connecting the Dots", "duration_hours": 7.17, "priority": "MUST", "youtube_url": "https://youtu.be/Bd1EBSCu2os?si=mKLHZs-nwQHxxcT9", "description": "This ties React + Node + Express + Mongo together. MERN Mastery: Building a Scalable Movies App."},
        {"title": "Socket.IO", "phase": 5, "phase_title": "Connecting the Dots", "duration_hours": 1.0, "priority": "Optional", "youtube_url": "https://youtu.be/EtG0tv2a9Uw?si=Wpv4i-WWScRTyyWE", "description": "Real-time features like chat or live dashboards."},
        {"title": "Next.js Part 1", "phase": 6, "phase_title": "Next.js & Advanced Full-Stack", "duration_hours": 5.43, "priority": "MUST", "youtube_url": "https://youtu.be/QIDkK0FbXDc?si=Pm1QhuCBZHEQDIJq", "description": "Core Next.js."},
        {"title": "Next.js Part 2", "phase": 6, "phase_title": "Next.js & Advanced Full-Stack", "duration_hours": 5.25, "priority": "MUST", "youtube_url": "https://youtu.be/kiPrrtcIZOA?si=N_YLdNZhluvYc6TE", "description": "More advanced."},
        {"title": "Next.js Animations", "phase": 6, "phase_title": "Next.js & Advanced Full-Stack", "duration_hours": 5.77, "priority": "Optional", "youtube_url": "https://youtu.be/OkWWAgLSGkc?si=nDnKl0qfSLeiZvLq", "description": "Good if you care about polished UI."},
        {"title": "GraphQL", "phase": 7, "phase_title": "Beyond REST", "duration_hours": 0.5, "priority": "MUST", "youtube_url": "https://youtu.be/6qL9KbTXtns?si=hQcZ0G1dk_sJk4GA", "description": "Short, but gives you exposure to GraphQL queries."},
        {"title": "React Native", "phase": 8, "phase_title": "Mobile + Tools", "duration_hours": 5.12, "priority": "Optional", "youtube_url": "https://youtu.be/a_SthPXtV6c?si=iQYuFgd6Wz0aZ7aa", "description": "Nice-to-have, but focus on web first."},
        {"title": "VS Code Course", "phase": 8, "phase_title": "Mobile + Tools", "duration_hours": 2.55, "priority": "Optional", "youtube_url": "https://youtu.be/Xwuhoh1UEuk?si=XPWXltuhNSOQ9nZE", "description": "Editor mastery speeds you up."}
    ]
    
    # Create Course objects with generated thumbnails
    courses = []
    for data in courses_data:
        course = Course(**data)
        course.thumbnail = get_youtube_thumbnail(course.youtube_url)
        courses.append(course.model_dump())
    
    await db.courses.insert_many(courses)
    
    return {"message": f"Database initialized with {len(courses)} courses"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()