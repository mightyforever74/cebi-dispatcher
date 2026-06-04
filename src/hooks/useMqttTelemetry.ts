import { useEffect, useRef, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import { useVehicleStore, deriveStatus, VehicleTelemetry } from "store/useVehicleStore";

/**
 * Live MQTT telemetry (Sıra 4.2).
 *
 * Connects to EMQX over WebSocket as `dispatcher-readonly` (subscribe-only ACL,
 * ADR-0009 §4.2), subscribes to fleet/device/+/location, and pushes each frame
 * into useVehicleStore. Status is derived client-side from speed (no DB status
 * column — proven 2026-06-04 against prod public.locations).
 *
 * Dev: ws://localhost:8083/mqtt via SSH tunnel to fleet-prod-01 (no TLS).
 * Prod: wss://mqtt.tulipfleet.com:8084/mqtt (needs browser-valid cert on the
 *   WSS listener — separate infra task; see INTEGRATION_BOUNDARIES §3.2).
 *
 * Payload contract (16-col): device_id, latitude, longitude, speed, heading,
 *   altitude, satellite_count, hdop, accel_x/y/z, accuracy, timestamp.
 *
 * The store seeds 5 mock trucks whose ids are the plate strings (GV-082-B …),
 * and the synthetic publisher publishes to fleet/device/<plate>/location, so
 * device_id on the topic matches the store key in dev. With real ESP32s the
 * device_id is the chipId; a chipId→vehicle map will be added in Sıra 4.3 when
 * GET /api/locations/latest provides the initial roster.
 */

type ConnState = "connecting" | "connected" | "error" | "closed";

interface LocationFrame {
  device_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
}

export function useMqttTelemetry(): { state: ConnState; lastError: string | null } {
  const updateVehicleLocation = useVehicleStore((s) => s.updateVehicleLocation);
  const [state, setState] = useState<ConnState>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const url = process.env.REACT_APP_MQTT_BROKER_URL;
    const username = process.env.REACT_APP_MQTT_DISPATCHER_USER;
    const password = process.env.REACT_APP_MQTT_DISPATCHER_PASS;

    if (!url || !username || !password) {
      setState("error");
      setLastError("MQTT env vars missing (REACT_APP_MQTT_BROKER_URL / USER / PASS).");
      // eslint-disable-next-line no-console
      console.error("[mqtt] missing env config — check dispatcher .env");
      return;
    }

    const client = mqtt.connect(url, {
      username,
      password,
      clientId: `dispatcher-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 8000,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setState("connected");
      setLastError(null);
      client.subscribe("fleet/device/+/location", { qos: 0 }, (err) => {
        if (err) {
          setState("error");
          setLastError(`subscribe failed: ${err.message}`);
          // eslint-disable-next-line no-console
          console.error("[mqtt] subscribe error", err);
        }
      });
    });

    client.on("message", (topic, payload) => {
      try {
        const frame = JSON.parse(payload.toString()) as LocationFrame;
        if (
          !frame.device_id ||
          typeof frame.latitude !== "number" ||
          typeof frame.longitude !== "number"
        ) {
          return; // ignore malformed frame
        }
        updateVehicleLocation(
          frame.device_id,
          frame.latitude,
          frame.longitude,
          typeof frame.speed === "number" ? frame.speed : 0,
          frame.heading
        );
      } catch {
        // ignore non-JSON / parse errors
      }
    });

    client.on("error", (err) => {
      setState("error");
      setLastError(err.message);
      // eslint-disable-next-line no-console
      console.error("[mqtt] connection error", err.message);
    });

    client.on("close", () => setState((prev) => (prev === "error" ? prev : "closed")));
    client.on("reconnect", () => setState("connecting"));

    return () => {
      client.end(true);
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, lastError };
}

// Helper for the store: ensure deriveStatus + VehicleTelemetry stay referenced
// so a tree-shake doesn't drop the type-only import in some build configs.
export type { VehicleTelemetry };
export { deriveStatus };
