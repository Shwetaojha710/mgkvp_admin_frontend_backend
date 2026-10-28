import { Link } from 'react-router-dom';

export default function PageHeader({ title, crumbs = [], actions = null }) {
  return (
    <div className="page-header">
      <div>
        <h4 className="page-title">{title}</h4>
        {crumbs.length > 0 && (
          <ul className="breadcrumb">
            {crumbs.map((c, idx) => (
              <li key={`${c.label}-${idx}`}>
                {idx > 0 && <span style={{ margin: '0 6px' }}>/</span>}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {actions}
    </div>
  );
}
