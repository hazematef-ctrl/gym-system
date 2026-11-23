
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
    public code?: string,
  ) {
    super(message);

    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}
