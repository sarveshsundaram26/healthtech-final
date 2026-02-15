import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for performance optimization
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const Emergency = lazy(() => import('./pages/Emergency'));
const Reminders = lazy(() => import('./pages/Reminders'));
const AIChat = lazy(() => import('./pages/AIChat'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                
                <Route path="/" element={<LandingPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard/patient" element={<PatientDashboard />} />
                  <Route path="/emergency" element={<Emergency />} />
                  <Route path="/reminders" element={<Reminders />} />
                  <Route path="/chat" element={<AIChat />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  )
}

export default App
