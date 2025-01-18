
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CourseList from './CourseList';
function App() {
  return (
    <Router>
            <Routes>
                <Route path="/" element={<CourseList />} />
            </Routes>
      </Router>
  );
}

export default App;
