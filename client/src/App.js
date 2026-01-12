import './App.css';
import Register from './features/user/register';
import Login from './features/user/login';
import ForgotPassword from './features/user/ForgotPassword';
import ResetPassword from './features/user/ResetPassword';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Layout from './components/cpmponents/layout';
import Home from './components/Home';
import AllProduct from './features/product/allProduct';
import CaeateProduct from "./features/product/CreateProduct"
import UpdateProduct from "./features/product/updateProduct"
import GetBasket from './features/basket/getBasket';
import AdminProducts from './features/product/adminProducts';
import AdminUserList from './features/user/AdminUserList';
import UserProfile from './features/user/UserProfile';
import NotFound from './components/cpmponents/NotFound';
import RequireAuth from './components/cpmponents/RequireAuth';
import RequireAdmin from './components/cpmponents/RequireAdmin';

function App() {
  return (
    <div className="App">


      <Router>
        <Routes>

          <Route path='/' element={<Layout></Layout>}>
            <Route index element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/allProduct" element={<AllProduct />} />
            
            {/* Admin Routes - Protected */}
            <Route path="/adminproduct" element={
              <RequireAdmin>
                <AdminProducts />
              </RequireAdmin>
            } />
            <Route path="/adminusers" element={
              <RequireAdmin>
                <AdminUserList />
              </RequireAdmin>
            } />
            <Route path="/adProduct" element={
              <RequireAdmin>
                <CaeateProduct />
              </RequireAdmin>
            } />
            <Route path="/updateProduct" element={
              <RequireAdmin>
                <UpdateProduct />
              </RequireAdmin>
            } />
            
            {/* User Routes - Protected */}
            <Route path='/basket' element={
              <RequireAuth>
                <GetBasket />
              </RequireAuth>
            } />
            <Route path='/allProduct/basket' element={
              <RequireAuth>
                <GetBasket />
              </RequireAuth>
            } />
            <Route path='/profile' element={
              <RequireAuth>
                <UserProfile />
              </RequireAuth>
            } />
            
            {/* 404 - Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
