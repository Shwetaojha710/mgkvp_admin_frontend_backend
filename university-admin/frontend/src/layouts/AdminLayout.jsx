import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MdExpandMore, MdMenu, MdSearch } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import {
  collectOpenMenuKeys,
  findActiveParentKey,
  isLeafActive,
  nodeContainsPath,
} from '../utils/menu';
import { getMenuItemsForRole } from '../utils/menuByRole';
import '../styles/layout.css';

function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mgLogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#039be5" />
          <stop offset="100%" stopColor="#01579b" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#mgLogo)" />
      <text x="32" y="38" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="Poppins, sans-serif" fontWeight="700">
        MG
      </text>
    </svg>
  );
}

function UserAvatar() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#90a4ae" />
      <circle cx="32" cy="24" r="12" fill="#eceff1" />
      <path d="M10 56c4-14 16-20 22-20s18 6 22 20" fill="#eceff1" />
    </svg>
  );
}

function MenuChildren({ nodes, depth, openMenus, toggleGroup, pathname, parentKey, menuItems }) {
  return (
    <ul className={`submenu depth-${depth}`}>
      {nodes.map((child, idx) => {
        const childKey = child.key || `${parentKey}-${child.label}-${idx}`;

        if (child.children?.length) {
          const isOpen = Boolean(openMenus[childKey]);
          const hasActive = nodeContainsPath(child, pathname);
          return (
            <li key={childKey} className={`menu-group ${isOpen ? 'open' : ''} ${hasActive ? 'has-active' : ''}`}>
              <button type="button" className="submenu-toggle" onClick={() => toggleGroup(childKey, false)}>
                <span className="submenu-label">{child.label}</span>
                <MdExpandMore className="chevron nested" />
              </button>
              {isOpen && (
                <MenuChildren
                  nodes={child.children}
                  depth={depth + 1}
                  openMenus={openMenus}
                  toggleGroup={toggleGroup}
                  pathname={pathname}
                  parentKey={childKey}
                  menuItems={menuItems}
                />
              )}
            </li>
          );
        }

        if (child.external) {
          return (
            <li key={`${childKey}-ext`}>
              <a href={child.external} target="_blank" rel="noreferrer">
                {child.label}
              </a>
            </li>
          );
        }

        return (
          <li key={`${childKey}-${child.to}`}>
            <NavLink to={child.to} className={() => (isLeafActive(child.to, pathname, menuItems) ? 'active' : '')}>
              {child.label}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const menuItems = getMenuItemsForRole(user?.role);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setOpenMenus(collectOpenMenuKeys(location.pathname, menuItems));
  }, [location.pathname, menuItems]);

  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function toggleGroup(key, isTopLevel) {
    setOpenMenus((prev) => {
      const nextOpen = !prev[key];
      if (isTopLevel) {
        return nextOpen ? { [key]: true } : {};
      }
      return { ...prev, [key]: nextOpen };
    });
  }

  return (
    <div className={`admin-shell ${expanded ? 'sidebar-expanded' : ''}`}>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <LogoMark />
          </div>
          <button
            type="button"
            className="topbar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => {
              if (window.innerWidth <= 900) {
                setMobileOpen((v) => !v);
              } else {
                setExpanded((v) => !v);
              }
            }}
          >
            <MdMenu />
          </button>
          <span className="topbar-title">Mahatma Gandhi Kashi Vidyapith</span>
          <button type="button" className="topbar-toggle" aria-label="Search">
            <MdSearch />
          </button>
        </div>
        <div className="topbar-right" ref={profileRef}>
          <button type="button" className="profile-chip" onClick={() => setProfileOpen((v) => !v)}>
            <UserAvatar />
            <span className="profile-name">{user?.fullName || 'Admin Master'}</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="user-box">
                <UserAvatar />
                <div>
                  <strong>{user?.fullName || 'Admin Master'}</strong>
                  <div style={{ fontSize: 12, color: '#90a4ae' }}>
                    {user?.username}
                    {user?.role ? ` · ${user.role}` : ''}
                  </div>
                </div>
              </div>
              <button type="button">My Profile</button>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className={`left-sidebar ${expanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <nav className="sidebar-nav-wrap">
          <ul className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              if (item.action === 'logout') {
                return (
                  <li key={item.key}>
                    <button type="button" className="menu-btn" onClick={handleLogout}>
                      <span className="icon">
                        <Icon />
                      </span>
                      <span className="label">{item.label}</span>
                    </button>
                  </li>
                );
              }

              if (item.children) {
                const activeParentKey = findActiveParentKey(location.pathname, menuItems);
                const hasActive = activeParentKey === item.key;
                const isOpen = Boolean(openMenus[item.key]);
                return (
                  <li key={item.key} className={`${isOpen ? 'open' : ''} ${hasActive ? 'has-active' : ''}`}>
                    <button type="button" className="menu-btn" onClick={() => toggleGroup(item.key, true)}>
                      <span className="icon">
                        <Icon />
                      </span>
                      <span className="label">{item.label}</span>
                      <MdExpandMore className="chevron" />
                    </button>
                    {isOpen && (
                      <MenuChildren
                        nodes={item.children}
                        depth={1}
                        openMenus={openMenus}
                        toggleGroup={toggleGroup}
                        pathname={location.pathname}
                        parentKey={item.key}
                        menuItems={menuItems}
                      />
                    )}
                  </li>
                );
              }

              if (item.external) {
                return (
                  <li key={item.key}>
                    <a
                      href={item.external}
                      target="_blank"
                      rel="noreferrer"
                      className="menu-btn"
                      style={{ textDecoration: 'none' }}
                    >
                      <span className="icon">
                        <Icon />
                      </span>
                      <span className="label">{item.label}</span>
                    </a>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    <span className="icon">
                      <Icon />
                    </span>
                    <span className="label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="page-wrapper">
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="admin-footer">
          Copyright © {new Date().getFullYear()}, <strong>Mahatma Gandhi Kashi Vidyapith</strong> | All Rights Reserved
        </footer>
      </div>
    </div>
  );
}
