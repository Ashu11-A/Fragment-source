var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BaseEntity, ManyToOne, UpdateDateColumn, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import Claim from './Claim.entry';
import Template from './Template.entry';
import Guild from './Guild.entry';
let Ticket = class Ticket extends BaseEntity {
    id;
    guild;
    template;
    ownerId;
    title;
    description;
    closed;
    channelId;
    messageId;
    claim;
    voice;
    users;
    team;
    category;
    messages;
    events;
    history;
    updateAt;
    createAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Ticket.prototype, "id", void 0);
__decorate([
    ManyToOne(() => Guild, (guild) => guild.tickets),
    __metadata("design:type", Object)
], Ticket.prototype, "guild", void 0);
__decorate([
    ManyToOne(() => Template, (template) => template.tickets),
    __metadata("design:type", Object)
], Ticket.prototype, "template", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Ticket.prototype, "ownerId", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "title", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "description", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Ticket.prototype, "closed", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Ticket.prototype, "channelId", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Ticket.prototype, "messageId", void 0);
__decorate([
    OneToOne(() => Claim, (claim) => claim.ticket),
    JoinColumn(),
    __metadata("design:type", Object)
], Ticket.prototype, "claim", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Object)
], Ticket.prototype, "voice", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Array)
], Ticket.prototype, "users", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Array)
], Ticket.prototype, "team", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Object)
], Ticket.prototype, "category", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Array)
], Ticket.prototype, "messages", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Array)
], Ticket.prototype, "events", void 0);
__decorate([
    Column({
        type: 'simple-json',
        nullable: true,
        transformer: {
            to(value) { return JSON.stringify(value); },
            from(value) { return JSON.parse(value); },
        }
    }),
    __metadata("design:type", Array)
], Ticket.prototype, "history", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Ticket.prototype, "updateAt", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Ticket.prototype, "createAt", void 0);
Ticket = __decorate([
    Entity('tickets')
], Ticket);
export default Ticket;
