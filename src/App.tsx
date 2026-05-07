import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MyFootprints from './pages/MyFootprints'
import SmartPlanner from './pages/SmartPlanner'
import RandomWheel from './pages/RandomWheel'
import Wishlist from './pages/Wishlist'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/footprints" element={<MyFootprints />} />
        <Route path="/planner" element={<SmartPlanner />} />
        <Route path="/random" element={<RandomWheel />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
