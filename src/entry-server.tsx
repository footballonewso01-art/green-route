import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { PassThrough } from "node:stream";
import { AppContent } from "./App";
import { beginServerSeoCollection, endServerSeoCollection } from "./lib/serverSeo";

const renderApp = (url: string) => new Promise<string>((resolve, reject) => {
  let settled = false;
  const state: { timeout?: ReturnType<typeof setTimeout> } = {};
  const fail = (error: unknown) => {
    if (settled) return;
    settled = true;
    if (state.timeout) clearTimeout(state.timeout);
    reject(error);
  };

  const { pipe, abort } = ReactDOMServer.renderToPipeableStream(
    <StaticRouter location={url}>
      <AppContent />
    </StaticRouter>,
    {
      onAllReady() {
        const output = new PassThrough();
        let html = "";
        output.setEncoding("utf8");
        output.on("data", (chunk) => { html += chunk; });
        output.on("end", () => {
          if (settled) return;
          settled = true;
          if (state.timeout) clearTimeout(state.timeout);
          resolve(html);
        });
        output.on("error", fail);
        pipe(output);
      },
      onShellError: fail,
      onError(error) {
        console.error("SSR render error:", error);
      },
    }
  );

  state.timeout = setTimeout(() => {
    if (settled) return;
    abort();
    fail(new Error(`SSR timed out for ${url}`));
  }, 15_000);
});

export async function render(url: string) {
  beginServerSeoCollection();

  try {
    const appHtml = await renderApp(url);

    return { appHtml, seo: endServerSeoCollection() };
  } catch (error) {
    endServerSeoCollection();
    throw error;
  }
}
