import { fileUrl } from '../../services/api';

export default function FileInput({
  label,
  required = false,
  accept = 'image/*,.pdf,.docx,.doc',
  value,
  onChange,
  existingPath,
  existingName,
  error,
}) {
  return (
    <div className="form-group">
      <label>
        {label} {required && <span className="required">*</span>}
      </label>
      <input
        type="file"
        className="form-control"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {value && <div style={{ marginTop: 6, fontSize: 12 }}>Selected: {value.name}</div>}
      {!value && existingPath && (
        <div style={{ marginTop: 8 }}>
          {/\.(jpg|jpeg|png|webp)$/i.test(existingPath) ? (
            <img src={fileUrl(existingPath)} alt={existingName || 'preview'} className="thumb" />
          ) : (
            <a href={fileUrl(existingPath)} target="_blank" rel="noreferrer">
              {existingName || 'Current file'}
            </a>
          )}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
