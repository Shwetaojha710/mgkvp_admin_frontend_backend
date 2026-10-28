import { documents } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn, linkColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'Documents',
  singular: 'Document',
  basePath: '/admin/documents',
  service: documents,
  statusKey: 'isPublished',
  departmentFilter: true,
  fileField: true,
  fileRequiredOnCreate: true,
  fileLabel: 'Document (PDF/DOCX)',
  fileAccept: '.pdf,.doc,.docx',
  filePathKey: 'FilePath',
  fileNameKey: 'FileName',
  columns: [
    { key: 'DepartmentName', label: 'Department' },
    { key: 'Title', label: 'Title' },
    { key: 'Category', label: 'Category' },
    { key: 'FilePath', label: 'File', render: linkColumn() },
    { key: 'IsPublished', label: 'Published', render: boolColumn('IsPublished') },
  ],
  fields: [
    { name: 'departmentId', label: 'Department', type: 'department', dbKey: 'DepartmentId' },
    { name: 'title', label: 'Title', required: true, dbKey: 'Title' },
    { name: 'category', label: 'Category', dbKey: 'Category' },
    { name: 'description', label: 'Description', type: 'textarea', dbKey: 'Description' },
    { name: 'isPublished', label: 'Publish', type: 'checkbox', dbKey: 'IsPublished' },
  ],
};

export function DocumentListPage() {
  return <ResourceListPage config={config} />;
}

export function DocumentFormPage() {
  return <ResourceFormPage config={config} />;
}
