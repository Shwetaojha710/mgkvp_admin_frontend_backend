import { pages } from '../../services/contentService';
import { ResourceFormPage, ResourceListPage, boolColumn } from '../../components/tables/ResourceCrud';

const config = {
  title: 'Pages',
  singular: 'Page',
  basePath: '/admin/pages',
  service: pages,
  statusKey: 'isPublished',
  columns: [
    { key: 'Title', label: 'Title' },
    { key: 'Slug', label: 'Slug' },
    { key: 'Category', label: 'Category' },
    { key: 'IsPublished', label: 'Published', render: boolColumn('IsPublished') },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, dbKey: 'Title' },
    { name: 'slug', label: 'Slug', dbKey: 'Slug' },
    { name: 'category', label: 'Category', dbKey: 'Category' },
    { name: 'content', label: 'Content', type: 'textarea', required: true, dbKey: 'Content' },
    { name: 'isPublished', label: 'Publish', type: 'checkbox', dbKey: 'IsPublished' },
  ],
};

export function PageListPage() {
  return <ResourceListPage config={config} />;
}

export function PageFormPage() {
  return <ResourceFormPage config={config} />;
}
