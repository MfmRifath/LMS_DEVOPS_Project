import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Welcome to the LMS</h1>
            <p className="text-lg text-center mb-4">Manage your courses and access your account.</p>
            
            <div className="flex justify-center space-x-4">
                <Link
                    to="/login"
                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
                >
                    Login
                </Link>
                <Link
                    to="/register"
                    className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition"
                >
                    Register
                </Link>
            </div>
        </div>
    );
};

export default Home;