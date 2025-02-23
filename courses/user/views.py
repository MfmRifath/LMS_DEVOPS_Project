from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from bson.objectid import ObjectId
from django.contrib.auth.hashers import make_password, check_password
import pymongo

# MongoDB Connection
url = "mongodb://localhost:27017/"
client = pymongo.MongoClient(url)
db = client['lms_db']
users_collection = db['users']  # Users collection


class UserRegistrationView(APIView):
    """
    User Registration using MongoDB
    """
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if email or username already exists
        if users_collection.find_one({'email': email}) or users_collection.find_one({'username': username}):
            return Response({'error': 'Email or username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Hash the password
        hashed_password = make_password(password)

        # Save user to MongoDB
        user_data = {
            'username': username,
            'email': email,
            'password': hashed_password
        }
        result = users_collection.insert_one(user_data)
        return Response({'message': 'User registered successfully!', 'user_id': str(result.inserted_id)}, status=status.HTTP_201_CREATED)


class UserLoginView(APIView):
    """
    User Login using MongoDB
    """
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Both email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find user by email
        user = users_collection.find_one({'email': email})
        if not user:
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Verify password
        if not check_password(password, user['password']):
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Return success response
        return Response({'message': 'Login successful!', 'user_id': str(user['_id'])}, status=status.HTTP_200_OK)