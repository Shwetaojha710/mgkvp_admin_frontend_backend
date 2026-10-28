const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const newsEventRoutes = require('./routes/newsEventRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const pageRoutes = require('./routes/pageRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const cmsRoutes = require('./routes/cmsRoutes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploads from THIS project only (never from production MGKVP storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'University Admin Clone API is healthy',
    database: process.env.DB_NAME || 'UniversityAdminClone',
    note: 'This API writes only to the independent clone database.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/news-events', newsEventRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/cms', cmsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
