import { menuItems, getModuleTitleFromItems } from './menu';
import { webmasterMenuItems } from './webmasterMenu';
import { facultyMenuItems } from './facultyMenu';
import { headMenuItems } from './headMenu';

export function getMenuItemsForRole(role) {
  if (role === 'webmaster') return webmasterMenuItems;
  if (role === 'faculty') return facultyMenuItems;
  if (role === 'head') return headMenuItems;
  return menuItems;
}

export function resolveModuleTitle(moduleKey, role) {
  const items = getMenuItemsForRole(role);
  return (
    getModuleTitleFromItems(moduleKey, items) ||
    getModuleTitleFromItems(moduleKey, menuItems) ||
    moduleKey
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}
