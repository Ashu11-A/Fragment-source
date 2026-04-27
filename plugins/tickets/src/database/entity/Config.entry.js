var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, BaseEntity, PrimaryGeneratedColumn, OneToOne, Column } from 'typeorm';
import Guild from './Guild.entry';
let Config = class Config extends BaseEntity {
    id;
    guild;
    claimLimit;
    limit;
    claimId;
    logsId;
    roles;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Config.prototype, "id", void 0);
__decorate([
    OneToOne(() => Guild, (guid) => guid.configs),
    __metadata("design:type", Object)
], Config.prototype, "guild", void 0);
__decorate([
    Column({ type: 'decimal', precision: 3, nullable: true }),
    __metadata("design:type", Number)
], Config.prototype, "claimLimit", void 0);
__decorate([
    Column({ type: 'decimal', precision: 3, nullable: true }),
    __metadata("design:type", Number)
], Config.prototype, "limit", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Config.prototype, "claimId", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Config.prototype, "logsId", void 0);
__decorate([
    Column({
        type: 'json',
        nullable: true, transformer: {
            to(value) {
                return JSON.stringify(value);
            },
            from(value) {
                return JSON.parse(value);
            },
        },
    }),
    __metadata("design:type", Array)
], Config.prototype, "roles", void 0);
Config = __decorate([
    Entity('configs')
], Config);
export default Config;
