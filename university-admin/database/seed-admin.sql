-- Seed placeholder note:
-- Prefer running: cd backend && npm run seed
-- That script creates a bcrypt-hashed admin password securely.
--
-- Default seeded credentials (development only):
--   Username: admin
--   Password: Admin@12345
--
-- Change the password immediately after first login.
-- This script alone does NOT insert a usable password hash.

USE UniversityAdminClone;
GO

-- Ensure a default department exists for list filters (like reference MGKVP option)
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Name = N'MGKVP')
BEGIN
    INSERT INTO dbo.Departments (Name, Code, Description, IsActive)
    VALUES (N'MGKVP', N'MGKVP', N'Mahatma Gandhi Kashi Vidyapith', 1);
END
GO
