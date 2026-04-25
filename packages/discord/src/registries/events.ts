import { Event as ConstaticEvent, type ClientEventKey } from '@ashu11a/constatic'

export class Event<EventName extends ClientEventKey = ClientEventKey> extends ConstaticEvent<EventName> {
  public pluginName?: string
}
