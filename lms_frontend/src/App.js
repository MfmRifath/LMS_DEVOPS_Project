
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CourseList from './CourseList';
import Login from './login';
import Register from './Register';
import Home from './home';
function App() {
  return (
    <Router>
            <Routes>
                <Route path="/CourseList" element={<CourseList />} />
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {/* Add other routes as needed */}
            </Routes>
      </Router>
  );
}

export default App;
