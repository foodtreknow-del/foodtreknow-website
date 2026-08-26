import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const authSource = fs.readFileSync(new URL('../js/supabase-auth.js', import.meta.url), 'utf8');
const configSource = fs.readFileSync(new URL('../js/supabase-config.js', import.meta.url), 'utf8');
const clientSource = fs.readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
const customerAccountSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lifecycleMigration = fs.readFileSync(new URL('../supabase/migrations/202608230002_customer_auth_lifecycle.sql', import.meta.url), 'utf8');

function createHarness() {
  const calls = [];
  const user = {
    id: 'customer-123',
    email: 'avery@example.com',
    email_confirmed_at: null,
    created_at: '2026-08-23T12:00:00.000Z',
    user_metadata: { first_name: 'Avery', last_name: 'Jordan', mobile_number: '5555550198' }
  };
  const profile = {
    id: user.id,
    first_name: 'Avery',
    last_name: 'Jordan',
    preferred_name: '',
    mobile_number: '5555550198',
    profile_photo_url: '',
    role: 'customer',
    created_at: user.created_at
  };
  const client = {
    auth: {
      async signUp(payload) { calls.push(['signUp', payload]); return { data: { user, session: null }, error: null }; },
      async signInWithPassword(payload) { calls.push(['signIn', payload]); return { data: { user }, error: null }; },
      async getSession() { return { data: { session: { user } }, error: null }; },
      async getUser() { return { data: { user }, error: null }; },
      async resetPasswordForEmail(email, options) { calls.push(['reset', email, options]); return { error: null }; },
      async updateUser(payload) { calls.push(['updateUser', payload]); return { data: { user }, error: null }; },
      async signOut(options) { calls.push(['signOut', options]); return { error: null }; },
      onAuthStateChange(callback) { calls.push(['listener', callback]); return { data: { subscription: { unsubscribe() {} } } }; }
    },
    from(table) {
      return {
        select() { return this; },
        update(payload) { calls.push(['updateProfile', table, payload]); return this; },
        eq() { return this; },
        async maybeSingle() { return { data: profile, error: null }; },
        then(resolve) { resolve({ data: null, error: null }); }
      };
    },
    async rpc(name) { calls.push(['rpc', name]); return { error: null }; }
  };
  const accounts = new Map();
  const repository = {
    findById(id) { return accounts.get(id) || null; },
    save(account) { accounts.set(account.id, account); return account; },
    remove(id) { accounts.delete(id); }
  };
  const buildAccount = ({ user: authUser, profile: customerProfile, existing }) => ({
    ...existing,
    id: authUser.id,
    email: authUser.email,
    firstName: customerProfile.first_name,
    lastName: customerProfile.last_name,
    mobile: customerProfile.mobile_number,
    emailVerified: Boolean(authUser.email_confirmed_at),
    orders: existing?.orders || []
  });
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(authSource, context, { filename: 'supabase-auth.js' });
  const adapter = context.window.FoodTrekNowSupabaseAuth.createAdapter({
    client,
    repository,
    buildAccount,
    redirectUrl: 'https://foodtreknow.example/'
  });
  return { adapter, calls, accounts };
}

test('Supabase is loaded and configured before the customer account module', () => {
  const library = html.indexOf('@supabase/supabase-js@2');
  const config = html.indexOf('js/supabase-config.js');
  const client = html.indexOf('js/supabase-client.js');
  const adapter = html.indexOf('js/supabase-auth.js');
  const customer = html.indexOf('js/customer-account.js');
  assert.ok(library >= 0 && library < config && config < client && client < adapter && adapter < customer);
  assert.match(configSource, /sb_publishable_/);
  assert.doesNotMatch(configSource + clientSource + authSource, /sb_secret_|service_role/i);
});

test('production customer authentication fails closed when secure configuration is unavailable', () => {
  assert.match(customerAccountSource, /secureConfig\?\.enabled === false[^\n]*LocalCustomerAuthAdapter/);
  assert.match(customerAccountSource, /!secureConfig\?\.enabled[^\n]*UnavailableCustomerAuthAdapter|!secureConfig\?\.enabled[\s\S]*return new UnavailableCustomerAuthAdapter/);
  assert.doesNotMatch(customerAccountSource, /if \(!window\.FoodTrekNowSupabaseConfig\?\.enabled\) return new LocalCustomerAuthAdapter/);
});

test('customer sign-up sends safe profile metadata and requires email verification', async () => {
  const { adapter, calls, accounts } = createHarness();
  const account = await adapter.signUp({
    firstName: 'Avery',
    lastName: 'Jordan',
    mobile: '5555550198',
    email: 'Avery@example.com',
    password: 'safe-password'
  });
  assert.equal(account.requiresEmailVerification, true);
  assert.equal(account.email, 'avery@example.com');
  assert.equal(accounts.has(account.id), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].options.data)), {
    first_name: 'Avery',
    last_name: 'Jordan',
    mobile_number: '5555550198'
  });
  assert.equal('role' in calls[0][1].options.data, false);
});

test('customer sign-in, reset, password update, sign-out, and deletion use Supabase', async () => {
  const { adapter, calls, accounts } = createHarness();
  const account = await adapter.signIn('AVERY@example.com', 'safe-password');
  assert.equal(account.firstName, 'Avery');
  await adapter.requestPasswordReset('avery@example.com');
  await adapter.changePassword(account.id, 'safe-password', 'new-safe-password');
  await adapter.signOut();
  await adapter.deleteAccount(account.id);
  assert.ok(calls.some(call => call[0] === 'reset'));
  assert.ok(calls.some(call => call[0] === 'updateUser' && call[1].password === 'new-safe-password'));
  assert.ok(calls.some(call => call[0] === 'rpc' && call[1] === 'delete_my_account'));
  assert.equal(accounts.has(account.id), false);
});

test('unverified mobile-password shortcuts are rejected', async () => {
  const { adapter } = createHarness();
  await assert.rejects(() => adapter.signIn('(555) 555-0198', 'safe-password'), /phone verification/i);
});

test('account deletion RPC can only delete the authenticated user', () => {
  assert.match(lifecycleMigration, /alter table public\.orders alter column customer_id drop not null/i);
  assert.match(lifecycleMigration, /foreign key \(customer_id\) references public\.profiles\(id\) on delete set null/i);
  assert.match(lifecycleMigration, /current_user_id uuid := auth\.uid\(\)/i);
  assert.match(lifecycleMigration, /delete from auth\.users where id = current_user_id/i);
  assert.match(lifecycleMigration, /grant execute on function public\.delete_my_account\(\) to authenticated/i);
  assert.match(lifecycleMigration, /revoke all on function public\.delete_my_account\(\) from public, anon/i);
});
