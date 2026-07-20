export function getHealth(_req, res) {
  return res.status(200).json({
    success: true,
    data: {
      service: "microcosm-server",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
}
