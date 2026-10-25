import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import MyIssues from './MyIssues';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockIssue = {
  id: 101,
  title: 'Login button not working',
  description: 'Clicking login does nothing',
  status: 'open',
  severity: 'high',
  project_id: 1,
  assignee_id: 2,
  created_at: '2026-10-20T10:00:00Z',
  estimated_duration_days: 2,
  due_date: null,
  completed_at: null,
  actual_duration_days: null,
};

const mockProjects = {
  data: [{ id: 1, name: 'Bug Tracker' }],
};

const mockIssuesResponse = {
  data: {
    items: [mockIssue],
    total: 1,
    page: 1,
    page_size: 10,
    total_pages: 1,
  },
};

const mockEmptyResponse = {
  data: {
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  },
};

function mockSuccessfulApi() {
  vi.mocked(api.get).mockImplementation((url) => {
    if (url === '/projects/') {
      return Promise.resolve(mockProjects);
    }

    return Promise.resolve(mockIssuesResponse);
  });
}

describe('MyIssues page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading message while issues are being fetched', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    render(<MyIssues />);

    expect(screen.getByText('Loading your issues...')).toBeInTheDocument();
  });

  it('displays issues returned by the API', async () => {
    mockSuccessfulApi();

    render(<MyIssues />);

    expect(
      await screen.findByText('Login button not working'),
    ).toBeInTheDocument();

    expect(screen.getByText('Clicking login does nothing')).toBeInTheDocument();

    expect(screen.getByText('1 matching issue(s)')).toBeInTheDocument();
  });

  it('shows an empty-state message when no issues are returned', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/projects/') {
        return Promise.resolve(mockProjects);
      }

      return Promise.resolve(mockEmptyResponse);
    });

    render(<MyIssues />);

    expect(
      await screen.findByText('No issues match your filters.'),
    ).toBeInTheDocument();
  });

  it('sends a PATCH request when the issue status is changed', async () => {
    const user = userEvent.setup();

    mockSuccessfulApi();
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    render(<MyIssues />);

    const statusSelect = await screen.findByRole('combobox', {
      name: 'Update status for Login button not working',
    });

    await user.selectOptions(statusSelect, 'in_progress');

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/issues/101/status', {
        status: 'in_progress',
      });
    });
  });

  it('shows an error toast when loading issues fails', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/projects/') {
        return Promise.resolve(mockProjects);
      }

      return Promise.reject(new Error('Network error'));
    });

    render(<MyIssues />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not load your issues.');
    });
  });

  it('sends the search term to the API when the user searches', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/projects/') {
        return Promise.resolve(mockProjects);
      }

      return Promise.resolve(mockEmptyResponse);
    });

    render(<MyIssues />);

    const searchInput = await screen.findByLabelText('Search issues');

    fireEvent.change(searchInput, {
      target: { value: 'login' },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/issues/my-issues',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'login',
          }),
        }),
      );
    });
  });
});
