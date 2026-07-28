import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    send: sendMock,
  },
  publicApiBaseUrl: "https://api.example.test/api/v1",
}));

import { ApiAccessSettings } from "@/components/settings/ApiAccessSettings";

describe("API Access settings", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({
      data: [],
      meta: {
        max_active_keys: 1,
        api_rate_limit_per_minute: 60,
        request_id: "request-1",
      },
    });
  });

  it("renders on first mount without relying on an internal PocketBase URL field", async () => {
    render(
      <MemoryRouter>
        <ApiAccessSettings />
      </MemoryRouter>,
    );

    expect(screen.getByText("https://api.example.test/api/v1")).toBeInTheDocument();
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No API keys yet")).toBeInTheDocument();
  });

  it("does not crash when the API returns an unexpected data shape", async () => {
    sendMock.mockResolvedValue({
      data: {},
      meta: {
        max_active_keys: 1,
        api_rate_limit_per_minute: 60,
        request_id: "request-2",
      },
    });

    render(
      <MemoryRouter>
        <ApiAccessSettings />
      </MemoryRouter>,
    );

    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No API keys yet")).toBeInTheDocument();
  });
});
