/// <reference path="../.astro/types.d.ts" />

interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent' | 'staff' | 'accountant' | 'librarian' | 'it_admin';
  avatarUrl: string | null;
}

declare namespace App {
  interface Locals {
    user: User | null;
  }
}
