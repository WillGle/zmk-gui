import {
  MetaError,
  NoResponseError,
  Request,
  RequestResponse,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";

interface RpcSession {
  controller: AbortController;
  tail: Promise<void>;
  onFailure?: (error: Error) => void;
}

const sessions = new WeakMap<RpcConnection, RpcSession>();

export function register_rpc_connection(
  conn: RpcConnection,
  signal: AbortSignal,
  onFailure: (error: Error) => void
) {
  const session = getSession(conn);
  session.onFailure = onFailure;
  const abort = () => session.controller.abort(signal.reason);
  if (signal.aborted) {
    abort();
  } else {
    signal.addEventListener("abort", abort, { once: true });
    session.controller.signal.addEventListener(
      "abort",
      () => signal.removeEventListener("abort", abort),
      { once: true }
    );
  }
}

function getSession(conn: RpcConnection): RpcSession {
  let session = sessions.get(conn);
  if (!session) {
    session = { controller: new AbortController(), tail: Promise.resolve() };
    sessions.set(conn, session);
  }
  return session;
}

export function call_rpc(
  conn: RpcConnection,
  req: Omit<Request, "requestId">,
  timeoutMs = 5000
): Promise<RequestResponse> {
  const session = getSession(conn);
  const run = async () => {
    const signal = session.controller.signal;
    signal.throwIfAborted();
    let writer: WritableStreamDefaultWriter<Request> | undefined;
    let reader: ReadableStreamDefaultReader<RequestResponse> | undefined;
    let receivedResponse = false;
    let rejectAbort: (reason: unknown) => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
    const abort = () => {
      rejectAbort(signal.reason);
      // A cancelled response cannot safely be matched to a later request.
      void reader?.cancel(signal.reason).catch(() => {});
      void writer?.abort(signal.reason).catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      session.controller.abort(new Error("Device response timed out. Reconnect and try again."));
    }, timeoutMs);

    try {
      const request = { ...req, requestId: conn.current_request++ };
      console.log("RPC Request", request);
      writer = conn.request_writable.getWriter();
      await Promise.race([writer.write(request), aborted]);
      writer.releaseLock();
      writer = undefined;
      signal.throwIfAborted();
      reader = conn.request_response_readable.getReader();
      const { done, value } = await Promise.race([reader.read(), aborted]);
      signal.throwIfAborted();
      if (done || !value) throw new Error("Device disconnected before responding.");
      if (value.requestId !== request.requestId) throw new Error("Unexpected device response. Reconnect and try again.");
      receivedResponse = true;
      if (value.meta?.noResponse) throw new NoResponseError();
      if (value.meta?.simpleError) throw new MetaError(value.meta.simpleError);
      console.log("RPC Response", value);
      return value;
    } catch (error) {
      if (!receivedResponse) {
        const failure = error instanceof Error ? error : new Error(String(error));
        session.controller.abort(failure);
        session.onFailure?.(failure);
      }
      console.error("RPC Error", error);
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reader?.releaseLock();
      writer?.releaseLock();
    }
  };
  // Serialize only this device, so a failed/abandoned session cannot block a new one.
  const result = session.tail.then(run);
  session.tail = result.then(() => {}, () => {});
  return result;
}
