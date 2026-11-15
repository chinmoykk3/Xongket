import { Alert, Reading } from "./types";

type Listener<T> = (data: T) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private url: string;
  private alertListeners: Set<Listener<Alert>> = new Set();
  private readingListeners: Set<Listener<Reading>> = new Set();
  private statusListeners: Set<Listener<"connected" | "disconnected" | "connecting">> = new Set();
  private isExplicitlyClosed = false;

  constructor() {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";
    this.url = wsBase;
  }

  public connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.notifyStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.notifyStatus("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const eventType = parsed.type || parsed.event;
          const payload = parsed.data || parsed.alert || parsed;

          if (eventType === "new_alert" || eventType === "alert_raised") {
            this.alertListeners.forEach((fn) => fn(payload));
          } else if (eventType === "new_reading" || eventType === "reading_ingested") {
            this.readingListeners.forEach((fn) => fn(payload));
          }
        } catch (err) {
          console.error("Error parsing WebSocket payload", err);
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus("disconnected");
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private notifyStatus(status: "connected" | "disconnected" | "connecting") {
    this.statusListeners.forEach((fn) => fn(status));
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus("disconnected");
  }

  public onAlert(fn: Listener<Alert>): () => void {
    this.alertListeners.add(fn);
    return () => this.alertListeners.delete(fn);
  }

  public onReading(fn: Listener<Reading>): () => void {
    this.readingListeners.add(fn);
    return () => this.readingListeners.delete(fn);
  }

  public onStatus(fn: Listener<"connected" | "disconnected" | "connecting">): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
}

export const wsService = new WebSocketService();
