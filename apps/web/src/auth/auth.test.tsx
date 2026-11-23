import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { FakeResponse, FakeServer, testProfile, testUser } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

describe('auth gate', () => {
  test('shows first-run setup on a fresh server and enters the app afterwards', async () => {
    const server = new FakeServer();
    let setUp = false;
    server
      .on('GET', '/setup', () => ({ setupRequired: !setUp }))
      .on('POST', '/setup', () => {
        setUp = true;
        return testUser;
      });
    const { user } = renderApp('/', server);

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeVisible();
    await user.type(screen.getByLabelText('Your name'), 'Thomas');
    await user.type(screen.getByLabelText('Email'), 'thomas@example.com');
    await user.type(screen.getByLabelText('Password'), 'long enough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Activities' })).toBeVisible();
    expect(server.calls.find((c) => c.path === '/setup' && c.method === 'POST')?.body).toEqual({
      name: 'Thomas',
      email: 'thomas@example.com',
      password: 'long enough',
      householdName: 'Home',
    });
  });

  test('shows the login screen when signed out and reports wrong passwords', async () => {
    const server = new FakeServer();
    let signedIn = false;
    server
      .on('GET', '/me', () => {
        if (!signedIn) throw new FakeResponse(401, { error: 'unauthorized' });
        return { user: testUser, profile: testProfile };
      })
      .on('POST', '/auth/login', ({ body }) => {
        if ((body as { password: string }).password !== 'right password') {
          throw new FakeResponse(401, {
            error: 'invalid_credentials',
            message: 'Email or password is wrong',
          });
        }
        signedIn = true;
        return testUser;
      });
    const { user } = renderApp('/', server);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    await user.type(screen.getByLabelText('Email'), 'thomas@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is wrong');

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'right password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Activities' })).toBeVisible();
  });

  test('signs out from the side menu', async () => {
    const server = new FakeServer();
    let signedIn = true;
    server
      .on('GET', '/me', () => {
        if (!signedIn) throw new FakeResponse(401, { error: 'unauthorized' });
        return { user: testUser, profile: testProfile };
      })
      .on('POST', '/auth/logout', () => {
        signedIn = false;
        return undefined;
      });
    const { user } = renderApp('/activities', server);

    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Thomas Tester');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});

describe('settings pages', () => {
  test('profile saves targets', async () => {
    const server = new FakeServer().on('PATCH', '/me/profile', ({ body }) => ({
      ...testProfile,
      ...(body as object),
    }));
    const { user } = renderApp('/activities', server);

    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('button', { name: /Profile & goals/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile & goals' })).toBeVisible();

    const calories = screen.getByLabelText('Calories');
    await user.clear(calories);
    await user.type(calories, '2500');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Saved' })).toBeVisible();
    const patch = server.calls.find((c) => c.method === 'PATCH')?.body as typeof testProfile;
    expect(patch.targets.kcal).toBe(2500);
  });

  test('household lists members and lets admins add one', async () => {
    const members = [testUser];
    const server = new FakeServer()
      .on('GET', '/users', () => members)
      .on('POST', '/users', ({ body }) => {
        const created = { ...testUser, ...(body as object), id: 'new', role: 'member' };
        members.push(created as typeof testUser);
        return created;
      });
    const { user } = renderApp('/settings/household', server);

    const main = within(await screen.findByRole('main'));
    expect(await main.findByText('Thomas Tester')).toBeVisible();
    await user.type(screen.getByLabelText('Name'), 'Partner');
    await user.type(screen.getByLabelText('Email'), 'partner@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'temporary1');
    await user.click(screen.getByRole('button', { name: 'Add member' }));
    expect(await main.findByText('Partner')).toBeVisible();
  });
});
