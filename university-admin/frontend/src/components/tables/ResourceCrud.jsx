import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdDelete, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import Pagination from '../common/Pagination';
import ConfirmDialog from '../common/ConfirmDialog';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import FileInput from '../forms/FileInput';
import useDepartments from '../../hooks/useDepartments';
import { fileUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { MdAdd } from 'react-icons/md';

/**
 * Configurable list + form pages for content modules.
 * config: {
 *   title, singular, basePath, service,
 *   columns: [{ key, label, render? }],
 *   fields: [{ name, label, type, required, options? }],
 *   fileField?, fileAccept?, statusKey?, departmentFilter?
 * }
 */
export function ResourceListPage({ config }) {
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

  const statusKey = config.statusKey || 'isPublished';

  async function load() {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: search || undefined,
      };
      if (config.departmentFilter) {
        params.departmentId = departmentId || undefined;
      }
      if (status !== '') {
        params[statusKey] = status;
      }
      const res = await config.service.list(params);
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to load ${config.title}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, departmentId, status]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await config.service.remove(deleteId);
      toast.success(`${config.singular} deleted`);
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <PageHeader
        title={`List of ${config.title}`}
        crumbs={[{ label: 'Home', to: '/admin' }, { label: config.title }]}
        actions={
          <Link to={`${config.basePath}/new`} className="btn btn-success">
            <MdAdd /> Add New
          </Link>
        }
      />

      <div className="filters-row">
        {config.departmentFilter && (
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
        )}
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
            <option value="true">Published / Active</option>
            <option value="false">Unpublished / Inactive</option>
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
              placeholder={`Search ${config.title.toLowerCase()}…`}
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

      {loading ? (
        <div className="loading-state">Loading {config.title.toLowerCase()}…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${config.title.toLowerCase()} found`}
          message="There are no records yet. Create one to get started."
          actionTo={`${config.basePath}/new`}
          actionLabel={`Add ${config.singular}`}
        />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                {config.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  {config.columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
                  <td>
                    <div className="action-icons">
                      <Link to={`${config.basePath}/${row.Id}/edit`} title="Edit">
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
        title={`Delete ${config.singular}`}
        message={`Are you sure you want to delete this ${config.singular.toLowerCase()}?`}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

export function ResourceFormPage({ config }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { departments } = useDepartments();
  const [file, setFile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const defaults = {};
  config.fields.forEach((f) => {
    if (f.type === 'checkbox') defaults[f.name] = false;
    else if (f.type === 'number') defaults[f.name] = 0;
    else defaults[f.name] = '';
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: defaults });

  useEffect(() => {
    if (!isEdit) return;
    config.service
      .get(id)
      .then((res) => {
        const data = res.data;
        setExisting(data);
        const values = {};
        config.fields.forEach((f) => {
          const dbKey = f.dbKey || f.name.charAt(0).toUpperCase() + f.name.slice(1);
          let val = data[dbKey];
          if (f.type === 'checkbox') val = Boolean(val);
          if (f.type === 'date' && val) val = String(val).slice(0, 10);
          if (val === null || val === undefined) val = f.type === 'checkbox' ? false : '';
          values[f.name] = val;
        });
        reset(values);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, 'Failed to load record'));
        navigate(config.basePath);
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, reset, config]);

  async function onSubmit(values) {
    if (config.fileRequiredOnCreate && !isEdit && !file) {
      toast.error('File is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values };
      if (config.fileField) payload.file = file;
      if (isEdit) {
        await config.service.update(id, payload);
        toast.success(`${config.singular} updated`);
      } else {
        await config.service.create(payload);
        toast.success(`${config.singular} created`);
      }
      navigate(config.basePath);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card loading-state">Loading…</div>;

  return (
    <div className="card">
      <PageHeader
        title={`${isEdit ? 'Edit' : 'Add'} ${config.singular}`}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: config.title, to: config.basePath },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 720 }}>
        {config.fields.map((f) => {
          if (f.type === 'department') {
            return (
              <div className="form-group" key={f.name}>
                <label>
                  {f.label} {f.required && <span className="required">*</span>}
                </label>
                <select
                  className="form-control"
                  {...register(f.name, f.required ? { required: `${f.label} is required` } : {})}
                >
                  <option value="">--Select--</option>
                  {departments.map((d) => (
                    <option key={d.Id} value={d.Id}>
                      {d.Name}
                    </option>
                  ))}
                </select>
                {errors[f.name] && <div className="form-error">{errors[f.name].message}</div>}
              </div>
            );
          }
          if (f.type === 'textarea') {
            return (
              <div className="form-group" key={f.name}>
                <label>
                  {f.label} {f.required && <span className="required">*</span>}
                </label>
                <textarea
                  className="form-control"
                  rows={5}
                  {...register(f.name, f.required ? { required: `${f.label} is required` } : {})}
                />
                {errors[f.name] && <div className="form-error">{errors[f.name].message}</div>}
              </div>
            );
          }
          if (f.type === 'checkbox') {
            return (
              <div className="form-group checkbox-row" key={f.name}>
                <input type="checkbox" id={f.name} {...register(f.name)} />
                <label htmlFor={f.name} style={{ margin: 0 }}>
                  {f.label}
                </label>
              </div>
            );
          }
          return (
            <div className="form-group" key={f.name}>
              <label>
                {f.label} {f.required && <span className="required">*</span>}
              </label>
              <input
                type={f.type || 'text'}
                className="form-control"
                {...register(f.name, f.required ? { required: `${f.label} is required` } : {})}
              />
              {errors[f.name] && <div className="form-error">{errors[f.name].message}</div>}
            </div>
          );
        })}

        {config.fileField && (
          <FileInput
            label={config.fileLabel || 'File'}
            required={config.fileRequiredOnCreate && !isEdit}
            accept={config.fileAccept}
            value={file}
            onChange={setFile}
            existingPath={existing?.[config.filePathKey || 'FilePath'] || existing?.[config.imagePathKey]}
            existingName={existing?.[config.fileNameKey || 'FileName'] || existing?.[config.imageNameKey]}
          />
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to={config.basePath} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export function imageColumn(pathKey = 'ImagePath') {
  return (row) =>
    row[pathKey] ? <img src={fileUrl(row[pathKey])} alt="" className="thumb" /> : '—';
}

export function boolColumn(key) {
  return (row) => <StatusBadge active={row[key]} />;
}

export function linkColumn(pathKey = 'FilePath', nameKey = 'FileName') {
  return (row) =>
    row[pathKey] ? (
      <a href={fileUrl(row[pathKey])} target="_blank" rel="noreferrer">
        {row[nameKey] || 'Download'}
      </a>
    ) : (
      '—'
    );
}
