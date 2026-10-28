export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 4);
  const end = Math.min(totalPages, start + 9);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <ul className="pagination">
      <li>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
      </li>
      {pages.map((p) => (
        <li key={p}>
          <button type="button" className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
            {p}
          </button>
        </li>
      ))}
      <li>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </li>
      <li>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(totalPages)}>
          Last
        </button>
      </li>
    </ul>
  );
}
