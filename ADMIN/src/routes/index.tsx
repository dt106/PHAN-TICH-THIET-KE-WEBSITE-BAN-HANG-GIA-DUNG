
import { createBrowserRouter, Navigate, Link } from 'react-router-dom';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';

// Route protection
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// Dashboard
import DashboardPage from '../pages/dashboard/DashboardPage';

// Customer pages
import CustomersPage from '../pages/customers/CustomersPage';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage';

// Category pages
import CategoriesPage from '../pages/categories/CategoriesPage';

// Brand pages
import BrandsPage from '../pages/brands/BrandsPage';

// Product pages
import ProductsPage from '../pages/products/ProductsPage';
import ProductDetailPage from '../pages/products/ProductDetailPage';
import ProductFormPage from '../pages/products/ProductFormPage';

// Product attribute pages
import AttributesPage from '../pages/attributes/AttributesPage';
import AttributeValuesPage from '../pages/attribute-values/AttributeValuesPage';

// Product variant pages
import ProductVariantsPage from '../pages/product-variants/ProductVariantsPage';
import VariantAttributesPage from '../pages/variant-attributes/VariantAttributesPage';

// Product media
import ProductMediaPage from '../pages/product-media/ProductMediaPage';
import OrderDetailPage from '../pages/orders/OrderDetailPage';
import PaymentsPage from '../pages/payments/PaymentsPage';

import OrdersPage from '../pages/orders/OrdersPage';
import CouponsPage from '../pages/coupons/CouponsPage';
import ReviewsPage from '../pages/reviews/ReviewsPage';
import ReviewDetailPage from '../pages/reviews/ReviewDetailPage';
import AnnouncementsPage from '../pages/announcements/components/AnnouncementFormModal';
import ConversationsPage from '../pages/conversations/ConversationsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import type { AnnouncementFormValues } from '../types/announcement.types';
import ProfilePage from '../pages/profile/ProfilePage';

// ==========================================
// ADMIN 404 PAGE
// ==========================================

function AdminNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-accent-primary">
        404
      </p>

      <h1 className="mt-4 text-xl font-semibold text-text-primary">
        Không tìm thấy trang
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Trang bạn đang tìm kiếm chưa tồn tại hoặc đường dẫn không chính xác.
      </p>

      <Link
        to="/dashboard"
        className="mt-6 inline-flex min-h-10 items-center justify-center rounded-btn bg-accent-primary px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
      >
        Về Dashboard
      </Link>
    </div>
  );
}

// ==========================================
// ROUTER
// ==========================================

export const router = createBrowserRouter([
  // ------------------------------------------
  // AUTH ROUTES - Public
  // ------------------------------------------
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },

  // ------------------------------------------
  // ADMIN ROUTES - Protected
  // ------------------------------------------
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          // Root -> Dashboard
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },

          // Dashboard
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },

          // Customers
          {
            path: 'customers',
            element: <CustomersPage />,
          },
          {
            path: 'customers/:id',
            element: <CustomerDetailPage />,
          },

          // Categories
          {
            path: 'categories',
            element: <CategoriesPage />,
          },

          // Brands
          {
            path: 'brands',
            element: <BrandsPage />,
          },

          // Products
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'products/new',
            element: <ProductFormPage />,
          },
          {
            path: 'products/:id/edit',
            element: <ProductFormPage />,
          },
          {
            path: 'products/:id',
            element: <ProductDetailPage />,
          },

          // Product attributes
          {
            path: 'attributes',
            element: <AttributesPage />,
          },
          {
            path: 'attribute-values',
            element: <AttributeValuesPage />,
          },

          // Product variants
          {
            path: 'product-variants',
            element: <ProductVariantsPage />,
          },
          {
            path: 'variant-attributes',
            element: <VariantAttributesPage />,
          },

          // Product media
          {
            path: 'product-media',
            element: <ProductMediaPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'payments',
            element: <PaymentsPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'orders/:id',
            element: <OrderDetailPage />,
          },
          {
            path: 'coupons',
            element: <CouponsPage />,
          },
           {
            path: 'reviews',
            element: <ReviewsPage />,
          },
          // Hồ sơ cá nhân Admin
{
  path: 'profile',
  element: <ProfilePage />,
},
          {
  path: 'announcements',
  element: <AnnouncementsPage open={false} onClose={function (): void {
    throw new Error('Function not implemented.');
  } } onSubmit={function (): void {
    throw new Error('Function not implemented.');
  } } />,
},
{
  path: 'conversations',
  element: <ConversationsPage />,
},
{
  path: 'notifications',
  element: <NotificationsPage />,
},
          {
  path: '/admin/reviews/:id',
  element: <ReviewDetailPage />,
},
          // Admin 404
          {
            path: '*',
            element: <AdminNotFoundPage />,
          },
        ],
      },
    ],
  },

  // ------------------------------------------
  // GLOBAL FALLBACK
  // ------------------------------------------
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
