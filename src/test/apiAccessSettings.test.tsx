import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { sendMock, writeTextMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  writeTextMock: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    send: sendMock,
  },
}));

import { ApiAccessSettings } from "@/components/settings/ApiAccessSettings";

const secret = "ltk_live_abcdefghij_1234567890123456789012345678901234567890";
const refreshedSecret = "ltk_live_zyxwvutsrq_0987654321098765432109876543210987654321";

const existingKey = {
  id: "abcdefghijklmn1",
  name: "Account API key",
  prefix: "ltk_live_abcdefghij",
  scopes: ["links:read"],
  status: "active" as const,
  expires_at: "",
  last_used_at: "",
  revoked_at: "",
  created: "2026-07-28T12:00:00.000Z",
  updated: "2026-07-28T12:00:00.000Z",
};

const enabledResponse = {
  data: existingKey,
  secret,
  meta: {
    enabled: true,
    key_limit: 1,
    api_rate_limit_per_minute: 60,
    scope: "links:read",
  },
  request_id: "request-1",
};

const renderSettings = () => render(
  <MemoryRouter>
    <ApiAccessSettings />
  </MemoryRouter>,
);

describe("API Access settings", () => {
  beforeEach(() => {
    sendMock.mockReset();
    writeTextMock.mockReset();
    sendMock.mockResolvedValue(enabledResponse);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it("loads one pre-generated account key without creation controls or backend URLs", async () => {
    renderSettings();

    const input = await screen.findByLabelText("API key secret");
    expect(input).toHaveValue(secret);
    expect(input).toHaveAttribute("type", "password");
    expect(sendMock).toHaveBeenCalledWith("/api/developer/key", {
      method: "GET",
      requestKey: null,
    });
    expect(screen.queryByRole("button", { name: /Generate API key/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add key/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Base URL/i)).not.toBeInTheDocument();
  });

  it("reveals and copies the same account key", async () => {
    renderSettings();

    const input = await screen.findByLabelText("API key secret");
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(secret));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("refreshes the single key and replaces the displayed credential", async () => {
    sendMock
      .mockResolvedValueOnce(enabledResponse)
      .mockResolvedValueOnce({
        ...enabledResponse,
        data: {
          ...existingKey,
          id: "abcdefghijklmn2",
          prefix: "ltk_live_zyxwvutsrq",
        },
        secret: refreshedSecret,
        request_id: "request-2",
      });

    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "Refresh key" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Refresh key" }));

    await waitFor(() => {
      expect(sendMock).toHaveBeenLastCalledWith("/api/developer/key/refresh", {
        method: "POST",
        requestKey: null,
      });
    });
    expect(await screen.findByLabelText("API key secret")).toHaveValue(refreshedSecret);
    expect(sendMock).toHaveBeenCalledWith("/api/developer/key/refresh", {
      method: "POST",
      requestKey: null,
    });
  });

  it("keeps API Access locked on the Creator plan", async () => {
    sendMock.mockResolvedValue({
      data: null,
      secret: "",
      meta: {
        enabled: false,
        key_limit: 0,
        api_rate_limit_per_minute: 0,
        scope: "links:read",
      },
      request_id: "request-3",
    });

    renderSettings();

    expect(await screen.findByText("API access starts with Creator Pro")).toBeInTheDocument();
    expect(screen.queryByLabelText("API key secret")).not.toBeInTheDocument();
  });

  it("renders a recoverable error state instead of a blank screen", async () => {
    sendMock.mockRejectedValueOnce(new Error("network request failed"));

    renderSettings();

    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(screen.getByText("API Access is unavailable right now")).toBeInTheDocument();

    sendMock.mockResolvedValueOnce(enabledResponse);
    fireEvent.click(retry);
    expect(await screen.findByLabelText("API key secret")).toBeInTheDocument();
  });
});
