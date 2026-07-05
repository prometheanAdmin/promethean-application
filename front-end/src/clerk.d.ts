export {};

declare global {
  interface UserUnsafeMetadata {
    role?: 'student' | 'mentor' | 'admin';
  }

  interface SignUpUnsafeMetadata {
    role?: 'student' | 'mentor' | 'admin';
  }
}
