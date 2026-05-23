import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AppContent } from "./App";

export function render(url: string) {
  return ReactDOMServer.renderToString(
    <StaticRouter location={url}>
      <AppContent />
    </StaticRouter>
  );
}
