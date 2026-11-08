import { db } from "@/lib/db/client";
import { accountStage, withAccountDiagnostics } from "@/lib/observability/account-diagnostics";
import { AccountHttpError, accountFailure, privateHeaders, verifiedAccount } from "@/lib/sync/server-auth";
import { mutateAccountData, readAccountData } from "@/lib/sync/server-repository";
import {
  entityKey,
  MAX_BATCH,
  MAX_BODY_BYTES,
  object,
  ProtocolError,
  validMutation,
} from "@/lib/sync/protocol";

function syncVersion(request: Request): 1 | 2 {
  const value = request.headers.get("x-avo-sync-version");
  if (value === null || value === "1") return 1;
  if (value === "2") return 2;
  throw new ProtocolError("invalid_version");
}

export async function GET(request: Request) {
  return withAccountDiagnostics("account.data.get", async () => {
    try {
      const accountId = await verifiedAccount(request);
      const version = syncVersion(request);
      const data = await accountStage("account.read", () =>
        readAccountData(db, accountId, request.headers.get("if-none-match") ?? undefined, version),
      );
      const headers = { ...privateHeaders, ETag: data.etag };
      if (data.notModified) return new Response(null, { status: 304, headers });
      return Response.json(data, { headers });
    } catch (error) {
      return accountFailure(error);
    }
  });
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
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
}
export async function POST(request: Request) {
  return withAccountDiagnostics("account.data.post", async () => {
    try {
      const accountId = await verifiedAccount(request, true);
      const raw = object(await accountStage("request.parse", () => boundedJSON(request)));
      const version = raw.version;
      if (
        Object.keys(raw).some((key) => !["version", "mutations"].includes(key)) ||
        (version !== 1 && version !== 2) ||
        !Array.isArray(raw.mutations) ||
        raw.mutations.length < 1 ||
        raw.mutations.length > MAX_BATCH
      )
        throw new ProtocolError("invalid_batch");
      const mutations = raw.mutations.map((mutation) => validMutation(mutation, version));
      if (
        new Set(mutations.map((row) => entityKey(row.kind, row.id))).size !== mutations.length ||
        new Set(mutations.map((row) => row.operationId)).size !== mutations.length
      )
        throw new ProtocolError("duplicate_mutation");
      return Response.json(
        {
          version,
          accountId,
          results: await accountStage("account.write", () =>
            mutateAccountData(db, accountId, mutations, version),
          ),
        },
        { headers: privateHeaders },
      );
    } catch (error) {
      return accountFailure(error);
    }
  });
}
