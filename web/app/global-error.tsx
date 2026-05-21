"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-background text-fg antialiased font-sans">
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-fg">
            The dashboard failed to render. Try reloading or check the build logs.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
