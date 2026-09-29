import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppLogger } from '../../common/logger/logger.service';

import { RoleNotFoundException, UserNotFoundException } from '../../common/exceptions';
import { User } from '../entities/user.entity';
import { RoleService } from '../role/role.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly roleService: RoleService,
        private readonly configService: ConfigService,
        private readonly appLogger: AppLogger,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        this.appLogger.log(`Creando un nuevo usuario con email: ${createUserDto.email}`);
        const { roleId, ...userData } = createUserDto;
        const role = await this.roleService.findOne(roleId);
        if (!role) {
            throw new RoleNotFoundException(roleId);
        }

        const saltRounds = parseInt(this.configService.get<string>('SALT_ROUNDS') ?? '10', 10);

        const passwordHashed = await bcrypt.hash(userData.passwordHash, saltRounds);

        const user = this.userRepository.create({
            ...userData,
            passwordHash: passwordHashed,
            role,
        });

        const savedUser = await this.userRepository.save(user);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...userWithoutPassword } = savedUser;
        this.appLogger.log(`Usuario creado con éxito con ID: ${savedUser.id}`);
        return userWithoutPassword as User;
    }

    async findAll(): Promise<User[]> {
        this.appLogger.log('Recuperando todos los usuarios de la base de datos');
        return await this.userRepository.find({
            relations: { role: true },
        });
    }

    async findOne(id: number, relations: boolean = false): Promise<User> {
        this.appLogger.log(`Buscando usuario con ID: ${id}`);
        const user = await this.userRepository.findOne({
            where: { id },
            relations: { role: relations ? { rolePermissions: { permission: true } } : false },
        });
        if (!user) {
            throw new UserNotFoundException(id);
        }
        this.appLogger.log(`Usuario encontrado con ID: ${id}`);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        this.appLogger.log(`Buscando usuario con email: ${email}`);
        const user = await this.userRepository.findOne({
            where: { email },
            relations: {
                role: {
                    rolePermissions: {
                        permission: true,
                    },
                },
            },
        });
        this.appLogger.log(user ? `Usuario encontrado con email: ${email}` : `No se encontró usuario con email: ${email}`);
        return user || null;
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        this.appLogger.log(`Actualizando usuario con ID: ${id}`);
        const user = await this.findOne(id);
        const { roleId, ...userData } = updateUserDto;

        if (roleId !== undefined) {
            const role = await this.roleService.findOne(roleId);
            if (!role) {
                throw new RoleNotFoundException(roleId);
            }
            user.role = role;
        }

        this.userRepository.merge(user, userData);
        this.appLogger.log(`Usuario con ID: ${id} actualizado con éxito`);
        return await this.userRepository.save(user);
    }

    async remove(id: number): Promise<{ message: string }> {
        this.appLogger.log(`Eliminando usuario con ID: ${id}`);
        const user = await this.findOne(id);
        await this.userRepository.remove(user);
        this.appLogger.log(`Usuario con ID: ${id} eliminado con éxito`);
        return { message: `User with id #${id} deleted successfully` };
    }
}
