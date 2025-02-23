from django.urls import path
from .views import MongoCourseListView, MongoCourseDetailView

urlpatterns = [
    path('', MongoCourseListView.as_view(), name='course-list'),  # List & Create
    path('<str:course_id>/', MongoCourseDetailView.as_view(), name='course-detail'),  # Retrieve, Update, Delete
]