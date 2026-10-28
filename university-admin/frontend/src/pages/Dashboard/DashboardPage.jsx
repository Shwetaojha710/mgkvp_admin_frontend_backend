import { Link } from 'react-router-dom';
import {
  MdCollections,
  MdDescription,
  MdEvent,
  MdGroups,
  MdImage,
  MdNotifications,
  MdPhotoLibrary,
} from 'react-icons/md';

const shortcuts = [
  { to: '/admin/banners', label: 'Banners', icon: MdImage, color: '#0288d1' },
  { to: '/admin/notices', label: 'Notices', icon: MdNotifications, color: '#7b1fa2' },
  { to: '/admin/news-events', label: 'News & Events', icon: MdEvent, color: '#ef6c00' },
  { to: '/admin/albums', label: 'Albums', icon: MdCollections, color: '#00897b' },
  { to: '/admin/gallery-images', label: 'Gallery', icon: MdPhotoLibrary, color: '#00695c' },
  { to: '/admin/documents', label: 'Documents', icon: MdDescription, color: '#3949ab' },
  { to: '/admin/faculty', label: 'Faculty', icon: MdGroups, color: '#c62828' },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="card" style={{ textAlign: 'center', padding: '36px 24px 28px', marginBottom: 18 }}>
        <div style={{ letterSpacing: '2.5px', color: '#90a4ae', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          WELCOME TO
        </div>
        <h2 style={{ margin: '0 0 10px', color: '#01253b', fontWeight: 700, fontSize: 28 }}>
          MAHATMA GANDHI KASHI VIDYAPITH
        </h2>
        <p style={{ margin: '0 auto 22px', color: '#78909c', maxWidth: 560, fontSize: 13.5 }}>
          University administration panel — manage website content, notices, galleries, and more.
        </p>
        <img
          src="https://mgkvp.ac.in/assets/images/welcome-admin.jpg"
          alt="Welcome"
          style={{ maxWidth: 480, width: '100%', height: 'auto', borderRadius: 12, boxShadow: '0 10px 28px rgba(1,37,59,0.12)' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
        }}
      >
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="card"
              style={{
                textDecoration: 'none',
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: `${item.color}18`,
                  color: item.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                <Icon />
              </span>
              <strong style={{ color: '#263238', fontSize: 14 }}>{item.label}</strong>
              <span style={{ color: '#90a4ae', fontSize: 12 }}>Manage →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
