import { useEffect, useState } from "react";

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";
import { useModalRef } from "./misc/useModalRef";
import { ExternalLink } from "./misc/ExternalLink";
import { GenericModal } from "./GenericModal";

export type TransportFactory = {
  label: string;
  connect: () => Promise<RpcTransport>;
};

export interface ConnectModalProps {
  open?: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}

function simpleDevicePicker(
  transports: TransportFactory[],
  onTransportCreated: (t: RpcTransport) => void
) {
  const [selectedTransport, setSelectedTransport] = useState<
    TransportFactory | undefined
  >(undefined);

  useEffect(() => {
    if (!selectedTransport) {
      return;
    }

    let ignore = false;

    async function connectTransport() {
      try {
        const transport = await selectedTransport!.connect();

        if (!ignore) {
          onTransportCreated(transport);
          setSelectedTransport(undefined);
        }
      } catch (e) {
        if (!ignore) {
          console.error(e);
          if (e instanceof Error && !(e instanceof UserCancelledError)) {
            alert(e.message);
          }
          setSelectedTransport(undefined);
        }
      }
    }

    connectTransport();

    return () => {
      ignore = true;
    };
  }, [selectedTransport]);

  let connections = transports.map((t) => (
    <li key={t.label} className="list-none">
      <button
        className="bg-base-300 hover:bg-primary hover:text-primary-content rounded px-2 py-1"
        type="button"
        onClick={async () => setSelectedTransport(t)}
      >
        {t.label}
      </button>
    </li>
  ));
  return (
    <div>
      <p className="text-sm">Select a connection type.</p>
      <ul className="flex gap-2 pt-2">{connections}</ul>
    </div>
  );
}

function noTransportsOptionsPrompt() {
  return (
    <div className="m-4 flex flex-col gap-2">
      <p>
        Your browser is not supported. ZMK Studio uses either{" "}
        <ExternalLink href="https://caniuse.com/web-serial">
          Web Serial
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink href="https://caniuse.com/web-bluetooth">
          Web Bluetooth
        </ExternalLink>{" "}
        (Linux only) to connect to ZMK devices.
      </p>

      <p>
        Use Chrome/Edge with Web Serial over HTTPS or localhost for USB.
        OS serial permissions and explicit device selection are required.
      </p>
    </div>
  );
}

export const ConnectModal = ({
  open,
  transports,
  onTransportCreated,
}: ConnectModalProps) => {
  const dialog = useModalRef(open || false, false, false);

  const haveTransports = transports.length > 0;

  return (
    <GenericModal ref={dialog} className="max-w-xl">
      <h1 className="text-xl">Curve E Keymap Editor</h1>
      {haveTransports
        ? simpleDevicePicker(transports, onTransportCreated)
        : noTransportsOptionsPrompt()}
    </GenericModal>
  );
};
