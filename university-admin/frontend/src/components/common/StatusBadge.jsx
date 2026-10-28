export default function StatusBadge({ active }) {
  return <span className={`status-pill ${active ? 'on' : 'off'}`}>{active ? 'True' : 'False'}</span>;
}
