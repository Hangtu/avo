"use client";

/**
 * Root error boundary. It replaces the root layout, so it must render its own
 * `<html>`/`<body>` and cannot rely on the app stylesheet or providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-MX">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#EFF6F5",
          color: "#1F2A28",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "36rem" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Avo
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem", lineHeight: 1.2 }}>Avo no pudo abrir</h1>
          <p style={{ margin: "0.75rem 0 0", lineHeight: 1.7 }}>
            No se pudo cargar la aplicación. Tus datos locales siguen en este dispositivo.
          </p>
          <p lang="en" style={{ margin: "0.5rem 0 0", lineHeight: 1.7 }}>
            Avo could not load. Your local data is still on this device.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: "2.75rem",
              padding: "0 1.5rem",
              borderRadius: "9999px",
              border: "1px solid #1F2A28",
              background: "#1F2A28",
              color: "#EFF6F5",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar · Try again
          </button>
          <p style={{ marginTop: "1rem", fontSize: "0.75rem", opacity: 0.7 }}>
            {error.digest ? `Referencia: ${error.digest}` : "Sin referencia de error"}
          </p>
        </main>
      </body>
    </html>
  );
}
