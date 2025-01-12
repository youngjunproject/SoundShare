export interface SignUpFormData {
  username?: string;
  phone: string;
}

export interface AuthError {
  field: string;
  message: string;
}