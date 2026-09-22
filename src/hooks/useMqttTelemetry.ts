import { useEffect, useRef, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import { useVehicleStore, deriveStatus, VehicleTelemetry } from "store/useVehicleStore";

/**
 * Live MQTT telemetry (Sira 4.2).
 *
 * Connects to EMQX over WebSocket as `dispatcher-readonly` (subscribe-only ACL,
 * ADR-0009 §4.2), subscribes to fleet/device/+/location, and pushes each frame
 * into useVehicleStore. Status is derived client-side from speed (no DB status
 * column — proven 2026-06-04 against prod public.locations).
 *
 * Missing broker env (preview without Cloudflare MQTT vars) does not throw a
 * user-facing error: `configured` is false and the live-map badge shows
 * `polling` while REST snapshot runs.
 *
 * Dev: ws://localhost:8083/mqtt via SSH tunnel to fleet-prod-01 (no TLS).
 * Prod: wss://mqtt.tulipfleet.com:8084/mqtt (needs browser-valid cert on the
 *   WSS listener — separate infra task; see INTEGRATION_BOUNDARIES §3.2).
 *
 * Payload contract (16-col): device_id, latitude, longitude, speed, heading,
 *   altitude, satellite_count, hdop, accel_x/y/z, accuracy, timestamp.
 */

type ConnState = "connecting" | "connected" | "error" | "closed";

interface LocationFrame {
  device_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
}

export function useMqttTelemetry(): {
  state: ConnState;
  lastError: string | null;
  configured: boolean;
  lastMessageAt: number | null;
} {
  const updateVehicleLocation = useVehicleStore((s) => s.updateVehicleLocation);
  const [state, setState] = useState<ConnState>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const url = process.env.REACT_APP_MQTT_BROKER_URL;
    const username = process.env.REACT_APP_MQTT_DISPATCHER_USER;
    const password = process.env.REACT_APP_MQTT_DISPATCHER_PASS;

    if (!url || !username || !password) {
      setConfigured(false);
      setState("closed");
      setLastError(null);
      return;
    }

    setConfigured(true);
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
          return;
        }
        setLastMessageAt(Date.now());
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
    });

    client.on("close", () => setState((prev) => (prev === "error" ? prev : "closed")));
    client.on("reconnect", () => setState("connecting"));

    return () => {
      client.end(true);
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, lastError, configured, lastMessageAt };
}

export type { VehicleTelemetry };
export { deriveStatus };
