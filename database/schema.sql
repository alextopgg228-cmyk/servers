USE [323pr_Bakunovskiy_CENTR]; 
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL 
DROP TABLE dbo.Employees;
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE ' + OBJECT_NAME(parent_object_id) + ' DROP CONSTRAINT ' + name + ';'
FROM sys.foreign_keys 
WHERE referenced_object_id = OBJECT_ID('Employees');

EXEC sp_executesql @sql;

SET @sql = '';
SELECT @sql = @sql + 'ALTER TABLE ' + OBJECT_NAME(parent_object_id) + ' DROP CONSTRAINT ' + name + ';'
FROM sys.foreign_keys 
WHERE referenced_object_id = OBJECT_ID('FaultTypes');

EXEC sp_executesql @sql;

IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE Orders;
IF OBJECT_ID('dbo.FaultTypes', 'U') IS NOT NULL DROP TABLE FaultTypes;
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL DROP TABLE Employees;
IF OBJECT_ID('dbo.Positions', 'U') IS NOT NULL DROP TABLE Positions;
IF OBJECT_ID('dbo.ServiceStores', 'U') IS NOT NULL DROP TABLE ServiceStores;
IF OBJECT_ID('dbo.SpareParts', 'U') IS NOT NULL DROP TABLE SpareParts;
IF OBJECT_ID('dbo.RepairableModels', 'U') IS NOT NULL DROP TABLE RepairableModels;
IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE Orders;
IF OBJECT_ID('dbo.FaultTypes', 'U') IS NOT NULL DROP TABLE FaultTypes;
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL DROP TABLE Employees;
IF OBJECT_ID('dbo.Positions', 'U') IS NOT NULL DROP TABLE Positions;
IF OBJECT_ID('dbo.ServiceStores', 'U') IS NOT NULL DROP TABLE ServiceStores;
IF OBJECT_ID('dbo.SpareParts', 'U') IS NOT NULL DROP TABLE SpareParts;
IF OBJECT_ID('dbo.RepairableModels', 'U') IS NOT NULL DROP TABLE RepairableModels;

CREATE TABLE Positions (
    PositionCode VARCHAR(10) PRIMARY KEY,
    PositionName VARCHAR(50) NOT NULL,
    Salary DECIMAL(10,2) NOT NULL,
    Responsibilities TEXT,
    Requirements TEXT
);

CREATE TABLE Employees (
    EmployeeCode VARCHAR(10) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Age INT,
    Gender VARCHAR(1),
    Address TEXT,
    Phone VARCHAR(20),
    PassportData VARCHAR(50),
    PositionCode VARCHAR(10),
    FOREIGN KEY (PositionCode) REFERENCES Positions(PositionCode)
);

CREATE TABLE SpareParts (
    PartCode VARCHAR(10) PRIMARY KEY,
    PartName VARCHAR(100) NOT NULL,
    Functions TEXT,
    Price DECIMAL(10,2) NOT NULL
);

CREATE TABLE RepairableModels (
    ModelCode VARCHAR(10) PRIMARY KEY,
    ModelName VARCHAR(100) NOT NULL,
    Type VARCHAR(50),
    Manufacturer VARCHAR(50),
    TechnicalSpecifications TEXT,
    Features TEXT
);

CREATE TABLE FaultTypes (
    FaultCode VARCHAR(10) PRIMARY KEY,
    ModelCode VARCHAR(10),
    Description TEXT,
    Symptoms TEXT,
    RepairMethods TEXT,
    PartCode1 VARCHAR(10),
    PartCode2 VARCHAR(10),
    PartCode3 VARCHAR(10),
    WorkPrice DECIMAL(10,2),
    FOREIGN KEY (ModelCode) REFERENCES RepairableModels(ModelCode),
    FOREIGN KEY (PartCode1) REFERENCES SpareParts(PartCode),
    FOREIGN KEY (PartCode2) REFERENCES SpareParts(PartCode),
    FOREIGN KEY (PartCode3) REFERENCES SpareParts(PartCode)
);

CREATE TABLE ServiceStores (
    StoreCode VARCHAR(10) PRIMARY KEY,
    StoreName VARCHAR(100) NOT NULL,
    Address TEXT,
    Phone VARCHAR(20)
);

CREATE TABLE Orders (
    OrderNumber INT PRIMARY KEY IDENTITY(1,1),
    OrderDate DATE NOT NULL,
    ReturnDate DATE,
    CustomerFullName VARCHAR(100) NOT NULL,
    SerialNumber VARCHAR(50),
    FaultCode VARCHAR(10),
    StoreCode VARCHAR(10),
    WarrantyMark BIT,
    RepairWarrantyPeriod INT,
    TotalPrice DECIMAL(10,2),
    EmployeeCode VARCHAR(10),
    FOREIGN KEY (FaultCode) REFERENCES FaultTypes(FaultCode),
    FOREIGN KEY (StoreCode) REFERENCES ServiceStores(StoreCode),
    FOREIGN KEY (EmployeeCode) REFERENCES Employees(EmployeeCode)
);