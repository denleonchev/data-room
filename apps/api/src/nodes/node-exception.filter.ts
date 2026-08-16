import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { UploadNotFoundError } from "../files/file-errors";
import {
  NodeNameConflictError,
  NodeNotFoundError,
  RootNodeError,
  TreeTooDeepError,
} from "./node-errors";

type DomainError =
  | NodeNameConflictError
  | NodeNotFoundError
  | RootNodeError
  | TreeTooDeepError
  | UploadNotFoundError;

const STATUS: Record<string, HttpStatus> = {
  NodeNameConflictError: HttpStatus.CONFLICT,
  NodeNotFoundError: HttpStatus.NOT_FOUND,
  RootNodeError: HttpStatus.BAD_REQUEST,
  TreeTooDeepError: HttpStatus.BAD_REQUEST,
  UploadNotFoundError: HttpStatus.BAD_REQUEST,
};

// The services speak in domain errors and know nothing about HTTP; the mapping
// lives here once instead of in a try/catch per route.
@Catch(
  NodeNameConflictError,
  NodeNotFoundError,
  RootNodeError,
  TreeTooDeepError,
  UploadNotFoundError,
)
export class NodeExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const statusCode = STATUS[error.name] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message: error.message, error: error.name });
  }
}
