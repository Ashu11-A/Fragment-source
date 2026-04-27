var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import Template from './Template.entry';
import Ticket from './Ticket.entry';
import Config from './Config.entry';
let Guild = class Guild extends BaseEntity {
    id;
    guildId;
    tickets;
    templates;
    configs;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Guild.prototype, "id", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Guild.prototype, "guildId", void 0);
__decorate([
    OneToMany(() => Ticket, (ticket) => ticket.guild, { cascade: true }),
    __metadata("design:type", Array)
], Guild.prototype, "tickets", void 0);
__decorate([
    OneToMany(() => Template, (ticket) => ticket.guild),
    __metadata("design:type", Array)
], Guild.prototype, "templates", void 0);
__decorate([
    OneToOne(() => Config, (config) => config.guild, { cascade: true }),
    JoinColumn(),
    __metadata("design:type", Object)
], Guild.prototype, "configs", void 0);
Guild = __decorate([
    Entity('guilds')
], Guild);
export default Guild;
