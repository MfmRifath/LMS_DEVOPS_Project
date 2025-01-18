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
        <div>
            <h1>Courses</h1>

            {/* Add New Course */}
            <div>
                <h2>Add New Course</h2>
                <input
                    type="text"
                    placeholder="Title"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
                <button onClick={addCourse}>Add Course</button>
            </div>

            {/* List of Courses */}
            <ul>
                {courses.map(course => (
                    <li key={course._id}>
                        <strong>{course.title}</strong>
                        <button onClick={() => setEditingCourse(course)}>Edit</button>
                        <button onClick={() => deleteCourse(course._id)}>Delete</button>
                    </li>
                ))}
            </ul>

            {/* Edit Course */}
            {editingCourse && (
                <div>
                    <h2>Edit Course</h2>
                    <input
                        type="text"
                        placeholder="Title"
                        value={editingCourse.title}
                        onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Description"
                        value={editingCourse.description}
                        onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    />
                    <button onClick={editCourse}>Save Changes</button>
                    <button onClick={() => setEditingCourse(null)}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default CourseList;