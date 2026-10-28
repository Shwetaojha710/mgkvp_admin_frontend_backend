import {
  MdDashboard,
  MdHome,
  MdSchool,
  MdAccountCircle,
  MdMenuBook,
  MdPeople,
  MdGroups,
  MdCheckBoxOutlineBlank,
  MdContacts,
  MdNotifications,
  MdPowerSettingsNew,
} from 'react-icons/md';

/**
 * Full nested sidebar matching https://mgkvp.ac.in/Admin sidebarnav HTML.
 * Leaf items use clone routes (/admin/...); groups use children only.
 */
export const menuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: MdDashboard,
    to: '/admin',
  },
  {
    key: 'home',
    label: 'HOME',
    icon: MdHome,
    children: [
      { label: 'BANNER', to: '/admin/banners' },
      { label: 'NOBLE ALUMNI', to: '/admin/m/noble-alumni' },
      { label: 'NEWS EVENT', to: '/admin/news-events' },
      { label: 'ALBUM', to: '/admin/albums' },
      { label: 'GALLERY', to: '/admin/gallery-images' },
      { label: 'BUTTION', to: '/admin/m/button' },
      { label: 'HIGHLIGHTS', to: '/admin/m/highlights' },
      { label: 'E-NEWSPAPER', to: '/admin/m/e-newspaper' },
      { label: 'STUDENT ZONE', to: '/admin/m/home-student-zone' },
      { label: 'MARQUEE MESSAGE', to: '/admin/m/marquee' },
      { label: 'POPUP', to: '/admin/m/popup' },
      { label: 'USEFUL LINKS', to: '/admin/m/useful-links' },
    ],
  },
  {
    key: 'university',
    label: 'THE UNIVERSITY',
    icon: MdSchool,
    children: [
      { label: 'UNIVERSITY NOTICE BOARD', to: '/admin/notices' },
      {
        key: 'university-inner',
        label: 'THE UNIVERSITY',
        children: [
          { label: 'ABOUT US', to: '/admin/m/about-us' },
          { label: 'FOUNDER', to: '/admin/m/founder' },
          { label: 'HERITAGE', to: '/admin/m/heritage' },
          { label: 'VISION', to: '/admin/m/vision' },
          { label: 'MISSION', to: '/admin/m/mission' },
          { label: 'OBJECTIVE', to: '/admin/m/objective' },
          { label: 'GOAL', to: '/admin/m/goal' },
          { label: 'UNIVERSITY DOCUMENT', to: '/admin/m/university-document' },
          { label: 'UNIVERSITY KULGEET', to: '/admin/m/kulgeet' },
          { label: 'SEAL/LOGO', to: '/admin/m/seal-logo' },
          { label: 'LANDMARKS', to: '/admin/m/landmarks' },
          { label: 'HOW TO REACH', to: '/admin/m/how-to-reach' },
          { label: 'CAMPUS VIRTUAL TOUR', to: '/admin/m/campus-tour' },
          { label: 'RECOGNITION', to: '/admin/m/recognition' },
          { label: 'TEACHING/NON-TEACHING DETAILS', to: '/admin/m/teaching-details' },
        ],
      },
      {
        key: 'other-campuses',
        label: 'OTHER CAMPUSES',
        children: [
          { label: 'GANGAPUR CAMPUS', to: '/admin/m/gangapur-campus' },
          { label: 'NTPC CAMPUS', to: '/admin/m/ntpc-campus' },
        ],
      },
      {
        key: 'rules-regulations',
        label: 'RULES/REGULATIONS',
        children: [
          { label: 'ACTS', to: '/admin/m/acts' },
          { label: 'ORDINANCE', to: '/admin/m/ordinance' },
          { label: 'STATUE', to: '/admin/m/statue' },
          { label: 'POLICY', to: '/admin/m/policy' },
        ],
      },
      { label: 'MINUTES OF MEETING', to: '/admin/m/minutes-meeting' },
      { label: 'ACADEMIC CALENDAR', to: '/admin/m/academic-calendar' },
      { label: 'HOLIDAY LIST', to: '/admin/m/holiday-list' },
      { label: 'CENTENARY YEAR', to: '/admin/m/centenary-year' },
      { label: 'NOTICEBOARD/ANNOUNCEMENT', to: '/admin/m/noticeboard-announcement' },
      { label: 'UNIVERSITY REPORTS', to: '/admin/m/university-reports' },
      { label: 'IND', to: '/admin/m/ind' },
      { label: 'BEP', to: '/admin/m/bep' },
    ],
  },
  {
    key: 'administration',
    label: 'ADMINISTRATION',
    icon: MdAccountCircle,
    children: [
      {
        key: 'admin-body',
        label: 'ADMINISTRATION BODY',
        children: [
          { label: 'USER MASTER', to: '/admin/m/user-master' },
          { label: 'ADMIN OFFICER', to: '/admin/m/admin-officer' },
          { label: 'DEAN/HEAD/DIRECTOR', to: '/admin/m/dean-head-director' },
          { label: 'CHIEF/COORDINATOR', to: '/admin/m/chief-coordinator' },
          { label: 'VICE CHANCELLOR LIST', to: '/admin/m/vice-chancellor' },
        ],
      },
      {
        key: 'statutory-body',
        label: 'STATUTORY BODY',
        children: [
          {
            key: 'executive-council',
            label: 'EXECUTIVE COUNCIL',
            children: [
              { label: 'LIST OF MEMBERS', to: '/admin/m/ec-members' },
              { label: 'MEETING', to: '/admin/m/ec-meeting' },
              { label: 'INFORMATION / AGENDA', to: '/admin/m/ec-agenda' },
            ],
          },
          {
            key: 'academic-council',
            label: 'ACADEMIC COUNCIL',
            children: [
              { label: 'LIST OF MEMBERS', to: '/admin/m/ac-members' },
              { label: 'MEETING', to: '/admin/m/ac-meeting' },
              { label: 'INFORMATION/AGENDA', to: '/admin/m/ac-agenda' },
            ],
          },
          {
            key: 'finance-committee',
            label: 'FINANCE COMMITTEE',
            children: [
              { label: 'LIST OF MEMBERS', to: '/admin/m/fc-members' },
              { label: 'MEETING', to: '/admin/m/fc-meeting' },
              { label: 'INFORMATION/AGENDA', to: '/admin/m/fc-agenda' },
            ],
          },
          {
            key: 'entrance-committee',
            label: 'ENTRANCE COMMITTEE',
            children: [
              { label: 'LIST OF MEMBERS', to: '/admin/m/entrance-members' },
              { label: 'MEETING', to: '/admin/m/entrance-meeting' },
              { label: 'INFORMATION/AGENDA', to: '/admin/m/entrance-agenda' },
            ],
          },
          {
            key: 'exam-committee',
            label: 'EXAM COMMITTEE',
            children: [
              { label: 'LIST OF MEMBERS', to: '/admin/m/exam-members' },
              { label: 'MEETING', to: '/admin/m/exam-meeting' },
              { label: 'INFORMATION/AGENDA', to: '/admin/m/exam-agenda' },
            ],
          },
        ],
      },
      {
        key: 'staff',
        label: 'STAFF',
        children: [
          {
            key: 'teaching-staff',
            label: 'TEACHING',
            children: [
              { label: 'NOTIFICATION FOR ELECTION & VOTE LIST', to: '/admin/m/election-notification' },
              { label: 'TEACHERS ASSOCIATION', to: '/admin/m/teachers-association' },
            ],
          },
          { label: 'NON-TEACHING', to: '/admin/m/non-teaching' },
        ],
      },
      {
        key: 'proctorial-board-group',
        label: 'PROCTORIAL BOARD',
        children: [
          { label: 'PROCTORIAL BOARD', to: '/admin/m/proctorial-board' },
          { label: 'PROCTORIAL BOARD NOTIFICATION', to: '/admin/m/proctorial-notification' },
        ],
      },
      { label: 'UNIVERSITY COURT', to: '/admin/m/university-court' },
    ],
  },
  {
    key: 'academics',
    label: 'ACADEMICS',
    icon: MdMenuBook,
    children: [
      {
        key: 'academics-inner',
        label: 'ACADEMICS',
        children: [
          { label: 'COURSES', to: '/admin/m/courses' },
          { label: 'FEE STRUCTURE', to: '/admin/m/fee-structure' },
          {
            key: 'phd-research',
            label: 'PH.D./RESEARCH',
            children: [
              { label: 'RESEARCH CATEGORY', to: '/admin/m/research-category' },
              { label: 'RESEARCH', to: '/admin/m/research' },
              { label: 'RESEARCH NOTIFICATION', to: '/admin/m/research-notification' },
              { label: 'PHD AWARDED LIST', to: '/admin/m/phd-awarded' },
            ],
          },
          { label: 'JOURNALS', to: '/admin/m/journals' },
          { label: 'SEMINAR/WORKSHOP', to: '/admin/m/seminar-workshop' },
          { label: 'PUBLISHED BOOKS', to: '/admin/m/published-books' },
          { label: 'CONVOCATION', to: '/admin/m/convocation' },
          { label: 'EXTRA CURRICULAR/CENTRIC ACTIVITIES', to: '/admin/m/extra-curricular' },
        ],
      },
      { label: 'FACULTIES', to: '/admin/faculty' },
      { label: 'INSTITUTES', to: '/admin/m/institutes' },
      {
        key: 'alumni',
        label: 'ALUMNI',
        children: [
          { label: 'ALUMNI ASSOCIATION', to: '/admin/m/alumni-association' },
          { label: 'ALUMNI CONTACT', to: '/admin/m/alumni-contact' },
          { label: 'ALUMNI NOTIFICATIONS', to: '/admin/m/alumni-notifications' },
        ],
      },
      { label: 'RECRUITMENTS', to: '/admin/m/recruitments' },
      { label: 'TENDERS', to: '/admin/m/tenders' },
      {
        key: 'academic-event',
        label: 'ACADEMIC EVENT',
        children: [
          { label: 'ACADEMIC EVENT ALBUM', to: '/admin/m/academic-event-album' },
          { label: 'EVENT GALLERY', to: '/admin/m/event-gallery' },
          { label: 'MAJOR EVENT', to: '/admin/m/major-event' },
        ],
      },
      { label: 'E-RESOURCES', to: '/admin/m/e-resources' },
    ],
  },
  {
    key: 'student',
    label: 'STUDENT',
    icon: MdPeople,
    children: [
      {
        key: 'admission',
        label: 'ADMISSION',
        children: [
          { label: 'ADMISSION CATEGORY', to: '/admin/m/admission-category' },
          { label: 'ADMISSION DETAILS', to: '/admin/m/admission-details' },
          { label: 'NOTIFICATION', to: '/admin/m/admission-notification' },
        ],
      },
      {
        key: 'examination',
        label: 'EXAMINATION',
        children: [
          { label: 'EXAMINATION CATEGORY', to: '/admin/m/exam-category' },
          { label: 'EXAMINATION DETAILS', to: '/admin/m/exam-details' },
          { label: 'NOTIFICATION', to: '/admin/m/exam-notification' },
        ],
      },
      { label: 'TIME TABLE', to: '/admin/m/time-table' },
      { label: 'SYLLABUS NEW', to: '/admin/m/syllabus-new' },
      { label: 'SYLLABUS', to: '/admin/m/syllabus' },
      { label: 'RESULTS', to: '/admin/m/results' },
      { label: 'AEDP', to: '/admin/m/aedp' },
      { label: 'E-LECTURES', to: '/admin/m/e-lectures' },
      {
        key: 'rti',
        label: 'RTI',
        children: [
          { label: 'RTI CATEGORY', to: '/admin/m/rti-category' },
          { label: 'RTI DETAILS', to: '/admin/m/rti-details' },
          { label: 'RTI NOTIFICATION', to: '/admin/m/rti-notification' },
        ],
      },
      {
        key: 'anti-ragging',
        label: 'ANTI RAGGING/ANTI RAGGING/SQAUAD CELL',
        children: [
          { label: 'ANTI-RAGGING CATEGORY', to: '/admin/m/anti-ragging-category' },
          { label: 'ANTI-RAGGING DETAILS', to: '/admin/m/anti-ragging-details' },
        ],
      },
      {
        key: 'hostels-mess',
        label: 'HOSTELS/MESS',
        children: [
          { label: 'HOSTELS NOTIFICATION', to: '/admin/m/hostels-notification' },
          { label: 'ADD WARDEN', to: '/admin/m/add-warden' },
        ],
      },
      {
        key: 'student-union-election',
        label: 'STUDENT UNION ELECTION',
        children: [
          { label: 'SUE YEAR', to: '/admin/m/sue-year' },
          { label: 'SUE NOTIFICATION', to: '/admin/m/sue-notification' },
          { label: 'SUE OFFICER', to: '/admin/m/sue-officer' },
          { label: 'SU ASSOCATION', to: '/admin/m/su-association' },
        ],
      },
      {
        key: 'scholarship-fellowship',
        label: 'SCHOLARSHIP & FELLOWSHIP',
        children: [
          { label: 'NOTIFICATION', to: '/admin/m/scholarship-notification' },
          { label: 'CATEGORY', to: '/admin/m/scholarship-category' },
          { label: 'DETAILS', to: '/admin/m/scholarship-details' },
        ],
      },
      {
        key: 'nep',
        label: 'NATIONAL EDUCATION POLICY',
        children: [
          { label: 'BUTTON LINK CATEGORY', to: '/admin/m/nep-button-category' },
          { label: 'MANAGE LINK BUTTONS', to: '/admin/m/nep-link-buttons' },
          { label: 'NOTIFICATION', to: '/admin/m/nep-notification' },
        ],
      },
    ],
  },
  {
    key: 'affiliation',
    label: 'AFFILIATION',
    icon: MdGroups,
    children: [
      { label: 'AFFILIATED COLLEGES', to: '/admin/m/affiliated-colleges' },
      { label: 'CIRCULARS/ANNOUNCEMENTS', to: '/admin/m/affiliation-circulars' },
      {
        key: 'affiliation-inner',
        label: 'AFFILIATION',
        children: [
          { label: 'AFFILIATION LIST', to: '/admin/m/affiliation-list' },
          { label: 'AFFILIATION CATEGORY', to: '/admin/m/affiliation-category' },
        ],
      },
    ],
  },
  {
    key: 'facilities',
    label: 'FACILITIES',
    icon: MdCheckBoxOutlineBlank,
    children: [
      {
        key: 'facilities-inner',
        label: 'FACILITIES',
        children: [
          { label: 'MOC COURT', to: '/admin/m/moc-court' },
          { label: 'INCUBATION CENTER', to: '/admin/m/incubation-center' },
          { label: 'UEIGB-MGKVP', to: '/admin/m/ueigb' },
          { label: 'NATIONAL SERVICE SCHEME', to: '/admin/m/nss' },
          { label: 'NATIONAL CADET CORPS', to: '/admin/m/ncc' },
          { label: 'UNIVERSITY SPORT COUNCIL', to: '/admin/m/sport-council' },
          { label: 'CENTRAL LIBRARY', to: '/admin/m/central-library' },
          { label: 'COMPUTER CENTRE', to: '/admin/m/computer-centre' },
          { label: 'REMEDIAL COACHING', to: '/admin/m/remedial-coaching' },
          { label: 'WOMEN STUDY CENTER', to: '/admin/m/women-study-center' },
        ],
      },
      { label: 'PHOTO GALLERY', to: '/admin/albums' },
      {
        key: 'university-cell',
        label: 'UNIVERSITY CELL',
        children: [
          { label: 'MEMBERS', to: '/admin/m/ugc-members' },
          { label: 'NOTIFICATION', to: '/admin/m/ugc-notification' },
        ],
      },
    ],
  },
  {
    key: 'contacts',
    label: 'CONTACTS',
    icon: MdContacts,
    to: '/admin/m/contacts',
  },
  {
    key: 'footer',
    label: 'FOOTER',
    icon: MdHome,
    children: [
      {
        key: 'footer-student-zone',
        label: 'STUDENT ZONE',
        children: [
          { label: 'MORE', to: '/admin/m/footer-student-more' },
          { label: 'NCTE RECOGNITION LETTERS', to: '/admin/m/ncte-letters' },
        ],
      },
      {
        key: 'footer-university-zone',
        label: 'UNIVERSITY ZONE',
        children: [{ label: 'MORE', to: '/admin/m/footer-university-more' }],
      },
      {
        key: 'footer-facilities-zone',
        label: 'FACILITIES ZONE',
        children: [
          { label: 'YOUTH FESTIVAL', to: '/admin/m/youth-festival' },
          { label: 'UNIVERSITY VARIOUS FORMS', to: '/admin/m/university-forms' },
          { label: 'MORE', to: '/admin/m/footer-facilities-more' },
        ],
      },
    ],
  },
  {
    key: 'menu',
    label: 'MENU',
    icon: MdNotifications,
    children: [
      { label: 'MENU LIST', to: '/admin/m/menu-list' },
      { label: 'MENU PERMISSION', to: '/admin/m/menu-permission' },
    ],
  },
  {
    key: 'logout',
    label: 'LOGOUT',
    icon: MdPowerSettingsNew,
    action: 'logout',
  },
];

