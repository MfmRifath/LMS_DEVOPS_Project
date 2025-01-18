from django.urls import path
from .views import MongoCourseListView, MongoCourseDetailView

urlpatterns = [
    path('courses/', MongoCourseListView.as_view(), name='course-list'),  # List and Create
    path('courses/<str:course_id>/', MongoCourseDetailView.as_view(), name='course-detail'),  # Retrieve, Update, Delete
]