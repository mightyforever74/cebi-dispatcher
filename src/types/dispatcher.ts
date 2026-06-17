/**
 * Dispatcher UI type definitions
 * Schema-aligned types for vehicle and driver list screens
 */

/**
 * Vehicle row data
 * Maps directly to `public.vehicles` schema columns
 */
export interface VehicleRow {
  id: string;
  plate_no: string;
  brand: string;
  model: string;
  vehicle_category: string;
  fuel_type?: string;
  total_km?: string | number;
  last_maintenance_date?: string; // ISO date
  next_maintenance_km?: string | number;
  emission_class?: string; // e.g., 'euro_6', 'zero_emission'
  status: "available" | "in_use" | "maintenance" | "retired";
  assigned_vehicle_id?: string | null; // reverse relation: drivers.assigned_vehicle_id
  company_id: string;
}

/**
 * Driver row data
 * Maps to `public.drivers` schema + `public.users` name join
 */
export interface DriverRow {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  license_no?: string;
  license_expiry?: string; // ISO date
  safety_score: string | number; // wire'da "5.00"
  status: "available" | "on_task" | "task_pending" | "on_leave" | "offline";
  total_km_driven?: string | number; // wire'da "0.00"
  assigned_vehicle_id?: string | null;
  assigned_vehicle?: { plate_no: string } | null; // denormalized for display
  company_id: string;
}

/**
 * Vehicle assignment (reverse-lookup from vehicles.assigned_vehicle_id)
 */
export interface VehicleAssignment {
  driver_id: string;
  driver_name: string;
  plate_no: string;
}