function pathMatches(to, pathname) {
  if (!to) return false;
  if (pathname === to) return true;
  if (to === '/admin') return false;
  return pathname.startsWith(`${to}/`);
}

export function nodeContainsPath(node, pathname) {
  if (node.to && pathMatches(node.to, pathname)) return true;
  if (!node.children) return false;
  return node.children.some((child) => nodeContainsPath(child, pathname));
}

/** Top-level section key that contains the current route (first match). */
export function findActiveParentKey(pathname, items = menuItems) {
  for (const item of items) {
    if (item.action === 'logout') continue;
    if (item.to && pathMatches(item.to, pathname)) return item.key;
    if (item.children && nodeContainsPath(item, pathname)) return item.key;
  }
  return null;
}

/** Keys for all ancestor groups that should be expanded for pathname. */
export function collectOpenMenuKeys(pathname, items = menuItems) {
  const keys = {};
  const top = findActiveParentKey(pathname, items);
  if (top) keys[top] = true;

  function walk(nodes) {
    for (const node of nodes) {
      if (!node.children) continue;
      const key = node.key;
      if (!key) continue;
      if (nodeContainsPath(node, pathname)) {
        keys[key] = true;
        walk(node.children);
      }
    }
  }

  for (const item of items) {
    if (item.children) walk(item.children);
  }
  return keys;
}

