var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { TypeTemplate } from '@/types/entries.js';
import {} from 'discord.js';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import Guild from './Guild.entry.js';
import Ticket from './Ticket.entry.js';
let Template = class Template extends BaseEntity {
    id;
    guild;
    tickets;
    messageId;
    channelId;
    type;
    selects;
    categories;
    embed;
    properties;
    systems;
    createAt;
    updateAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Template.prototype, "id", void 0);
__decorate([
    ManyToOne(() => Guild, (guild) => guild.templates, { cascade: true }),
    __metadata("design:type", Object)
], Template.prototype, "guild", void 0);
__decorate([
    OneToMany(() => Ticket, (ticket) => ticket.template),
    __metadata("design:type", Array)
], Template.prototype, "tickets", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Template.prototype, "messageId", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Template.prototype, "channelId", void 0);
__decorate([
    Column({
        type: 'varchar',
        enum: ['button', 'select', 'modal'],
        default: TypeTemplate.Button
    }),
    __metadata("design:type", String)
], Template.prototype, "type", void 0);
__decorate([
    Column('simple-json', {
        nullable: true,
        transformer: {
            to(value) {
                return JSON.stringify(value);
            },
            from(value) {
                return JSON.parse(value);
            },
        }
    }),
    __metadata("design:type", Array)
], Template.prototype, "selects", void 0);
__decorate([
    Column('simple-json', {
        nullable: true,
        transformer: {
            to(value) {
                return JSON.stringify(value);
            },
            from(value) {
                return JSON.parse(value);
            },
        }
    }),
    __metadata("design:type", Array)
], Template.prototype, "categories", void 0);
__decorate([
    Column('simple-json', {
        nullable: true,
        transformer: {
            to(value) {
                return JSON.stringify(value);
            },
            from(value) {
                return JSON.parse(value);
            },
        }
    }),
    __metadata("design:type", Object)
], Template.prototype, "embed", void 0);
__decorate([
    Column('simple-json', {
        nullable: true,
        transformer: {
            to(value) {
                return JSON.stringify(value);
            },
            from(value) {
                return JSON.parse(value);
            },
        }
    }),
    __metadata("design:type", Object)
], Template.prototype, "properties", void 0);
__decorate([
    Column('simple-json', {
        nullable: true,
        transformer: {
            from(value) { return JSON.parse(value); },
            to(value) { return JSON.stringify(value); },
        },
        default: '[]'
    }),
    __metadata("design:type", Array)
], Template.prototype, "systems", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Template.prototype, "createAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Template.prototype, "updateAt", void 0);
Template = __decorate([
    Entity('templates')
], Template);
export default Template;
