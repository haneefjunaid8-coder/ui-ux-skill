import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { appRoutes } from '../app/router';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('ROOT-X landing page', () => {
  it('shows the hero heading, primary call to action and sections', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /deliveries that keep campus moving/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open design system/i })).toHaveAttribute('href', '/design-system');
    expect(screen.getByRole('heading', { name: 'What is ROOT-X?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How ROOT-X will work' })).toBeInTheDocument();
  });

  it('renders the four service highlight cards', async () => {
    renderAt('/');
    const services = document.getElementById('services');
    expect(services).not.toBeNull();
    const cards = services!.querySelectorAll('article.card');
    expect(cards).toHaveLength(4);
  });

  it('includes a skip link and a labelled footer', async () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});

describe('navigation', () => {
  it('navigates to the design system page from the header', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Design system' }));
    // The design-system route is lazy-loaded, so wait for the navigation to finish.
    await waitFor(() => expect(router.state.location.pathname).toBe('/design-system'));
    expect(await screen.findByRole('heading', { name: 'ROOT-X design system' })).toBeInTheDocument();
  });

  it('returns to the home page from the logo link', async () => {
    const user = userEvent.setup();
    const router = renderAt('/design-system');
    await screen.findByRole('heading', { name: 'ROOT-X design system' });
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'ROOT-X home' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('keeps hash links on the landing page', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'How it works' }));
    expect(router.state.location.hash).toBe('#how-it-works');
  });

  it('toggles the mobile menu with aria-expanded and closes it with Escape', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /^menu$/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a not-found page for unknown routes', async () => {
    renderAt('/this-page-does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
  });
});

describe('design system page', () => {
  it('renders buttons, form fields and feedback states', async () => {
    renderAt('/design-system');
    expect(await screen.findByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Full name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Delivery area' })).toBeInTheDocument();
    expect(screen.getAllByRole('alert').some((el) => el.textContent?.includes('Could not load this section'))).toBe(true);
    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('links the phone field error to the input for assistive tech', async () => {
    renderAt('/design-system');
    const phone = await screen.findByRole('textbox', { name: 'Phone number' });
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    const describedBy = phone.getAttribute('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    expect(document.getElementById(describedBy.split(' ')[0])).toHaveTextContent('Enter a valid phone number.');
  });
});
