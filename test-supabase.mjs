import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  const p = {
      employee_id: 'test@test.com',
      employee_name: 'Test',
      employee_ci: '123456',
      employee_role: 'Operario',
      period_month: 'Mayo',
      period_year: '2026',
      base_salary: 1000,
      bonus_antiquity: 0,
      bonus_production: 0,
      total_income: 1000,
      afp: 0,
      health_insurance: 0,
      syndicate: 0,
      rc_iva: 0,
      total_discounts: 0,
      net_pay: 1000,
      status: 'Pendiente',
      branch_id: 'sucursal-a'
  };
  const { data, error } = await supabase.from('payrolls').insert([p]).select();
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
