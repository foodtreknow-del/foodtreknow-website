(function exposeSupabaseCustomerAuth() {
  'use strict';

  const clean = value => String(value || '').trim();
  const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));

  function friendlyError(error, fallback) {
    const message = clean(error?.message).toLowerCase();
    if (message.includes('invalid login credentials')) return new Error('Email or password is incorrect. Use Forgot Password or Sign In with Secure Email Link.');
    if (message.includes('email not confirmed')) return new Error('Please verify your email before signing in.');
    if (message.includes('user already registered')) return new Error('An account already exists with that email address.');
    if (message.includes('password should be')) return new Error('Password must be at least 8 characters.');
    if (message.includes('rate limit')) return new Error('Too many attempts. Please wait a moment and try again.');
    return new Error(clean(error?.message) || fallback);
  }

  class SupabaseCustomerAuthAdapter {
    constructor({ client, repository, buildAccount, redirectUrl }) {
      this.client = client;
      this.repository = repository;
      this.buildAccount = buildAccount;
      this.redirectUrl = redirectUrl;
      this.isSupabase = true;
    }

    async loadAccount(user) {
      if (!user) return null;
      const { data: profile, error } = await this.client
        .from('profiles')
        .select('id, first_name, last_name, preferred_name, mobile_number, profile_photo_url, role, created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw friendlyError(error, 'Your customer profile could not be loaded.');

      const metadata = user.user_metadata || {};
      const account = this.buildAccount({
        user,
        profile: profile || {
          id: user.id,
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          preferred_name: metadata.preferred_name || '',
          mobile_number: metadata.mobile_number || '',
          profile_photo_url: '',
          role: 'customer',
          created_at: user.created_at
        },
        existing: this.repository.findById(user.id)
      });
      return this.repository.save(account);
    }

    async signUp(input) {
      const { data, error } = await this.client.auth.signUp({
        email: clean(input.email).toLowerCase(),
        password: input.password,
        options: {
          ...(this.redirectUrl ? { emailRedirectTo: this.redirectUrl } : {}),
          data: {
            first_name: clean(input.firstName),
            last_name: clean(input.lastName),
            mobile_number: clean(input.mobile)
          }
        }
      });
      if (error) throw friendlyError(error, 'Your account could not be created.');
      if (!data?.user) throw new Error('Your account could not be created. Please try again.');

      const account = this.buildAccount({
        user: data.user,
        profile: {
          id: data.user.id,
          first_name: input.firstName,
          last_name: input.lastName,
          preferred_name: '',
          mobile_number: input.mobile,
          profile_photo_url: '',
          role: 'customer',
          created_at: data.user.created_at
        },
        existing: this.repository.findById(data.user.id)
      });
      account.requiresEmailVerification = !data.session;
      account.emailVerified = Boolean(data.user.email_confirmed_at);
      return this.repository.save(account);
    }

    async signIn(identifier, password) {
      const normalized = clean(identifier).toLowerCase();
      if (!isEmail(normalized)) {
        throw new Error('For secure Supabase sign-in, use your email address. Mobile sign-in will be enabled with phone verification.');
      }
      const { data, error } = await this.client.auth.signInWithPassword({ email: normalized, password });
      if (error) throw friendlyError(error, 'You could not be signed in.');
      return this.loadAccount(data.user);
    }

    async getCurrentAccount() {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw friendlyError(error, 'Your saved session could not be restored.');
      return data?.session?.user ? this.loadAccount(data.session.user) : null;
    }

    async requestPasswordReset(identifier) {
      const email = clean(identifier).toLowerCase();
      if (!isEmail(email)) throw new Error('Enter the email address for your FoodTrekNow account.');
      const options = this.redirectUrl ? { redirectTo: this.redirectUrl } : undefined;
      const { error } = await this.client.auth.resetPasswordForEmail(email, options);
      if (error) throw friendlyError(error, 'Reset instructions could not be sent.');
    }

    async requestMagicLink(identifier) {
      const email = clean(identifier).toLowerCase();
      if (!isEmail(email)) throw new Error('Enter the email address for your FoodTrekNow account.');
      const options = {
        shouldCreateUser: false,
        ...(this.redirectUrl ? { emailRedirectTo: this.redirectUrl } : {})
      };
      const { error } = await this.client.auth.signInWithOtp({ email, options });
      if (error) throw friendlyError(error, 'A secure sign-in link could not be sent.');
    }

    async resendConfirmation(identifier) {
      const email = clean(identifier).toLowerCase();
      if (!isEmail(email)) throw new Error('Enter the email address you used to create your FoodTrekNow account.');
      const options = this.redirectUrl ? { emailRedirectTo: this.redirectUrl } : undefined;
      const { error } = await this.client.auth.resend({ type: 'signup', email, options });
      if (error) throw friendlyError(error, 'The confirmation email could not be resent.');
    }

    async updateProfile(accountId, updates) {
      const existing = this.repository.findById(accountId);
      const nextEmail = clean(updates.email).toLowerCase();
      if (existing?.email && nextEmail !== existing.email.toLowerCase()) {
        const { error: emailError } = await this.client.auth.updateUser({ email: nextEmail });
        if (emailError) throw friendlyError(emailError, 'Your email address could not be updated.');
      }

      const { error } = await this.client.from('profiles').update({
        first_name: clean(updates.firstName),
        last_name: clean(updates.lastName),
        preferred_name: clean(updates.preferredName) || null,
        mobile_number: clean(updates.mobile)
      }).eq('id', accountId);
      if (error) throw friendlyError(error, 'Your profile could not be updated.');

      const { data: userData, error: userError } = await this.client.auth.getUser();
      if (userError || !userData?.user) throw friendlyError(userError, 'Your profile could not be reloaded.');
      const account = await this.loadAccount(userData.user);
      if (nextEmail !== userData.user.email) {
        account.email = nextEmail;
        account.emailVerified = false;
        this.repository.save(account);
      }
      return account;
    }

    async changePassword(accountId, currentPassword, nextPassword) {
      const { data: userData, error: userError } = await this.client.auth.getUser();
      if (userError || !userData?.user?.email) throw friendlyError(userError, 'Your account could not be verified.');
      const { error: signInError } = await this.client.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword
      });
      if (signInError) throw new Error('Your current password is incorrect.');
      const { error } = await this.client.auth.updateUser({ password: nextPassword });
      if (error) throw friendlyError(error, 'Your password could not be updated.');
      return this.loadAccount(userData.user);
    }

    async updateRecoveredPassword(nextPassword) {
      const { data, error } = await this.client.auth.updateUser({ password: nextPassword });
      if (error) throw friendlyError(error, 'Your password could not be reset.');
      const email = data?.user?.email;
      if (!email) throw new Error('Your password was updated, but the account could not be verified. Request a secure sign-in link to continue.');
      const { data: verified, error: verifyError } = await this.client.auth.signInWithPassword({ email, password: nextPassword });
      if (verifyError) throw friendlyError(verifyError, 'Your new password could not be verified. Request a secure sign-in link to continue.');
      return this.loadAccount(verified.user);
    }

    async deleteAccount(accountId) {
      const { error } = await this.client.rpc('delete_my_account');
      if (error) throw friendlyError(error, 'Your account could not be deleted.');
      this.repository.remove(accountId);
      await this.client.auth.signOut({ scope: 'local' });
    }

    async signOut() {
      const { error } = await this.client.auth.signOut();
      if (error) throw friendlyError(error, 'You could not be signed out.');
    }

    onAuthStateChange(callback) {
      return this.client.auth.onAuthStateChange(callback);
    }
  }

  window.FoodTrekNowSupabaseAuth = Object.freeze({
    createAdapter(options) {
      if (!options?.client) throw new Error('A Supabase client is required.');
      return new SupabaseCustomerAuthAdapter(options);
    }
  });
})();
