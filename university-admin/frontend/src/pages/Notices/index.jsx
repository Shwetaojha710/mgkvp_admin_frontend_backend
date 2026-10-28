import { notices } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn, linkColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'Notices',
  singular: 'Notice',
  basePath: '/admin/notices',
  service: notices,
  statusKey: 'isPublished',
  departmentFilter: true,
  fileField: true,
  fileLabel: 'Attachment (PDF/DOCX/Image)',
  fileAccept: '.pdf,.doc,.docx,image/*',
  filePathKey: 'FilePath',
  fileNameKey: 'FileName',
  columns: [
    { key: 'DepartmentName', label: 'Department' },
    { key: 'Title', label: 'Title' },
    { key: 'Category', label: 'Category' },
    { key: 'PublishDate', label: 'Publish Date', render: (r) => (r.PublishDate ? String(r.PublishDate).slice(0, 10) : '—') },
    { key: 'FilePath', label: 'File', render: linkColumn() },
    { key: 'IsPublished', label: 'Published', render: boolColumn('IsPublished') },
  ],
  fields: [
    { name: 'departmentId', label: 'Department', type: 'department', dbKey: 'DepartmentId' },
    { name: 'title', label: 'Title', required: true, dbKey: 'Title' },
    { name: 'category', label: 'Category', dbKey: 'Category' },
    { name: 'description', label: 'Description', type: 'textarea', dbKey: 'Description' },
    { name: 'publishDate', label: 'Publish Date', type: 'date', dbKey: 'PublishDate' },
    { name: 'isPublished', label: 'Publish', type: 'checkbox', dbKey: 'IsPublished' },
  ],
};

export function NoticeListPage() {
  return <ResourceListPage config={config} />;
}

export function NoticeFormPage() {
  return <ResourceFormPage config={config} />;
}