/** Longest matching leaf `to` for active highlighting. */
export function findBestMatchingLeafTo(pathname, items = menuItems) {
  let best = null;
  function walk(nodes) {
    for (const node of nodes) {
      if (node.to && pathMatches(node.to, pathname)) {
        if (!best || node.to.length > best.length) best = node.to;
      }
      if (node.children) walk(node.children);
    }
  }
  walk(items);
  return best;
}

export function isLeafActive(to, pathname, items = menuItems) {
  if (!to) return false;
  return findBestMatchingLeafTo(pathname, items) === to;
}

/** @deprecated use isLeafActive — kept for older imports */
export function isCanonicalChildActive(_parentKey, childTo, pathname) {
  return isLeafActive(childTo, pathname);
}

export function getModuleTitleFromItems(moduleKey, items) {
  const target = `/admin/m/${moduleKey}`;
  let found = null;
  function walk(nodes) {
    for (const node of nodes) {
      if (node.to === target) {
        found = node.label;
        return true;
      }
      if (node.children && walk(node.children)) return true;
    }
    return false;
  }
  walk(items);
  return found;
}

export function getModuleTitle(moduleKey, role) {
  // Lazy import avoided — caller may pass role; also search admin menu by default.
  const fromAdmin = getModuleTitleFromItems(moduleKey, menuItems);
  if (fromAdmin) return fromAdmin;
  if (role === 'webmaster') {
    // webmaster titles resolved in AdminLayout / Cms via getMenuItemsForRole
  }
  return moduleKey
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
