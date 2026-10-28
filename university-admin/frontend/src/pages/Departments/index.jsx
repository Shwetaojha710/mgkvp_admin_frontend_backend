import { departments } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'Departments',
  singular: 'Department',
  basePath: '/admin/departments',
  service: departments,
  statusKey: 'isActive',
  departmentFilter: false,
  columns: [
    { key: 'Name', label: 'Name' },
    { key: 'Code', label: 'Code' },
    { key: 'IsActive', label: 'IsActive', render: boolColumn('IsActive') },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, dbKey: 'Name' },
    { name: 'code', label: 'Code', dbKey: 'Code' },
    { name: 'description', label: 'Description', type: 'textarea', dbKey: 'Description' },
    { name: 'isActive', label: 'IsActive', type: 'checkbox', dbKey: 'IsActive' },
  ],
};

export function DepartmentListPage() {
  return <ResourceListPage config={config} />;
}

export function DepartmentFormPage() {
  return <ResourceFormPage config={config} />;
}
