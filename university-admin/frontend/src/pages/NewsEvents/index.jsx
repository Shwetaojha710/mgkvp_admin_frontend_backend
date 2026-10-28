import { newsEvents } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn, imageColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'News Event',
  singular: 'News Event',
  basePath: '/admin/news-events',
  service: newsEvents,
  statusKey: 'isPublished',
  departmentFilter: true,
  fileField: true,
  fileLabel: 'Image',
  fileAccept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  imagePathKey: 'ImagePath',
  imageNameKey: 'ImageName',
  columns: [
    { key: 'DepartmentName', label: 'Department' },
    { key: 'Title', label: 'Title' },
    { key: 'EventDate', label: 'Event Date', render: (r) => (r.EventDate ? String(r.EventDate).slice(0, 10) : '—') },
    { key: 'ImagePath', label: 'Image', render: imageColumn('ImagePath') },
    { key: 'Priority', label: 'Priority' },
    { key: 'IsPublished', label: 'Published', render: boolColumn('IsPublished') },
  ],
  fields: [
    { name: 'departmentId', label: 'Department', type: 'department', dbKey: 'DepartmentId' },
    { name: 'title', label: 'Title', required: true, dbKey: 'Title' },
    { name: 'summary', label: 'Summary', dbKey: 'Summary' },
    { name: 'content', label: 'Content', type: 'textarea', dbKey: 'Content' },
    { name: 'eventDate', label: 'Event Date', type: 'date', dbKey: 'EventDate' },
    { name: 'priority', label: 'Priority', type: 'number', dbKey: 'Priority' },
    { name: 'isPublished', label: 'Publish', type: 'checkbox', dbKey: 'IsPublished' },
  ],
};

export function NewsEventListPage() {
  return <ResourceListPage config={config} />;
}

export function NewsEventFormPage() {
  return <ResourceFormPage config={config} />;
}
