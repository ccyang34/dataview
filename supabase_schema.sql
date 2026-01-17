-- Create the crush_margins table for storing daily analysis data
create table public.crush_margins (
  date date primary key,
  soybean_oil_price numeric,
  soybean_meal_price numeric,
  soybean_no2_price numeric,
  oil_basis numeric,
  meal_basis numeric,
  gross_margin numeric,
  futures_margin numeric,
  oil_meal_ratio numeric,
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.crush_margins enable row level security;

-- Create a policy that allows anyone to read data (public access for the website)
create policy "Allow public read access"
on public.crush_margins
for select
to public
using (true);

-- Create a policy that allows authenticated service role to insert/update (for the Python backend)
-- Assuming the backend uses the SERVICE_ROLE_KEY or an authenticated user
create policy "Allow service role to insert/update"
on public.crush_margins
for all
to service_role
using (true)
with check (true);
