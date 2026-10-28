import {
  MdDashboard,
  MdBook,
  MdHome,
  MdPowerSettingsNew,
} from 'react-icons/md';

/**
 * Webmaster Admin sidebar — separate from main Admin menuItems.
 * Matches webmaster portal sidebarnav (Administrator / Faculty/Institute / Department).
 */
export const webmasterMenuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: MdDashboard,
    to: '/admin',
  },
  {
    key: 'administrator',
    label: 'Administrator',
    icon: MdBook,
    children: [
      { label: 'User Master', to: '/admin/m/user-master' },
      { label: 'Administrative Officers', to: '/admin/m/admin-officer' },
      { label: 'Ex-Vice Chancellors', to: '/admin/m/vice-chancellor' },
      { label: 'Seminar/Workshop', to: '/admin/m/seminar-workshop' },
      { label: 'Convocation', to: '/admin/m/convocation' },
      { label: 'Syllabus', to: '/admin/m/syllabus' },
      { label: 'Syllabus (2020-2021 Only)', to: '/admin/m/syllabus-2020-21' },
      { label: 'Markseet Verification', to: '/admin/m/marksheet-verification' },
      { label: 'Contacts', to: '/admin/m/contacts' },
      {
        key: 'wm-minutes',
        label: 'Minutes Of Meeting',
        children: [
          { label: 'Executive Council', to: '/admin/m/ec-meeting' },
          { label: 'Academic Council', to: '/admin/m/ac-meeting' },
          { label: 'Examination Committee', to: '/admin/m/exam-meeting' },
          { label: 'Entrance Committee', to: '/admin/m/entrance-meeting' },
          { label: 'Finance Committee', to: '/admin/m/fc-meeting' },
        ],
      },
      {
        key: 'wm-admission',
        label: 'Admission',
        children: [
          { label: 'Admission Category', to: '/admin/m/admission-category' },
          { label: 'Admission Details', to: '/admin/m/admission-details' },
        ],
      },
      {
        key: 'wm-examination',
        label: 'Examination',
        children: [
          { label: 'Examination Category', to: '/admin/m/exam-category' },
          { label: 'Examination Details', to: '/admin/m/exam-details' },
        ],
      },
      { label: 'E-NewsPaper / Journal', to: '/admin/m/e-newspaper' },
      { label: 'Approve Notifiaction', to: '/admin/m/approve-notification' },
      { label: 'Approved E-Contant', to: '/admin/m/approved-e-content' },
      { label: 'Approved E-Contant (Faculty)', to: '/admin/m/approved-e-content-faculty' },
      {
        key: 'wm-reports',
        label: 'Reports',
        children: [
          { label: 'All E-Content', to: '/admin/m/all-e-content' },
          { label: 'E-content', to: '/admin/m/e-content-report' },
          { label: 'Deleted E-content', to: '/admin/m/deleted-e-content' },
        ],
      },
    ],
  },
  {
    key: 'faculty-institute',
    label: 'Faculty/Institute',
    icon: MdHome,
    children: [
      { label: 'Dean/Director', to: '/admin/m/dean-director' },
      { label: 'All Dean', to: '/admin/m/all-dean' },
      { label: 'Faculty/Institute Notesboard', to: '/admin/m/faculty-noticeboard' },
      { label: 'Dean - Assistant Dean', to: '/admin/m/dean-assistant' },
      { label: 'Non-Teaching Members', to: '/admin/m/non-teaching' },
      { label: 'E-Content', to: '/admin/m/faculty-e-content' },
      { label: 'E-Content Approve', to: '/admin/m/faculty-e-content-approve' },
      { label: 'E-Content Approve (Department)', to: '/admin/m/faculty-e-content-approve-dept' },
      { label: 'Album', to: '/admin/m/faculty-album' },
      { label: 'Gallery', to: '/admin/m/faculty-gallery' },
    ],
  },
  {
    key: 'department',
    label: 'Department',
    icon: MdHome,
    children: [
      { label: 'Departments Logo/Emaild', to: '/admin/m/dept-logo-email' },
      { label: 'Add Deprtment Menu', to: '/admin/m/dept-add-menu' },
      { label: 'Album', to: '/admin/albums' },
      { label: 'Gallery', to: '/admin/gallery-images' },
      { label: 'Banner', to: '/admin/banners' },
      { label: 'Testimonial', to: '/admin/m/testimonial' },
      { label: 'News Event', to: '/admin/news-events' },
      { label: 'Department Page Content', to: '/admin/m/dept-page-content' },
      { label: 'Head', to: '/admin/m/dept-head' },
      { label: 'Professors', to: '/admin/faculty' },
      { label: 'Ex-Professors', to: '/admin/m/ex-professors' },
      { label: 'SYLLABUS', to: '/admin/m/dept-syllabus' },
      { label: 'E-Content', to: '/admin/m/dept-e-content' },
      { label: 'E-Content Approve', to: '/admin/m/dept-e-content-approve' },
      { label: 'Student Request', to: '/admin/m/student-request' },
      { label: 'Librarian Details', to: '/admin/m/librarian-details' },
      { label: 'Socail Media Link', to: '/admin/m/social-media-link' },
      {
        key: 'wm-dept-notifications',
        label: 'All Notification',
        children: [
          { label: 'Notice Board', to: '/admin/notices' },
          { label: 'Admission', to: '/admin/m/admission-notification' },
          { label: 'Examination', to: '/admin/m/exam-notification' },
          { label: 'Time-Table', to: '/admin/m/time-table' },
        ],
      },
    ],
  },
  {
    key: 'logout',
    label: 'LOGOUT',
    icon: MdPowerSettingsNew,
    action: 'logout',
  },
];
