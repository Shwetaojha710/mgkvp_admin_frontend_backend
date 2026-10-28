import { Link } from 'react-router-dom';
import { MdInbox } from 'react-icons/md';

export default function EmptyState({
  title = 'No records found',
  message = 'Get started by adding your first record.',
  actionTo,
  actionLabel = 'Add New',
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <MdInbox />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionTo && (
        <Link to={actionTo} className="btn btn-success">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
