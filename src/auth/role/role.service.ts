import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../../common/logger/logger.service';

import { RoleNotFoundException } from '../../common/exceptions';
import { Role } from '../entities/role.entity';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        private readonly appLogger: AppLogger,
    ) {}

    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        this.appLogger.log(`Creando un nuevo rol con nombre: ${createRoleDto.name}`);
        const role = this.roleRepository.create(createRoleDto);
        this.appLogger.log(`Rol creado con éxito con ID: ${role.id}`);
        return await this.roleRepository.save(role);
    }

    async findAll(): Promise<Role[]> {
        this.appLogger.log('Recuperando todos los roles de la base de datos');
        return await this.roleRepository.find({
            relations: { rolePermissions: true },
        });
    }

    async findOne(id: number): Promise<Role> {
        this.appLogger.log(`Buscando rol con ID: ${id}`);
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: {
                rolePermissions: {
                    permission: true,
                },
            },
        });
        if (!role) {
            throw new RoleNotFoundException(id);
        }
        this.appLogger.log(`Rol encontrado con ID: ${id}`);
        return role;
    }

    async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
        this.appLogger.log(`Actualizando rol con ID: ${id}`);
        const role = await this.findOne(id);
        this.roleRepository.merge(role, updateRoleDto);
        this.appLogger.log(`Rol con ID: ${id} actualizado con éxito`);
        return await this.roleRepository.save(role);
    }

    async remove(id: number): Promise<{ message: string }> {
        this.appLogger.log(`Eliminando rol con ID: ${id}`);
        const role = await this.findOne(id);
        await this.roleRepository.remove(role);
        this.appLogger.log(`Rol con ID: ${id} eliminado con éxito`);
        return { message: `Role with id #${id} deleted successfully` };
    }
}
