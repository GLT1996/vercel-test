/**
 * 简易的 SSE 事件分发器（进程内）
 *
 * 每个房间维护一组 listener，当有新消息写入时
 * 调用 notify(room, msg) 推送给该房间所有 SSE 连接。
 */

export interface ChatPayload {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
}

type Listener = (msg: ChatPayload) => void;

class ChatSSEBus {
  private rooms = new Map<string, Set<Listener>>();

  /** 订阅某房间的新消息 */
  subscribe(room: string, listener: Listener) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(listener);
  }

  /** 取消订阅 */
  unsubscribe(room: string, listener: Listener) {
    const set = this.rooms.get(room);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.rooms.delete(room);
    }
  }

  /** 通知某房间所有订阅者 */
  notify(room: string, msg: ChatPayload) {
    const set = this.rooms.get(room);
    if (set) {
      for (const fn of set) {
        try {
          fn(msg);
        } catch {
          // ignore
        }
      }
    }
  }
}

// 使用 globalThis 保证在 HMR 时单例不丢失
const globalForSSE = globalThis as unknown as { __chatSSEBus?: ChatSSEBus };
export const chatSSEBus = globalForSSE.__chatSSEBus ?? new ChatSSEBus();
globalForSSE.__chatSSEBus = chatSSEBus;

