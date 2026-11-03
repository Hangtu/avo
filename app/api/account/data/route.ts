import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/domain/validation";
import { AccountHttpError, privateHeaders, verifiedAccount } from "@/lib/sync/server-auth";
import { mutateAccountData, readAccountData } from "@/lib/sync/server-repository";
import { canonicalJSON, entityKey, MAX_BATCH, MAX_BODY_BYTES, object, ProtocolError, validMutation } from "@/lib/sync/protocol";

function failure(error: unknown) {
  if (error instanceof AccountHttpError) return Response.json({ error: error.code }, { status: error.status, headers: privateHeaders });
  if (error instanceof ProtocolError || error instanceof DomainError || error instanceof SyntaxError) {
    const code = error instanceof ProtocolError &&
      ["record_missing", "operation_reused", "snapshot_too_large"].includes(error.message) ? error.message : "invalid_request";
    return Response.json({ error: code }, { status: 400, headers: privateHeaders });
  }
  // Never send connection strings, SQL, row values, or provider tokens to the client.
  console.error("Account persistence unavailable");
  return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers: privateHeaders });
}
export async function GET(request: Request) {
  try {
    const accountId = await verifiedAccount(request);
    const data = await readAccountData(db, accountId);
    const etag = `"${createHash("sha256").update(canonicalJSON(data)).digest("hex")}"`;
    const headers = { ...privateHeaders, ETag: etag };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return Response.json(data, { headers });
  } catch (error) { return failure(error); }
}
async function boundedJSON(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ProtocolError("missing_body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AccountHttpError(413, "body_too_large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
}
export async function POST(request: Request) {
  try {
    const accountId = await verifiedAccount(request, true);
    const raw = object(await boundedJSON(request));
    if (Object.keys(raw).some(key => !["version", "mutations"].includes(key)) || raw.version !== 1 ||
      !Array.isArray(raw.mutations) || raw.mutations.length < 1 || raw.mutations.length > MAX_BATCH) throw new ProtocolError("invalid_batch");
    const mutations = raw.mutations.map(validMutation);
    if (new Set(mutations.map(row => entityKey(row.kind, row.id))).size !== mutations.length ||
      new Set(mutations.map(row => row.operationId)).size !== mutations.length) throw new ProtocolError("duplicate_mutation");
    return Response.json({ version: 1, accountId, results: await mutateAccountData(db, accountId, mutations) }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
