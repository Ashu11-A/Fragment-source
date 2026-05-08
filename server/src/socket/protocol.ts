// Tipos do protocolo de comunicação TCP entre servidor e daemon

export type MessageType = 'request' | 'response' | 'event';

export interface BaseMessage {
  messageId: string;
  type: MessageType;
  timestamp: number;
}

// Mensagem enviada pelo servidor para o daemon solicitando uma ação Docker
export interface RequestMessage extends BaseMessage {
  type: 'request';
  action: string;
  payload: Record<string, unknown>;
}

// Resposta do daemon para uma RequestMessage, correlacionada via messageId
export interface ResponseMessage extends BaseMessage {
  type: 'response';
  status: 'success' | 'error';
  data: unknown;
  error: { code: string; message: string } | null;
}

// Mensagem enviada espontaneamente pelo daemon (sem correlação com requisição)
export interface EventMessage extends BaseMessage {
  type: 'event';
  event: string;
  payload: Record<string, unknown>;
}

export type DaemonMessage = RequestMessage | ResponseMessage | EventMessage;

export type DaemonEventHandler = (
  payload: Record<string, unknown>,
  daemonId: string,
) => Promise<void>;
