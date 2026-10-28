import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import FileInput from '../../components/forms/FileInput';
import useDepartments from '../../hooks/useDepartments';
import { banners } from '../../services/contentService';
import { getErrorMessage } from '../../utils/errors';

export default function BannerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { departments } = useDepartments();
  const [file, setFile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      departmentId: '',
      title: '',
      caption: '',
      priority: 0,
      isActive: false,
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    banners
      .get(id)
      .then((res) => {
        const data = res.data;
        setExisting(data);
        reset({
          departmentId: data.DepartmentId || '',
          title: data.Title || '',
          caption: data.Caption || '',
          priority: data.Priority ?? 0,
          isActive: Boolean(data.IsActive),
        });
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, 'Failed to load banner'));
        navigate('/admin/banners');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, reset]);

  async function onSubmit(values) {
    if (!isEdit && !file && !existing?.ImagePath) {
      toast.error('Image is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values, file };
      if (isEdit) {
        await banners.update(id, payload);
        toast.success('Banner updated');
      } else {
        await banners.create(payload);
        toast.success('Banner created');
      }
      navigate('/admin/banners');
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
        title={isEdit ? 'Edit Banner' : 'Add Banner'}
        crumbs={[
          { label: 'Home', to: '/admin' },
          { label: 'Banner', to: '/admin/banners' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 720 }}>
        <div className="form-group">
          <label>Department Name <span className="required">*</span></label>
          <select className="form-control" {...register('departmentId', { required: 'Department is required' })}>
            <option value="">--Select--</option>
            {departments.map((d) => (
              <option key={d.Id} value={d.Id}>{d.Name}</option>
            ))}
          </select>
          {errors.departmentId && <div className="form-error">{errors.departmentId.message}</div>}
        </div>

        <div className="form-group">
          <label>Title <span className="required">*</span></label>
          <input className="form-control" {...register('title', { required: 'Title is required' })} />
          {errors.title && <div className="form-error">{errors.title.message}</div>}
        </div>

        <div className="form-group">
          <label>Caption <span className="required">*</span></label>
          <input className="form-control" {...register('caption', { required: 'Caption is required' })} />
          {errors.caption && <div className="form-error">{errors.caption.message}</div>}
        </div>

        <FileInput
          label="Image"
          required={!isEdit}
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          value={file}
          onChange={setFile}
          existingPath={existing?.ImagePath}
          existingName={existing?.ImageName}
        />

        <div className="form-group">
          <label>Priority <span className="required">*</span></label>
          <input type="number" className="form-control" {...register('priority', { required: true })} />
        </div>

        <div className="form-group checkbox-row">
          <input type="checkbox" id="isActive" {...register('isActive')} />
          <label htmlFor="isActive" style={{ margin: 0 }}>IsActive</label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to="/admin/banners" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
