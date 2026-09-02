declare global {
  namespace App {
    interface Locals {
      user: {
        login: string;
        name: string;
        role: 'admin' | 'supplier';
      } | null;
    }
  }
}

export {};
