-- Generic CMS entries for all remaining MGKVP admin menu modules.
-- Runs against the clone DB only (e.g. mgkvp_new_admin_clone).

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
