-- Independent MGKVP Admin Clone schema
-- Target DB from backend/.env (e.g. mgkvp_new_admin_clone) — NEVER production mgkvp_new.
-- Prefer: cd backend && npm run schema
-- Or create the empty database first, then run this script against it.

IF DB_ID(N'mgkvp_new_admin_clone') IS NULL
BEGIN
    CREATE DATABASE mgkvp_new_admin_clone;
END
GO

USE mgkvp_new_admin_clone;
GO

-- Administrators
IF OBJECT_ID(N'dbo.Administrators', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Administrators (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Username        NVARCHAR(100) NOT NULL,
        Email           NVARCHAR(255) NOT NULL,
        PasswordHash    NVARCHAR(255) NOT NULL,
        FullName        NVARCHAR(200) NOT NULL,
        Role            NVARCHAR(50) NOT NULL CONSTRAINT DF_Admin_Role DEFAULT ('admin'),
        IsActive        BIT NOT NULL CONSTRAINT DF_Admin_IsActive DEFAULT (1),
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Admin_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Admin_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Administrators_Username UNIQUE (Username),
        CONSTRAINT UQ_Administrators_Email UNIQUE (Email)
    );
END
GO

-- Departments
IF OBJECT_ID(N'dbo.Departments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departments (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Name            NVARCHAR(200) NOT NULL,
        Code            NVARCHAR(50) NULL,
        Description     NVARCHAR(MAX) NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_Dept_IsActive DEFAULT (1),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Dept_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Dept_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Departments_Name UNIQUE (Name),
        CONSTRAINT FK_Departments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Departments_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_Departments_IsActive ON dbo.Departments(IsActive);
END
GO

-- Faculty members
IF OBJECT_ID(N'dbo.Faculty', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Faculty (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        FullName        NVARCHAR(200) NOT NULL,
        Designation     NVARCHAR(150) NULL,
        Email           NVARCHAR(255) NULL,
        Phone           NVARCHAR(50) NULL,
        Bio             NVARCHAR(MAX) NULL,
        PhotoPath       NVARCHAR(500) NULL,
        PhotoName       NVARCHAR(255) NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_Faculty_IsActive DEFAULT (1),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Faculty_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Faculty_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Faculty_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_Faculty_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Faculty_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_Faculty_DepartmentId ON dbo.Faculty(DepartmentId);
    CREATE INDEX IX_Faculty_FullName ON dbo.Faculty(FullName);
END
GO

-- Notices / circulars
IF OBJECT_ID(N'dbo.Notices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notices (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        Title           NVARCHAR(500) NOT NULL,
        Description     NVARCHAR(MAX) NULL,
        Category        NVARCHAR(100) NULL,
        FilePath        NVARCHAR(500) NULL,
        FileName        NVARCHAR(255) NULL,
        FileType        NVARCHAR(100) NULL,
        PublishDate     DATE NULL,
        IsPublished     BIT NOT NULL CONSTRAINT DF_Notices_IsPublished DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Notices_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Notices_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Notices_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_Notices_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Notices_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_Notices_Title ON dbo.Notices(Title);
    CREATE INDEX IX_Notices_IsPublished ON dbo.Notices(IsPublished);
END
GO

-- News and events
IF OBJECT_ID(N'dbo.NewsEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NewsEvents (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        Title           NVARCHAR(500) NOT NULL,
        Summary         NVARCHAR(1000) NULL,
        Content         NVARCHAR(MAX) NULL,
        EventDate       DATE NULL,
        ImagePath       NVARCHAR(500) NULL,
        ImageName       NVARCHAR(255) NULL,
        Priority        INT NOT NULL CONSTRAINT DF_News_Priority DEFAULT (0),
        IsPublished     BIT NOT NULL CONSTRAINT DF_News_IsPublished DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_News_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_News_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_NewsEvents_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_NewsEvents_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_NewsEvents_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_NewsEvents_Title ON dbo.NewsEvents(Title);
    CREATE INDEX IX_NewsEvents_IsPublished ON dbo.NewsEvents(IsPublished);
END
GO

-- CMS pages
IF OBJECT_ID(N'dbo.Pages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pages (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Title           NVARCHAR(300) NOT NULL,
        Slug            NVARCHAR(300) NOT NULL,
        Content         NVARCHAR(MAX) NULL,
        Category        NVARCHAR(100) NULL,
        IsPublished     BIT NOT NULL CONSTRAINT DF_Pages_IsPublished DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Pages_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Pages_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Pages_Slug UNIQUE (Slug),
        CONSTRAINT FK_Pages_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Pages_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
END
GO

-- Banners (matches reference BannerList fields)
IF OBJECT_ID(N'dbo.Banners', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Banners (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        Title           NVARCHAR(300) NOT NULL,
        Caption         NVARCHAR(500) NULL,
        ImagePath       NVARCHAR(500) NULL,
        ImageName       NVARCHAR(255) NULL,
        ImageType       NVARCHAR(100) NULL,
        Priority        INT NOT NULL CONSTRAINT DF_Banners_Priority DEFAULT (0),
        IsActive        BIT NOT NULL CONSTRAINT DF_Banners_IsActive DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Banners_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Banners_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Banners_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_Banners_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Banners_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_Banners_IsActive ON dbo.Banners(IsActive);
END
GO

-- Galleries / albums
IF OBJECT_ID(N'dbo.Galleries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Galleries (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        Title           NVARCHAR(300) NOT NULL,
        Description     NVARCHAR(1000) NULL,
        CoverImagePath  NVARCHAR(500) NULL,
        CoverImageName  NVARCHAR(255) NULL,
        IsPublished     BIT NOT NULL CONSTRAINT DF_Galleries_IsPublished DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Galleries_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Galleries_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Galleries_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_Galleries_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Galleries_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
END
GO

-- Gallery images
IF OBJECT_ID(N'dbo.GalleryImages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GalleryImages (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        GalleryId       INT NOT NULL,
        Title           NVARCHAR(300) NULL,
        ImagePath       NVARCHAR(500) NOT NULL,
        ImageName       NVARCHAR(255) NULL,
        ImageType       NVARCHAR(100) NULL,
        SortOrder       INT NOT NULL CONSTRAINT DF_GalleryImages_SortOrder DEFAULT (0),
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_GalleryImages_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_GalleryImages_Gallery FOREIGN KEY (GalleryId) REFERENCES dbo.Galleries(Id) ON DELETE CASCADE
    );
END
GO

-- Documents / PDF downloads
IF OBJECT_ID(N'dbo.Documents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Documents (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId    INT NULL,
        Title           NVARCHAR(500) NOT NULL,
        Category        NVARCHAR(150) NULL,
        Description     NVARCHAR(1000) NULL,
        FilePath        NVARCHAR(500) NULL,
        FileName        NVARCHAR(255) NULL,
        FileType        NVARCHAR(100) NULL,
        FileSize        BIGINT NULL,
        IsPublished     BIT NOT NULL CONSTRAINT DF_Documents_IsPublished DEFAULT (0),
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Documents_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Documents_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Documents_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_Documents_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_Documents_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_Documents_Title ON dbo.Documents(Title);
    CREATE INDEX IX_Documents_Category ON dbo.Documents(Category);
END
GO

-- Uploaded file metadata registry
IF OBJECT_ID(N'dbo.UploadedFiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UploadedFiles (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        OriginalName    NVARCHAR(255) NOT NULL,
        StoredName      NVARCHAR(255) NOT NULL,
        FilePath        NVARCHAR(500) NOT NULL,
        MimeType        NVARCHAR(150) NULL,
        FileSize        BIGINT NULL,
        ModuleName      NVARCHAR(100) NULL,
        RecordId        INT NULL,
        UploadedBy      INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_UploadedFiles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_UploadedFiles_UploadedBy FOREIGN KEY (UploadedBy) REFERENCES dbo.Administrators(Id)
    );
END
GO

-- Generic CMS for remaining reference menu modules
IF OBJECT_ID(N'dbo.CmsEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CmsEntries (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        ModuleKey       NVARCHAR(100) NOT NULL,
        DepartmentId    INT NULL,
        Title           NVARCHAR(500) NOT NULL,
        Caption         NVARCHAR(1000) NULL,
        Description     NVARCHAR(MAX) NULL,
        Category        NVARCHAR(150) NULL,
        LinkUrl         NVARCHAR(1000) NULL,
        ImagePath       NVARCHAR(500) NULL,
        ImageName       NVARCHAR(255) NULL,
        FilePath        NVARCHAR(500) NULL,
        FileName        NVARCHAR(255) NULL,
        FileType        NVARCHAR(100) NULL,
        Priority        INT NOT NULL CONSTRAINT DF_Cms_Priority DEFAULT (0),
        IsPublished     BIT NOT NULL CONSTRAINT DF_Cms_IsPublished DEFAULT (0),
        PublishDate     DATE NULL,
        CreatedBy       INT NULL,
        UpdatedBy       INT NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Cms_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Cms_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_CmsEntries_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT FK_CmsEntries_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Administrators(Id),
        CONSTRAINT FK_CmsEntries_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Administrators(Id)
    );
    CREATE INDEX IX_CmsEntries_ModuleKey ON dbo.CmsEntries(ModuleKey);
    CREATE INDEX IX_CmsEntries_Title ON dbo.CmsEntries(Title);
    CREATE INDEX IX_CmsEntries_IsPublished ON dbo.CmsEntries(IsPublished);
END
GO
