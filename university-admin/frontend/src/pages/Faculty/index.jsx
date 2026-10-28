import { faculty } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn, imageColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'Faculty',
  singular: 'Faculty',
  basePath: '/admin/faculty',
  service: faculty,
  statusKey: 'isActive',
  departmentFilter: true,
  fileField: true,
  fileLabel: 'Photo',
  fileAccept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  imagePathKey: 'PhotoPath',
  imageNameKey: 'PhotoName',
  columns: [
    { key: 'DepartmentName', label: 'Department' },
    { key: 'FullName', label: 'Name' },
    { key: 'Designation', label: 'Designation' },
    { key: 'Email', label: 'Email' },
    { key: 'PhotoPath', label: 'Photo', render: imageColumn('PhotoPath') },
    { key: 'IsActive', label: 'IsActive', render: boolColumn('IsActive') },
  ],
  fields: [
    { name: 'departmentId', label: 'Department', type: 'department', dbKey: 'DepartmentId' },
    { name: 'fullName', label: 'Full Name', required: true, dbKey: 'FullName' },
    { name: 'designation', label: 'Designation', dbKey: 'Designation' },
    { name: 'email', label: 'Email', type: 'email', dbKey: 'Email' },
    { name: 'phone', label: 'Phone', dbKey: 'Phone' },
    { name: 'bio', label: 'Bio', type: 'textarea', dbKey: 'Bio' },
    { name: 'isActive', label: 'IsActive', type: 'checkbox', dbKey: 'IsActive' },
  ],
};

export function FacultyListPage() {
  return <ResourceListPage config={config} />;
}

export function FacultyFormPage() {
  return <ResourceFormPage config={config} />;
}
