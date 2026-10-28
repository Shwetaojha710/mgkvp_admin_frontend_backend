/**
 * Thin model/repository surface.
 * Business logic lives in services; this module documents table mapping.
 */
module.exports = {
  Administrators: 'dbo.Administrators',
  Departments: 'dbo.Departments',
  Faculty: 'dbo.Faculty',
  Notices: 'dbo.Notices',
  NewsEvents: 'dbo.NewsEvents',
  Pages: 'dbo.Pages',
  Banners: 'dbo.Banners',
  Galleries: 'dbo.Galleries',
  GalleryImages: 'dbo.GalleryImages',
  Documents: 'dbo.Documents',
  UploadedFiles: 'dbo.UploadedFiles',
};
