import { type APITextInputComponent, EmbedBuilder, type ButtonInteraction, type ModalSubmitInteraction } from 'discord.js';
export declare const notFound: EmbedBuilder;
export interface TextInputComponent extends APITextInputComponent {
    title: string;
    database: string;
}
export declare const modalData: Record<string, TextInputComponent>;
export declare function runEditButton(interaction: ButtonInteraction, action: string): Promise<void>;
export declare function runEditModal(interaction: ModalSubmitInteraction<'cached'>, action: string): Promise<void>;
