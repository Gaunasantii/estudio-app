import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { orm } from '../app';
import { User } from '../entities/User';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'super_secret_key_estudio_app';
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      this.getJwtSecret(),
      { expiresIn: '7d' }
    );
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(data: RegisterDTO) {
    const userRepository = orm.em.getRepository(User);

    const existingUser = await userRepository.findOne({ email: data.email });
    if (existingUser) {
      throw new AuthError(409, 'El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = new User();
    user.name = data.name;
    user.email = data.email;
    user.password = hashedPassword;

    await orm.em.persistAndFlush(user);

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(data: LoginDTO) {
    const userRepository = orm.em.getRepository(User);

    const user = await userRepository.findOne({ email: data.email });
    if (!user) {
      throw new AuthError(401, 'Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AuthError(401, 'Credenciales inválidas');
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async getMe(userId: string) {
    const userRepository = orm.em.getRepository(User);

    const user = await userRepository.findOne({ id: userId });
    if (!user) {
      throw new AuthError(404, 'Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }
}

export const authService = new AuthService();

