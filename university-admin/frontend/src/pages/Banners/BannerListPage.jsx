import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdDelete, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';
import { MdAdd } from 'react-icons/md';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import useDepartments from '../../hooks/useDepartments';
import { banners } from '../../services/contentService';
import { fileUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';

export default function BannerListPage() {
  const { departments } = useDepartments();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await banners.list({
        page,
        limit: 10,
        departmentId: departmentId || undefined,
        search: search || undefined,
        isActive: isActive === '' ? undefined : isActive,
      });
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load banners'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, departmentId, isActive]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await banners.remove(deleteId);
      toast.success('Banner deleted');
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
        title="List of Banner"
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: 'Banner' },
        ]}
        actions={
          <Link to="/admin/banners/new" className="btn btn-success">
            <MdAdd /> Add New
          </Link>
        }
      />

      <div className="filters-row">
        <div className="form-group">
          <label>Department Name</label>
          <select className="form-control" value={departmentId} onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.Id} value={d.Id}>{d.Name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="form-control" value={isActive} onChange={(e) => { setPage(1); setIsActive(e.target.value); }}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Search</label>
          <div className="search-actions">
            <input
              className="form-control"
              placeholder="Search title / caption"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
            />
            <button type="button" className="btn btn-primary" onClick={() => { setPage(1); load(); }}>
              Search
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading banners…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No banners found"
          message="Upload your first homepage banner to get started."
          actionTo="/admin/banners/new"
          actionLabel="Add Banner"
        />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Department</th>
                <th>Title</th>
                <th>Caption</th>
                <th>Image</th>
                <th>IsActive</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.Id}>
                  <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                  <td>{row.DepartmentName || '—'}</td>
                  <td>{row.Title}</td>
                  <td>{row.Caption || ''}</td>
                  <td>
                    {row.ImagePath ? (
                      <img src={fileUrl(row.ImagePath)} alt="" className="thumb" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td><StatusBadge active={row.IsActive} /></td>
                  <td>{row.Priority}</td>
                  <td>
                    <div className="action-icons">
                      <Link to={`/admin/banners/${row.Id}/edit`} title="Edit"><MdEdit /></Link>
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
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
