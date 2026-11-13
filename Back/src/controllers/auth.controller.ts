import { Request, Response } from 'express';
import { authService, AuthError } from '../services/auth.service';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ message: 'Todos los campos (name, email, password) son obligatorios' });
        return;
      }

      const result = await authService.register({ name, email, password });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in register:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Los campos email y password son obligatorios' });
        return;
      }

      const result = await authService.login({ email, password });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const user = await authService.getMe(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in me:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const { name, currentPassword, newPassword } = req.body;

      if (name === undefined && !newPassword) {
        res.status(400).json({ message: 'Debés proporcionar al menos un campo para actualizar (name o newPassword)' });
        return;
      }

      const user = await authService.updateProfile(req.user.id, {
        name,
        currentPassword,
        newPassword,
      });

      res.status(200).json({
        user,
        message: 'Perfil actualizado correctamente',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      console.error('Error in updateProfile:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

export const authController = new AuthController();

