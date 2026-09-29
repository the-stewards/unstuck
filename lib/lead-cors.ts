// Open to any origin on the two lead routes only. Neither route uses cookies
// or sessions, and neither returns anything secret: the count is public by
// design and the POST only ever writes a lead. Same reasoning as the
// checkout route's CORS block.
export const LEAD_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
