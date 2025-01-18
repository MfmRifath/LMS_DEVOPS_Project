from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from bson.objectid import ObjectId
import pymongo

# MongoDB Connection
url = "mongodb://localhost:27017/"
client = pymongo.MongoClient(url)
db = client['lms_db']
courses_collection = db['courses']

class MongoCourseListView(APIView):
    def get(self, request):
        """
        Fetch all courses from MongoDB.
        """
        courses = list(courses_collection.find({}, {"_id": 1, "title": 1, "description": 1, "created_at": 1}))
        for course in courses:
            course['_id'] = str(course['_id'])  # Convert ObjectId to string for JSON compatibility
        return Response(courses, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Add a new course to MongoDB.
        """
        data = request.data
        if 'title' not in data or 'description' not in data:
            return Response(
                {"error": "Both 'title' and 'description' fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_course = {
            "title": data['title'],
            "description": data['description'],
            "created_at": data.get('created_at', None),
        }
        result = courses_collection.insert_one(new_course)
        new_course['_id'] = str(result.inserted_id)  # Convert ObjectId to string
        return Response(new_course, status=status.HTTP_201_CREATED)

class MongoCourseDetailView(APIView):
    def get(self, request, course_id):
        """
        Fetch a single course by ID from MongoDB.
        """
        try:
            obj_id = ObjectId(course_id)  # Validate ObjectId
        except Exception:
            return Response({"error": "Invalid course ID format."}, status=status.HTTP_400_BAD_REQUEST)

        course = courses_collection.find_one({"_id": obj_id})
        if not course:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        course['_id'] = str(course['_id'])  # Convert ObjectId to string
        return Response(course, status=status.HTTP_200_OK)

    def put(self, request, course_id):
        """
        Update an existing course by ID in MongoDB.
        """
        try:
            obj_id = ObjectId(course_id)  # Validate ObjectId
        except Exception:
            return Response({"error": "Invalid course ID format."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        if 'title' not in data or 'description' not in data:
            return Response(
                {"error": "Both 'title' and 'description' fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated_course = {
            "title": data['title'],
            "description": data['description'],
            "created_at": data.get('created_at', None),
        }
        result = courses_collection.update_one({"_id": obj_id}, {"$set": updated_course})
        if result.matched_count == 0:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        updated_course['_id'] = course_id
        return Response(updated_course, status=status.HTTP_200_OK)

    def delete(self, request, course_id):
        """
        Delete a course by ID from MongoDB.
        """
        try:
            obj_id = ObjectId(course_id)  # Validate ObjectId
        except Exception:
            return Response({"error": "Invalid course ID format."}, status=status.HTTP_400_BAD_REQUEST)

        result = courses_collection.delete_one({"_id": obj_id})
        if result.deleted_count == 0:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "Course deleted successfully."}, status=status.HTTP_204_NO_CONTENT)