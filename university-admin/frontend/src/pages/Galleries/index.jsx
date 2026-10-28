import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { galleries } from '../../services/contentService';
import { fileUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';

/** Reference: AdminHome/AlbumList */
export function AlbumListPage() {
  const { departments } = useDepartments();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await galleries.list({
        page,
        limit: 10,
        departmentId: departmentId || undefined,
        search: search || undefined,
      });
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, departmentId]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await galleries.remove(deleteId);
      toast.success('Album deleted');
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
        title="List of Album"
        crumbs={[{ label: 'Home', to: '/admin' }, { label: 'Album' }]}
        actions={
          <Link to="/admin/albums/new" className="btn btn-success">
            <MdAdd /> Add New
          </Link>
        }
      />

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
              placeholder="Search album name…"
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
        <div className="loading-state">Loading albums…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No albums found"
          message="Create an album to add gallery photos."
          actionTo="/admin/albums/new"
          actionLabel="Add Album"
        />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Type</th>
                <th>Department Name</th>
                <th>Name</th>
                <th>Image</th>
                <th>IsNew</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  <td>{row.Description || 'P'}</td>
                  <td>{row.DepartmentName || '—'}</td>
                  <td>{row.Title}</td>
                  <td>
                    {row.CoverImagePath ? (
                      <img src={fileUrl(row.CoverImagePath)} alt="" className="thumb" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <StatusBadge active={row.IsPublished} />
                  </td>
                  <td>
                    <div className="action-icons" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <Link to={`/admin/albums/${row.Id}/edit`} title="Edit">
                        <MdEdit />
                      </Link>
                      <button type="button" className="delete" title="Delete" onClick={() => setDeleteId(row.Id)}>
                        <MdDelete />
                      </button>
                      <Link
                        to={`/admin/gallery-images?albumId=${row.Id}`}
                        style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        View Gallery
                      </Link>
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
        title="Delete Album"
        message="Delete this album and all its gallery images?"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

export function AlbumFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
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
      description: 'P',
      isPublished: true,
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    galleries
      .get(id)
      .then((res) => {
        const data = res.data;
        setExisting(data);
        reset({
          departmentId: data.DepartmentId || '',
          title: data.Title || '',
          description: data.Description || 'P',
          isPublished: Boolean(data.IsPublished),
        });
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate('/admin/albums');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, reset]);

  async function onSubmit(values) {
    setSaving(true);
    try {
      const payload = { ...values, file };
      if (isEdit) {
        await galleries.update(id, payload);
        toast.success('Album updated');
      } else {
        await galleries.create(payload);
        toast.success('Album created');
      }
      navigate('/admin/albums');
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
        title={`${isEdit ? 'Edit' : 'Add'} Album`}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: 'Album', to: '/admin/albums' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 720 }}>
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
        <div className="form-group">
          <label>
            Name <span className="required">*</span>
          </label>
          <input className="form-control" {...register('title', { required: true })} />
        </div>
        <div className="form-group">
          <label>Type</label>
          <input className="form-control" placeholder="P" {...register('description')} />
        </div>
        <FileInput
          label="Image"
          accept="image/*"
          value={file}
          onChange={setFile}
          existingPath={existing?.CoverImagePath}
          existingName={existing?.CoverImageName}
        />
        <div className="form-group checkbox-row">
          <input type="checkbox" id="isPublished" {...register('isPublished')} />
          <label htmlFor="isPublished" style={{ margin: 0 }}>
            IsNew / Active
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to="/admin/albums" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

/** Reference: AdminHome/GalleryList */
export function GalleryImagesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const albumIdFromUrl = searchParams.get('albumId') || '';
  const [albums, setAlbums] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [albumId, setAlbumId] = useState(albumIdFromUrl);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    galleries
      .list({ page: 1, limit: 500 })
      .then((res) => setAlbums(res.data.items || []))
      .catch(() => setAlbums([]));
  }, []);

  useEffect(() => {
    setAlbumId(albumIdFromUrl);
    setPage(1);
  }, [albumIdFromUrl]);

  async function load() {
    setLoading(true);
    try {
      const res = await galleries.listImages({
        page,
        limit: 10,
        albumId: albumId || undefined,
        search: search || undefined,
      });
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, albumId]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await galleries.removeImage(deleteId);
      toast.success('Gallery image deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const selectedAlbum = albums.find((a) => String(a.Id) === String(albumId));

  return (
    <div className="card">
      <PageHeader
        title="List of Gallery"
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: 'Album', to: '/admin/albums' },
          { label: 'Gallery' },
        ]}
        actions={
          <Link
            to={albumId ? `/admin/gallery-images/new?albumId=${albumId}` : '/admin/gallery-images/new'}
            className="btn btn-success"
          >
            <MdAdd /> Add New
          </Link>
        }
      />

      <div className="filters-row">
        <div className="form-group">
          <label>Album Name</label>
          <select
            className="form-control"
            value={albumId}
            onChange={(e) => {
              const v = e.target.value;
              setAlbumId(v);
              setPage(1);
              if (v) setSearchParams({ albumId: v });
              else setSearchParams({});
            }}
          >
            <option value="">All Albums</option>
            {albums.map((a) => (
              <option key={a.Id} value={a.Id}>
                {a.Title}
              </option>
            ))}
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
              placeholder="Search title…"
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

      {selectedAlbum && (
        <p style={{ marginTop: 0, color: '#607d8b', fontSize: 13 }}>
          Showing images for album: <strong>{selectedAlbum.Title}</strong>
        </p>
      )}

      {loading ? (
        <div className="loading-state">Loading gallery…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No gallery images found"
          message="Add photos to an album."
          actionTo={albumId ? `/admin/gallery-images/new?albumId=${albumId}` : '/admin/gallery-images/new'}
          actionLabel="Add Image"
        />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Title</th>
                <th>Album Name</th>
                <th>Image</th>
                <th>IsActive</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  <td>{row.Title || '—'}</td>
                  <td>{row.AlbumName || '—'}</td>
                  <td>
                    {row.ImagePath ? (
                      <img src={fileUrl(row.ImagePath)} alt="" className="thumb" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <StatusBadge active />
                  </td>
                  <td>
                    <div className="action-icons">
                      <Link to={`/admin/gallery-images/${row.Id}/edit`} title="Edit">
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
        title="Delete Gallery Image"
        message="Are you sure you want to delete this image?"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

export function GalleryImageFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [file, setFile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      galleryId: searchParams.get('albumId') || '',
      title: '',
    },
  });

  useEffect(() => {
    galleries
      .list({ page: 1, limit: 500 })
      .then((res) => setAlbums(res.data.items || []))
      .catch(() => setAlbums([]));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    galleries
      .getImage(id)
      .then((res) => {
        const data = res.data;
        setExisting(data);
        reset({
          galleryId: data.GalleryId || data.AlbumId || '',
          title: data.Title || '',
        });
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate('/admin/gallery-images');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, reset]);

  async function onSubmit(values) {
    if (!values.galleryId) {
      toast.error('Please select an album');
      return;
    }
    if (!isEdit && !file) {
      toast.error('Image is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await galleries.updateImage(id, { ...values, file });
        toast.success('Gallery image updated');
      } else {
        await galleries.addImage(values.galleryId, { title: values.title, file });
        toast.success('Gallery image added');
      }
      navigate(`/admin/gallery-images?albumId=${values.galleryId}`);
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
        title={`${isEdit ? 'Edit' : 'Add'} Gallery`}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: 'Gallery', to: '/admin/gallery-images' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 720 }}>
        <div className="form-group">
          <label>
            Album Name <span className="required">*</span>
          </label>
          <select className="form-control" {...register('galleryId', { required: true })}>
            <option value="">--Select--</option>
            {albums.map((a) => (
              <option key={a.Id} value={a.Id}>
                {a.Title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input className="form-control" {...register('title')} />
        </div>
        <FileInput
          label="Image"
          required={!isEdit}
          accept="image/*"
          value={file}
          onChange={setFile}
          existingPath={existing?.ImagePath}
          existingName={existing?.ImageName}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to="/admin/gallery-images" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// Back-compat exports
export const GalleryListPage = GalleryImagesListPage;
export const GalleryFormPage = AlbumFormPage;
