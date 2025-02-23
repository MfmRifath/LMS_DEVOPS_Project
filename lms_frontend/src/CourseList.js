import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ title: '', description: '' });
    const [editingCourse, setEditingCourse] = useState(null);

    // Fetch courses
    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/courses/');
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    // Add a new course
    const addCourse = async () => {
        try {
            const response = await axios.post('http://localhost:8000/api/courses/', newCourse);
            setCourses([...courses, response.data]);
            setNewCourse({ title: '', description: '' });
        } catch (error) {
            console.error('Error adding course:', error);
        }
    };

    // Edit an existing course
    const editCourse = async () => {
        try {
            const response = await axios.put(`http://localhost:8000/api/courses/${editingCourse._id}/`, editingCourse);
            setCourses(courses.map(course => (course._id === editingCourse._id ? response.data : course)));
            setEditingCourse(null);
        } catch (error) {
            console.error('Error editing course:', error);
        }
    };

    // Delete a course
    const deleteCourse = async (id) => {
        try {
            await axios.delete(`http://localhost:8000/api/courses/${id}/`);
            setCourses(courses.filter(course => course._id !== id));
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Course Management</h1>

            {/* Add New Course */}
            <div className="mb-8 bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Add New Course</h2>
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Title"
                        value={newCourse.title}
                        onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                        className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        placeholder="Description"
                        value={newCourse.description}
                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                        className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={addCourse}
                        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
                    >
                        Add Course
                    </button>
                </div>
            </div>

            {/* List of Courses */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Courses</h2>
                <ul className="space-y-4">
                    {courses.map(course => (
                        <li
                            key={course._id}
                            className="flex justify-between items-center border-b pb-2 mb-2 last:border-b-0"
                        >
                            <div>
                                <strong className="block text-lg">{course.title}</strong>
                                <span className="text-gray-600 text-sm">{course.description}</span>
                            </div>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setEditingCourse(course)}
                                    className="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteCourse(course._id)}
                                    className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Edit Course */}
            {editingCourse && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-semibold mb-4">Edit Course</h2>
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Title"
                                value={editingCourse.title}
                                onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                                className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder="Description"
                                value={editingCourse.description}
                                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                                className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-between">
                                <button
                                    onClick={editCourse}
                                    className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingCourse(null)}
                                    className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseList;