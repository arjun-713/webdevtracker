#!/usr/bin/env python3
"""
Backend API Testing for Full-Stack Development Learning Tracker
Tests all backend endpoints with comprehensive scenarios
"""

import requests
import json
from datetime import datetime, date, timedelta
import uuid
import sys
import time

# Configuration
BASE_URL = "https://codejourney-18.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class BackendTester:
    def __init__(self):
        self.test_results = {
            "database_init": {"passed": False, "errors": []},
            "course_crud": {"passed": False, "errors": []},
            "daily_logs": {"passed": False, "errors": []},
            "analytics": {"passed": False, "errors": []}
        }
        self.created_course_id = None
        self.created_log_id = None
        
    def log_error(self, category, message):
        """Log an error for a specific test category"""
        self.test_results[category]["errors"].append(message)
        print(f"❌ ERROR [{category}]: {message}")
        
    def log_success(self, category, message):
        """Log a success for a specific test category"""
        print(f"✅ SUCCESS [{category}]: {message}")
        
    def test_api_connection(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{BASE_URL}/", timeout=10)
            if response.status_code == 200:
                print(f"✅ API Connection successful: {response.json()}")
                return True
            else:
                print(f"❌ API Connection failed: Status {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ API Connection failed: {str(e)}")
            return False
    
    def test_database_initialization(self):
        """Test database initialization endpoint"""
        print("\n🔄 Testing Database Initialization...")
        
        try:
            # Test database initialization
            response = requests.post(f"{BASE_URL}/init-database", headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                self.log_success("database_init", f"Database init response: {result['message']}")
                
                # Verify courses were created
                courses_response = requests.get(f"{BASE_URL}/courses", timeout=10)
                if courses_response.status_code == 200:
                    courses = courses_response.json()
                    if len(courses) >= 17:
                        self.log_success("database_init", f"Found {len(courses)} courses in database")
                        
                        # Check if courses have YouTube thumbnails
                        courses_with_thumbnails = [c for c in courses if c.get('thumbnail')]
                        if len(courses_with_thumbnails) >= 15:  # Allow some flexibility
                            self.log_success("database_init", f"{len(courses_with_thumbnails)} courses have thumbnails")
                            self.test_results["database_init"]["passed"] = True
                        else:
                            self.log_error("database_init", f"Only {len(courses_with_thumbnails)} courses have thumbnails")
                    else:
                        self.log_error("database_init", f"Expected 17 courses, found {len(courses)}")
                else:
                    self.log_error("database_init", f"Failed to fetch courses: {courses_response.status_code}")
            else:
                self.log_error("database_init", f"Init failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_error("database_init", f"Exception during database init: {str(e)}")
    
    def test_course_crud_operations(self):
        """Test all course CRUD operations"""
        print("\n🔄 Testing Course CRUD Operations...")
        
        try:
            # 1. Test GET /courses (without filters)
            response = requests.get(f"{BASE_URL}/courses", timeout=10)
            if response.status_code == 200:
                courses = response.json()
                self.log_success("course_crud", f"GET /courses returned {len(courses)} courses")
            else:
                self.log_error("course_crud", f"GET /courses failed: {response.status_code}")
                return
            
            # 2. Test GET /courses with filters
            # Test status filter
            response = requests.get(f"{BASE_URL}/courses?status=Not Started", timeout=10)
            if response.status_code == 200:
                filtered_courses = response.json()
                self.log_success("course_crud", f"Status filter returned {len(filtered_courses)} courses")
            else:
                self.log_error("course_crud", f"Status filter failed: {response.status_code}")
            
            # Test phase filter
            response = requests.get(f"{BASE_URL}/courses?phase=1", timeout=10)
            if response.status_code == 200:
                phase_courses = response.json()
                self.log_success("course_crud", f"Phase filter returned {len(phase_courses)} courses")
            else:
                self.log_error("course_crud", f"Phase filter failed: {response.status_code}")
            
            # Test priority filter
            response = requests.get(f"{BASE_URL}/courses?priority=MUST", timeout=10)
            if response.status_code == 200:
                priority_courses = response.json()
                self.log_success("course_crud", f"Priority filter returned {len(priority_courses)} courses")
            else:
                self.log_error("course_crud", f"Priority filter failed: {response.status_code}")
            
            # 3. Test POST /courses (create new course)
            new_course_data = {
                "title": "Test Course - Advanced React Patterns",
                "phase": 3,
                "phase_title": "React (The Beast Stage)",
                "duration_hours": 8.5,
                "priority": "MUST",
                "youtube_url": "https://youtu.be/dQw4w9WgXcQ",
                "description": "Advanced React patterns and best practices for scalable applications"
            }
            
            response = requests.post(f"{BASE_URL}/courses", json=new_course_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                created_course = response.json()
                self.created_course_id = created_course['id']
                self.log_success("course_crud", f"Created course with ID: {self.created_course_id}")
                
                # Verify thumbnail was generated
                if created_course.get('thumbnail'):
                    self.log_success("course_crud", "Thumbnail generated for new course")
                else:
                    self.log_error("course_crud", "No thumbnail generated for new course")
            else:
                self.log_error("course_crud", f"Course creation failed: {response.status_code} - {response.text}")
                return
            
            # 4. Test GET /courses/{course_id}
            response = requests.get(f"{BASE_URL}/courses/{self.created_course_id}", timeout=10)
            if response.status_code == 200:
                course = response.json()
                self.log_success("course_crud", f"Retrieved course: {course['title']}")
            else:
                self.log_error("course_crud", f"Get single course failed: {response.status_code}")
            
            # 5. Test PUT /courses/{course_id} (update course)
            update_data = {
                "title": "Test Course - Advanced React Patterns (Updated)",
                "description": "Updated description with more advanced topics",
                "duration_hours": 10.0
            }
            
            response = requests.put(f"{BASE_URL}/courses/{self.created_course_id}", json=update_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                updated_course = response.json()
                self.log_success("course_crud", f"Updated course title: {updated_course['title']}")
            else:
                self.log_error("course_crud", f"Course update failed: {response.status_code} - {response.text}")
            
            # 6. Test PATCH /courses/{course_id}/progress
            response = requests.patch(f"{BASE_URL}/courses/{self.created_course_id}/progress?progress=50&status=In Progress", timeout=10)
            if response.status_code == 200:
                self.log_success("course_crud", "Progress update successful")
                
                # Verify the progress was updated
                response = requests.get(f"{BASE_URL}/courses/{self.created_course_id}", timeout=10)
                if response.status_code == 200:
                    course = response.json()
                    if course['progress'] == 50 and course['status'] == 'In Progress':
                        self.log_success("course_crud", "Progress and status correctly updated")
                    else:
                        self.log_error("course_crud", f"Progress not updated correctly: {course['progress']}, {course['status']}")
            else:
                self.log_error("course_crud", f"Progress update failed: {response.status_code}")
            
            # 7. Test DELETE /courses/{course_id} (will be done at the end)
            
            self.test_results["course_crud"]["passed"] = True
            
        except Exception as e:
            self.log_error("course_crud", f"Exception during CRUD tests: {str(e)}")
    
    def test_daily_log_system(self):
        """Test daily log system"""
        print("\n🔄 Testing Daily Log System...")
        
        try:
            # First, get some courses to use in logs
            response = requests.get(f"{BASE_URL}/courses", timeout=10)
            if response.status_code != 200:
                self.log_error("daily_logs", "Cannot get courses for log testing")
                return
            
            courses = response.json()
            if len(courses) < 2:
                self.log_error("daily_logs", "Need at least 2 courses for log testing")
                return
            
            # 1. Test POST /logs (create daily log)
            today = date.today().isoformat()
            log_data = {
                "date": today,
                "courses": [
                    {
                        "course_id": courses[0]['id'],
                        "course_title": courses[0]['title'],
                        "time_spent": 120,  # 2 hours
                        "progress_notes": "Completed first 3 modules, learned about component lifecycle"
                    },
                    {
                        "course_id": courses[1]['id'],
                        "course_title": courses[1]['title'],
                        "time_spent": 90,   # 1.5 hours
                        "progress_notes": "Practiced CSS Grid and Flexbox layouts"
                    }
                ],
                "notes": "Great learning session today! Feeling confident about React concepts.",
                "mood": 5
            }
            
            response = requests.post(f"{BASE_URL}/logs", json=log_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                created_log = response.json()
                self.created_log_id = created_log['id']
                self.log_success("daily_logs", f"Created daily log with ID: {self.created_log_id}")
                
                # Verify total time calculation
                expected_total = 120 + 90
                if created_log['total_time_spent'] == expected_total:
                    self.log_success("daily_logs", f"Total time calculated correctly: {expected_total} minutes")
                else:
                    self.log_error("daily_logs", f"Total time incorrect: expected {expected_total}, got {created_log['total_time_spent']}")
                
                # Verify course progress was updated
                time.sleep(1)  # Give time for course updates
                for course_activity in log_data['courses']:
                    course_response = requests.get(f"{BASE_URL}/courses/{course_activity['course_id']}", timeout=10)
                    if course_response.status_code == 200:
                        updated_course = course_response.json()
                        if updated_course['total_time_spent'] >= course_activity['time_spent']:
                            self.log_success("daily_logs", f"Course {updated_course['title']} time updated to {updated_course['total_time_spent']} minutes")
                        else:
                            self.log_error("daily_logs", f"Course time not updated for {updated_course['title']}")
            else:
                self.log_error("daily_logs", f"Log creation failed: {response.status_code} - {response.text}")
                return
            
            # 2. Test GET /logs (get all logs)
            response = requests.get(f"{BASE_URL}/logs", timeout=10)
            if response.status_code == 200:
                logs = response.json()
                self.log_success("daily_logs", f"Retrieved {len(logs)} logs")
            else:
                self.log_error("daily_logs", f"Get logs failed: {response.status_code}")
            
            # 3. Test GET /logs/{date} (get log for specific date)
            response = requests.get(f"{BASE_URL}/logs/{today}", timeout=10)
            if response.status_code == 200:
                log = response.json()
                if log:
                    self.log_success("daily_logs", f"Retrieved log for date {today}")
                else:
                    self.log_error("daily_logs", f"No log found for date {today}")
            else:
                self.log_error("daily_logs", f"Get log by date failed: {response.status_code}")
            
            # 4. Test DELETE /logs/{log_id} (will be done at cleanup)
            
            self.test_results["daily_logs"]["passed"] = True
            
        except Exception as e:
            self.log_error("daily_logs", f"Exception during daily log tests: {str(e)}")
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n🔄 Testing Analytics Endpoints...")
        
        try:
            # 1. Test GET /analytics/summary
            response = requests.get(f"{BASE_URL}/analytics/summary", timeout=10)
            if response.status_code == 200:
                summary = response.json()
                required_fields = ['total_courses', 'completed_courses', 'in_progress_courses', 
                                 'not_started_courses', 'total_planned_hours', 'total_completed_hours', 
                                 'current_streak', 'recent_courses']
                
                missing_fields = [field for field in required_fields if field not in summary]
                if not missing_fields:
                    self.log_success("analytics", f"Summary contains all required fields")
                    self.log_success("analytics", f"Total courses: {summary['total_courses']}, Streak: {summary['current_streak']}")
                else:
                    self.log_error("analytics", f"Missing fields in summary: {missing_fields}")
            else:
                self.log_error("analytics", f"Analytics summary failed: {response.status_code}")
            
            # 2. Test GET /analytics/progress
            response = requests.get(f"{BASE_URL}/analytics/progress", timeout=10)
            if response.status_code == 200:
                progress = response.json()
                if 'daily_progress' in progress:
                    self.log_success("analytics", f"Progress analytics returned {len(progress['daily_progress'])} data points")
                else:
                    self.log_error("analytics", "Progress analytics missing 'daily_progress' field")
            else:
                self.log_error("analytics", f"Analytics progress failed: {response.status_code}")
            
            # 3. Test GET /analytics/heatmap
            response = requests.get(f"{BASE_URL}/analytics/heatmap", timeout=10)
            if response.status_code == 200:
                heatmap = response.json()
                if 'heatmap' in heatmap:
                    self.log_success("analytics", f"Heatmap analytics returned data for {len(heatmap['heatmap'])} dates")
                else:
                    self.log_error("analytics", "Heatmap analytics missing 'heatmap' field")
            else:
                self.log_error("analytics", f"Analytics heatmap failed: {response.status_code}")
            
            self.test_results["analytics"]["passed"] = True
            
        except Exception as e:
            self.log_error("analytics", f"Exception during analytics tests: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created course
        if self.created_course_id:
            try:
                response = requests.delete(f"{BASE_URL}/courses/{self.created_course_id}", timeout=10)
                if response.status_code == 200:
                    self.log_success("course_crud", "Test course deleted successfully")
                else:
                    self.log_error("course_crud", f"Failed to delete test course: {response.status_code}")
            except Exception as e:
                self.log_error("course_crud", f"Exception deleting course: {str(e)}")
        
        # Delete created log
        if self.created_log_id:
            try:
                response = requests.delete(f"{BASE_URL}/logs/{self.created_log_id}", timeout=10)
                if response.status_code == 200:
                    self.log_success("daily_logs", "Test log deleted successfully")
                else:
                    self.log_error("daily_logs", f"Failed to delete test log: {response.status_code}")
            except Exception as e:
                self.log_error("daily_logs", f"Exception deleting log: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Full-Stack Development Learning Tracker Backend Tests")
        print(f"🌐 Testing API at: {BASE_URL}")
        print("=" * 80)
        
        # Test API connection first
        if not self.test_api_connection():
            print("❌ Cannot connect to API. Aborting tests.")
            return False
        
        # Run all test suites
        self.test_database_initialization()
        self.test_course_crud_operations()
        self.test_daily_log_system()
        self.test_analytics_endpoints()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        self.print_test_summary()
        
        return all(result["passed"] for result in self.test_results.values())
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result["passed"])
        
        for category, result in self.test_results.items():
            status = "✅ PASSED" if result["passed"] else "❌ FAILED"
            print(f"{category.upper().replace('_', ' ')}: {status}")
            
            if result["errors"]:
                for error in result["errors"]:
                    print(f"  - {error}")
        
        print(f"\nOVERALL: {passed_tests}/{total_tests} test suites passed")
        
        if passed_tests == total_tests:
            print("🎉 All backend tests PASSED!")
        else:
            print("⚠️  Some backend tests FAILED - see details above")

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()