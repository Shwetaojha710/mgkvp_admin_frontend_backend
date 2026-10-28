import {
  MdDashboard,
  MdSchool,
  MdNewspaper,
  MdPeople,
  MdCollections,
  MdPhotoLibrary,
  MdVerifiedUser,
  MdPowerSettingsNew,
} from 'react-icons/md';

/**
 * Faculty portal sidebar — separate from Admin / Webmaster menus.
 * Matches Faculty_Dean sidebarnav HTML.
 */
export const facultyMenuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: MdDashboard,
    to: '/admin',
  },
  {
    key: 'dean',
    label: 'DEAN',
    icon: MdSchool,
    to: '/admin/m/dean-director',
  },
  {
    key: 'ex-dean',
    label: 'EX-DEAN',
    icon: MdSchool,
    to: '/admin/m/ex-dean',
  },
  {
    key: 'dean-noticeboard',
    label: 'DEAN NOTICEBOARD',
    icon: MdNewspaper,
    to: '/admin/m/faculty-noticeboard',
  },
  {
    key: 'dean-assistant',
    label: 'DEAN ASSISTANT DEAN',
    icon: MdPeople,
    to: '/admin/m/dean-assistant',
  },
  {
    key: 'nonteaching',
    label: 'NONTEACHING MEMBER',
    icon: MdPeople,
    to: '/admin/m/non-teaching',
  },
  {
    key: 'albums',
    label: 'ALBUMS',
    icon: MdCollections,
    to: '/admin/m/faculty-album',
  },
  {
    key: 'galleries',
    label: 'GALLERIES',
    icon: MdPhotoLibrary,
    to: '/admin/m/faculty-gallery',
  },
  {
    key: 'character-certificate',
    label: 'CHARACTER CERTIFICATE',
    icon: MdVerifiedUser,
    to: '/admin/m/character-certificate',
  },
  {
    key: 'logout',
    label: 'LOGOUT',
    icon: MdPowerSettingsNew,
    action: 'logout',
  },
];
