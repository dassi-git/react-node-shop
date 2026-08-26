import './App.css';
import Register from './features/user/register';
import Login from './features/user/login';
import ForgotPassword from './features/user/ForgotPassword';
import ResetPassword from './features/user/ResetPassword';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Layout from './components/cpmponents/layout';
import Home from './components/Home';
import AllProduct from './features/product/allProduct';
import ProductDetail from './features/product/ProductDetail';
import BundleManager from './features/product/BundleManager';
import CaeateProduct from "./features/product/CreateProduct"
import UpdateProduct from "./features/product/updateProduct"
import GetBasket from './features/basket/getBasket';
import AdminProducts from './features/product/adminProducts';
import AdminUserList from './features/user/AdminUserList';
import UserProfile from './features/user/UserProfile';
import NotFound from './components/cpmponents/NotFound';
import RequireAuth from './components/cpmponents/RequireAuth';
import RequireAdmin from './components/cpmponents/RequireAdmin';
import QuoteRequestPage from './features/order/QuoteRequestPage';
import AdminQuotePage from './features/order/AdminQuotePage';
import MyOrdersPage from './features/order/MyOrdersPage';
import AdminOrdersPage from './features/order/AdminOrdersPage';
import PaymentSuccessPage from './features/order/PaymentSuccessPage';

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
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/quote-request" element={
              <RequireAuth>
                <QuoteRequestPage />
              </RequireAuth>
            } />
            <Route path="/my-orders" element={
              <RequireAuth>
                <MyOrdersPage />
              </RequireAuth>
            } />
            <Route path="/payment-success" element={
              <RequireAuth>
                <PaymentSuccessPage />
              </RequireAuth>
            } />
            
            {/* Admin Routes - Protected */}
            <Route path="/admin-quotes" element={
              <RequireAdmin>
                <AdminQuotePage />
              </RequireAdmin>
            } />
            <Route path="/admin-orders" element={
              <RequireAdmin>
                <AdminOrdersPage />
              </RequireAdmin>
            } />
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
            <Route path="/bundle-manager" element={
              <RequireAdmin>
                <BundleManager />
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
