import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import BannerListPage from '../pages/Banners/BannerListPage';
import BannerFormPage from '../pages/Banners/BannerFormPage';
import { DepartmentListPage, DepartmentFormPage } from '../pages/Departments';
import { FacultyListPage, FacultyFormPage } from '../pages/Faculty';
import { NoticeListPage, NoticeFormPage } from '../pages/Notices';
import { NewsEventListPage, NewsEventFormPage } from '../pages/NewsEvents';
import { PageListPage, PageFormPage } from '../pages/Pages';
import { DocumentListPage, DocumentFormPage } from '../pages/Documents';
import {
  AlbumListPage,
  AlbumFormPage,
  GalleryImagesListPage,
  GalleryImageFormPage,
} from '../pages/Galleries';
import { CmsListPage, CmsFormPage } from '../pages/Cms/CmsModulePages';
import { useAuth } from '../context/AuthContext';

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-state">Loading…</div>;
  if (isAuthenticated) return <Navigate to="/admin" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="banners" element={<BannerListPage />} />
          <Route path="banners/new" element={<BannerFormPage />} />
          <Route path="banners/:id/edit" element={<BannerFormPage />} />

          <Route path="departments" element={<DepartmentListPage />} />
          <Route path="departments/new" element={<DepartmentFormPage />} />
          <Route path="departments/:id/edit" element={<DepartmentFormPage />} />

          <Route path="faculty" element={<FacultyListPage />} />
          <Route path="faculty/new" element={<FacultyFormPage />} />
          <Route path="faculty/:id/edit" element={<FacultyFormPage />} />

          <Route path="notices" element={<NoticeListPage />} />
          <Route path="notices/new" element={<NoticeFormPage />} />
          <Route path="notices/:id/edit" element={<NoticeFormPage />} />

          <Route path="news-events" element={<NewsEventListPage />} />
          <Route path="news-events/new" element={<NewsEventFormPage />} />
          <Route path="news-events/:id/edit" element={<NewsEventFormPage />} />

          <Route path="pages" element={<PageListPage />} />
          <Route path="pages/new" element={<PageFormPage />} />
          <Route path="pages/:id/edit" element={<PageFormPage />} />

          <Route path="documents" element={<DocumentListPage />} />
          <Route path="documents/new" element={<DocumentFormPage />} />
          <Route path="documents/:id/edit" element={<DocumentFormPage />} />

          {/* Album = dbo.Galleries (reference AlbumList) */}
          <Route path="albums" element={<AlbumListPage />} />
          <Route path="albums/new" element={<AlbumFormPage />} />
          <Route path="albums/:id/edit" element={<AlbumFormPage />} />

          {/* Gallery images = dbo.GalleryImages (reference GalleryList) */}
          <Route path="gallery-images" element={<GalleryImagesListPage />} />
          <Route path="gallery-images/new" element={<GalleryImageFormPage />} />
          <Route path="gallery-images/:id/edit" element={<GalleryImageFormPage />} />

          {/* Back-compat redirects */}
          <Route path="galleries" element={<Navigate to="/admin/albums" replace />} />
          <Route path="galleries/new" element={<Navigate to="/admin/albums/new" replace />} />
          <Route path="galleries/:id/edit" element={<Navigate to="/admin/albums" replace />} />

          {/* All remaining reference sidebar modules — working CMS CRUD */}
          <Route path="m/:moduleKey" element={<CmsListPage />} />
          <Route path="m/:moduleKey/new" element={<CmsFormPage />} />
          <Route path="m/:moduleKey/:id/edit" element={<CmsFormPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
