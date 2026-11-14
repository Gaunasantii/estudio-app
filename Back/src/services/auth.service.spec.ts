import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, AuthError } from './auth.service';
import { orm } from '../app';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('../app', () => ({
  orm: {
    em: {
      getRepository: vi.fn(),
      persistAndFlush: vi.fn(),
      flush: vi.fn(),
    },
  },
}));

describe('AuthService', () => {
  const mockUserRepository = {
    findOne: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (orm.em.getRepository as any).mockReturnValue(mockUserRepository);
    (orm.em.persistAndFlush as any).mockResolvedValue(undefined);
    (orm.em.flush as any).mockResolvedValue(undefined);
  });

  describe('register', () => {
    it('debería registrar un usuario correctamente y devolver el token con usuario sanitizado', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const registerDTO = {
        name: 'Juan Perez',
        email: 'juan@example.com',
        password: 'password123',
      };

      const result = await authService.register(registerDTO);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ email: registerDTO.email });
      expect(orm.em.persistAndFlush).toHaveBeenCalledTimes(1);

      const persistedUser = (orm.em.persistAndFlush as any).mock.calls[0][0];
      expect(persistedUser.name).toBe(registerDTO.name);
      expect(persistedUser.email).toBe(registerDTO.email);
      expect(await bcrypt.compare('password123', persistedUser.password)).toBe(true);

      expect(result.user).toEqual({
        id: persistedUser.id,
        name: registerDTO.name,
        email: registerDTO.email,
        createdAt: persistedUser.createdAt,
        updatedAt: persistedUser.updatedAt,
      });
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBeDefined();

      const decoded = jwt.decode(result.token) as any;
      expect(decoded.id).toBe(persistedUser.id);
      expect(decoded.email).toBe(registerDTO.email);
    });

    it('debería lanzar AuthError(409) si el email ya está registrado', async () => {
      const existingUser = new User();
      existingUser.email = 'existente@example.com';
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        authService.register({
          name: 'Otro',
          email: 'existente@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(AuthError);

      await expect(
        authService.register({
          name: 'Otro',
          email: 'existente@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'El correo electrónico ya está registrado',
      });
      expect(orm.em.persistAndFlush).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('debería iniciar sesión correctamente con credenciales válidas', async () => {
      const hashedPassword = await bcrypt.hash('secretPassword', 10);
      const user = new User();
      user.name = 'Ana Lopez';
      user.email = 'ana@example.com';
      user.password = hashedPassword;

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await authService.login({
        email: 'ana@example.com',
        password: 'secretPassword',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ email: 'ana@example.com' });
      expect(result.user.email).toBe('ana@example.com');
      expect(result.user.name).toBe('Ana Lopez');
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBeDefined();
    });

    it('debería lanzar AuthError(401) si el usuario no existe', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'noexiste@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Credenciales inválidas',
      });
    });

    it('debería lanzar AuthError(401) si la contraseña es incorrecta', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const user = new User();
      user.email = 'ana@example.com';
      user.password = hashedPassword;

      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'ana@example.com',
          password: 'wrongPassword',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Credenciales inválidas',
      });
    });
  });

  describe('updateProfile', () => {
    it('debería actualizar el nombre correctamente', async () => {
      const user = new User();
      user.name = 'Nombre Anterior';
      user.email = 'user@example.com';
      user.password = 'hashed';

      mockUserRepository.findOne.mockResolvedValue(user);

      const updated = await authService.updateProfile(user.id, {
        name: '  Nombre Nuevo  ',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ id: user.id });
      expect(user.name).toBe('Nombre Nuevo');
      expect(orm.em.flush).toHaveBeenCalledTimes(1);
      expect(updated.name).toBe('Nombre Nuevo');
    });

    it('debería lanzar AuthError(400) si el nuevo nombre está vacío', async () => {
      const user = new User();
      user.name = 'Nombre Anterior';
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.updateProfile(user.id, {
          name: '    ',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'El nombre no puede estar vacío',
      });
      expect(orm.em.flush).not.toHaveBeenCalled();
    });

    it('debería actualizar la contraseña si la actual es válida y la nueva cumple los requisitos', async () => {
      const currentHashed = await bcrypt.hash('oldPassword123', 10);
      const user = new User();
      user.name = 'Carlos';
      user.email = 'carlos@example.com';
      user.password = currentHashed;

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await authService.updateProfile(user.id, {
        currentPassword: 'oldPassword123',
        newPassword: 'newSecretPassword456',
      });

      expect(orm.em.flush).toHaveBeenCalledTimes(1);
      expect(await bcrypt.compare('newSecretPassword456', user.password)).toBe(true);
      expect(result.id).toBe(user.id);
    });

    it('debería lanzar AuthError(400) si se envía newPassword sin currentPassword', async () => {
      const user = new User();
      user.password = await bcrypt.hash('oldPassword', 10);
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.updateProfile(user.id, {
          newPassword: 'newPassword123',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Debés ingresar tu contraseña actual para cambiar la contraseña',
      });
      expect(orm.em.flush).not.toHaveBeenCalled();
    });

    it('debería lanzar AuthError(401) si currentPassword es incorrecta', async () => {
      const user = new User();
      user.password = await bcrypt.hash('oldPassword', 10);
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.updateProfile(user.id, {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'La contraseña actual es incorrecta',
      });
      expect(orm.em.flush).not.toHaveBeenCalled();
    });

    it('debería lanzar AuthError(400) si la nueva contraseña tiene menos de 6 caracteres', async () => {
      const user = new User();
      user.password = await bcrypt.hash('oldPassword', 10);
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.updateProfile(user.id, {
          currentPassword: 'oldPassword',
          newPassword: '123',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'La nueva contraseña debe tener al menos 6 caracteres',
      });
      expect(orm.em.flush).not.toHaveBeenCalled();
    });

    it('debería lanzar AuthError(404) si el usuario a actualizar no existe', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.updateProfile('id-inexistente', {
          name: 'Nuevo Nombre',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });
      expect(orm.em.flush).not.toHaveBeenCalled();
    });
  });
});
