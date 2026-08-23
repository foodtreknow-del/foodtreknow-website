import { createClient } from 'npm:@supabase/supabase-js@2';

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function authenticatedVendor(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.');

  const url = requiredEnvironment('SUPABASE_URL');
  const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.');

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: vendor, error: vendorError } = await serviceClient
    .from('vendor_profiles')
    .select('id, owner_id, business_name, contact_email')
    .eq('owner_id', userData.user.id)
    .single();
  if (vendorError || !vendor) throw new Error('Only an approved vendor can connect a Stripe account.');

  return { serviceClient, user: userData.user, vendor };
}
