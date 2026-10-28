import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import FileInput from '../../components/forms/FileInput';
import useDepartments from '../../hooks/useDepartments';
import { cms } from '../../services/contentService';
import { fileUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { resolveModuleTitle } from '../../utils/menuByRole';
import { getCmsFormConfig } from '../../utils/cmsFormConfig';

/** Modules that mirror dbo.UniversityPages (Admin: SNO / TYPE / Content) */
const UNIVERSITY_PAGE_MODULES = new Set([
  'about-us',
  'founder',
  'vision',
  'mission',
  'objective',
  'goal',
  'centenary-year',
  'heritage',
]);

function isUniversityPageModule(moduleKey) {
  return UNIVERSITY_PAGE_MODULES.has(moduleKey);
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CmsListPage() {
  const { moduleKey } = useParams();
  const { user } = useAuth();
  const title = resolveModuleTitle(moduleKey, user?.role);
  const universityPage = isUniversityPageModule(moduleKey);
  const { departments } = useDepartments();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await cms.list(moduleKey, {
        page,
        limit: 10,
        search: search || undefined,
        departmentId: departmentId || undefined,
        isPublished: status === '' ? undefined : status,
      });
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to load ${title}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setSearch('');
    setDepartmentId('');
    setStatus('');
  }, [moduleKey]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, page, departmentId, status]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await cms.remove(moduleKey, deleteId);
      toast.success('Record deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <PageHeader
        title={universityPage ? 'The University' : `List of ${title}`}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: universityPage ? title.replace(/\b\w/g, (c) => c.toUpperCase()) : title },
        ]}
        actions={
          <Link to={`/admin/m/${moduleKey}/new`} className="btn btn-success">
            <MdAdd /> Add New
          </Link>
        }
      />

      {!universityPage && (
        <div className="filters-row">
          <div className="form-group">
            <label>Department Name</label>
            <select
              className="form-control"
              value={departmentId}
              onChange={(e) => {
                setPage(1);
                setDepartmentId(e.target.value);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.Id} value={d.Id}>
                  {d.Name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Search</label>
            <div className="search-actions">
              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    load();
                  }
                }}
                placeholder={`Search ${title.toLowerCase()}…`}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPage(1);
                  load();
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} found`}
          message="There are no records yet. Create one to get started."
          actionTo={`/admin/m/${moduleKey}/new`}
          actionLabel="Add New"
        />
      ) : universityPage ? (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SNO</th>
                <th>TYPE</th>
                <th>Content</th>
                <th>EDIT</th>
                <th>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  <td>
                    <strong>{row.Category || row.Title || '—'}</strong>
                  </td>
                  <td>
                    <div
                      className="cms-html-preview"
                      dangerouslySetInnerHTML={{
                        __html: row.Description || `<p>${stripHtml(row.Title) || '—'}</p>`,
                      }}
                    />
                  </td>
                  <td>
                    <Link to={`/admin/m/${moduleKey}/${row.Id}/edit`} title="Edit" className="action-link">
                      <MdEdit /> Edit
                    </Link>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-link delete"
                      title="Delete"
                      onClick={() => setDeleteId(row.Id)}
                    >
                      <MdDelete /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Department</th>
                <th>Title</th>
                <th>Category</th>
                <th>Image</th>
                <th>File</th>
                <th>Priority</th>
                <th>Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  <td>{row.DepartmentName || '—'}</td>
                  <td>{row.Title}</td>
                  <td>{row.Category || '—'}</td>
                  <td>
                    {row.ImagePath ? <img src={fileUrl(row.ImagePath)} alt="" className="thumb" /> : '—'}
                  </td>
                  <td>
                    {row.FilePath ? (
                      <a href={fileUrl(row.FilePath)} target="_blank" rel="noreferrer">
                        {row.FileName || 'Download'}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.Priority}</td>
                  <td>
                    <StatusBadge active={row.IsPublished} />
                  </td>
                  <td>
                    <div className="action-icons">
                      <Link to={`/admin/m/${moduleKey}/${row.Id}/edit`} title="Edit">
                        <MdEdit />
                      </Link>
                      <button type="button" className="delete" title="Delete" onClick={() => setDeleteId(row.Id)}>
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

export function CmsFormPage() {
  const { moduleKey, id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const title = resolveModuleTitle(moduleKey, user?.role);
  const universityPage = isUniversityPageModule(moduleKey);
  const formCfg = getCmsFormConfig(moduleKey);
  const navigate = useNavigate();
  const { departments } = useDepartments();
  const [file, setFile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      departmentId: '',
      title: '',
      caption: '',
      description: '',
      category: '',
      linkUrl: '',
      priority: 0,
      publishDate: '',
      isPublished: true,
    },
  });

  useEffect(() => {
    if (!isEdit) {
      const defaultType =
        {
          'about-us': 'AboutUs',
          founder: 'Founder',
          vision: 'Vision',
          mission: 'Mission',
          objective: 'Objective',
          goal: 'Goal',
          'centenary-year': 'CentenaryYear',
          heritage: 'Heritage',
        }[moduleKey] || '';

      reset({
        departmentId: '',
        title: universityPage ? defaultType : '',
        caption: '',
        description: '',
        category: universityPage ? defaultType : '',
        linkUrl: '',
        priority: 0,
        publishDate: '',
        isPublished: true,
      });
      setExisting(null);
      setFile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    cms
      .get(moduleKey, id)
      .then((res) => {
        const data = res.data;
        setExisting(data);
        reset({
          departmentId: data.DepartmentId || '',
          title: data.Title || '',
          caption: data.Caption || '',
          description: data.Description || '',
          category: data.Category || '',
          linkUrl: data.LinkUrl || '',
          priority: data.Priority ?? 0,
          publishDate: data.PublishDate ? String(data.PublishDate).slice(0, 10) : '',
          isPublished: Boolean(data.IsPublished),
        });
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate(`/admin/m/${moduleKey}`);
      })
      .finally(() => setLoading(false));
  }, [moduleKey, id, isEdit, navigate, reset, universityPage]);

  async function onSubmit(values) {
    setSaving(true);
    try {
      const payload = universityPage
        ? {
            ...values,
            title: values.category || values.title,
            category: values.category || values.title,
            file,
          }
        : { ...values, file };
      if (isEdit) {
        await cms.update(moduleKey, id, payload);
        toast.success('Record updated');
      } else {
        await cms.create(moduleKey, payload);
        toast.success('Record created');
      }
      navigate(`/admin/m/${moduleKey}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card loading-state">Loading…</div>;

  return (
    <div className="card">
      <PageHeader
        title={`${isEdit ? 'Edit' : 'Add'} ${title}`}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: universityPage ? 'The University' : title, to: `/admin/m/${moduleKey}` },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: universityPage ? 960 : 760 }}>
        {universityPage ? (
          <>
            <div className="form-group">
              <label>
                Type <span className="required">*</span>
              </label>
              <input className="form-control" {...register('category', { required: true })} />
            </div>
            <div className="form-group">
              <label>
                Content <span className="required">*</span>
              </label>
              <textarea
                className="form-control"
                rows={18}
                {...register('description', { required: true })}
                placeholder="HTML content…"
              />
            </div>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="isPublished" {...register('isPublished')} />
              <label htmlFor="isPublished" style={{ margin: 0 }}>
                Published
              </label>
            </div>
          </>
        ) : (
          <>
            {formCfg.showDepartment && (
              <div className="form-group">
                <label>Department Name</label>
                <select className="form-control" {...register('departmentId')}>
                  <option value="">--Select--</option>
                  {departments.map((d) => (
                    <option key={d.Id} value={d.Id}>
                      {d.Name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>
                {formCfg.titleLabel} {formCfg.titleRequired && <span className="required">*</span>}
              </label>
              <input
                className="form-control"
                {...register('title', { required: Boolean(formCfg.titleRequired) })}
              />
            </div>
            {formCfg.showCaption && (
              <div className="form-group">
                <label>{formCfg.captionLabel}</label>
                <input className="form-control" {...register('caption')} />
              </div>
            )}
            {formCfg.showCategory && (
              <div className="form-group">
                <label>{formCfg.categoryLabel}</label>
                <input className="form-control" {...register('category')} />
              </div>
            )}
            {formCfg.showDescription && (
              <div className="form-group">
                <label>{formCfg.descriptionLabel}</label>
                <textarea
                  className="form-control"
                  rows={formCfg.descriptionRows || 5}
                  {...register('description')}
                />
              </div>
            )}
            {formCfg.showLinkUrl && (
              <div className="form-group">
                <label>{formCfg.linkUrlLabel}</label>
                <input className="form-control" placeholder="https://..." {...register('linkUrl')} />
              </div>
            )}
            {formCfg.showFile && (
              <FileInput
                label={formCfg.fileLabel}
                accept={formCfg.fileAccept || 'image/*,.pdf,.doc,.docx'}
                value={file}
                onChange={setFile}
                existingPath={existing?.ImagePath || existing?.FilePath}
                existingName={existing?.ImageName || existing?.FileName}
              />
            )}
            {formCfg.showPriority && (
              <div className="form-group">
                <label>Priority</label>
                <input type="number" className="form-control" {...register('priority')} />
              </div>
            )}
            {formCfg.showPublishDate && (
              <div className="form-group">
                <label>Publish / Upload Date</label>
                <input type="date" className="form-control" {...register('publishDate')} />
              </div>
            )}
            {formCfg.showPublished && (
              <div className="form-group checkbox-row">
                <input type="checkbox" id="isPublished" {...register('isPublished')} />
                <label htmlFor="isPublished" style={{ margin: 0 }}>
                  {formCfg.publishedLabel || 'Is Active / Publish'}
                </label>
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to={`/admin/m/${moduleKey}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
