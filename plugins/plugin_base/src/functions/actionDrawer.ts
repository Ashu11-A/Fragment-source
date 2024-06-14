import { ActionRowBuilder, AnyComponentBuilder } from "discord.js";

/**
 * ActionsRow drawer, for multiple buttons, lines is for the number of buttons in each line
 */
export function ActionDrawer<T extends AnyComponentBuilder>(rows: T[], lines = 5) {
  const actions = [];
  let current: ActionRowBuilder<T> = new ActionRowBuilder();
  for (let i = 0; i < rows.length; i++) {
    if (i % lines === 0) {
      current = new ActionRowBuilder();
      actions.push(current);
    }
    current.addComponents(rows[i]);
  }
  return actions as InstanceType<typeof ActionRowBuilder<T>>[];
}