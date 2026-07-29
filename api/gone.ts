export default function handler(
  request: { query?: { slug?: string } },
  response: {
    status: (code: number) => {
      setHeader: (name: string, value: string) => unknown;
      send: (body: string) => unknown;
    };
  }
) {
  const slug = request.query?.slug || 'requested-resource';
  const result = response.status(410);
  result.setHeader('Content-Type', 'text/html; charset=utf-8');
  result.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return result.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Produce No Longer Available | The Soil Theory</title>
  </head>
  <body>
    <main>
      <h1>This produce page is no longer available.</h1>
      <p>The resource “${slug.replace(/[<>&"']/g, '')}” has been permanently removed.</p>
      <a href="/">Return to The Soil Theory catalogue</a>
    </main>
  </body>
</html>`);
}
