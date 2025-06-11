-- Migration: Add updatedBy columns to tickets, customers, and companies tables
-- This migration adds foreign key references to the users table for tracking who updated each record

-- Add updatedBy column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS updatedBy UUID REFERENCES users(id);

-- Add updatedBy column to customers table  
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS updatedBy UUID REFERENCES users(id);

-- Add updatedBy column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS updatedBy UUID REFERENCES users(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_updatedBy ON tickets(updatedBy);
CREATE INDEX IF NOT EXISTS idx_customers_updatedBy ON customers(updatedBy);
CREATE INDEX IF NOT EXISTS idx_companies_updatedBy ON companies(updatedBy);

-- Add comments for documentation
COMMENT ON COLUMN tickets.updatedBy IS 'User ID who last updated this ticket';
COMMENT ON COLUMN customers.updatedBy IS 'User ID who last updated this customer';
COMMENT ON COLUMN companies.updatedBy IS 'User ID who last updated this company'; 