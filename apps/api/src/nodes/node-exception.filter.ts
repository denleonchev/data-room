import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { UploadNotFoundError } from "../files/file-errors";
import { ShareNotFoundError } from "../sharing/share-errors";
import {
  NodeMoveIntoOwnSubtreeError,
  NodeNameConflictError,
  NodeNotFoundError,
  RootNodeError,
  TreeTooDeepError,
} from "./node-errors";

type DomainError =
  | NodeMoveIntoOwnSubtreeError
  | NodeNameConflictError
  | NodeNotFoundError
  | RootNodeError
  | TreeTooDeepError
  | UploadNotFoundError
  | ShareNotFoundError;

const STATUS: Record<string, HttpStatus> = {
  NodeMoveIntoOwnSubtreeError: HttpStatus.BAD_REQUEST,
  NodeNameConflictError: HttpStatus.CONFLICT,
  NodeNotFoundError: HttpStatus.NOT_FOUND,
  RootNodeError: HttpStatus.BAD_REQUEST,
  TreeTooDeepError: HttpStatus.BAD_REQUEST,
  UploadNotFoundError: HttpStatus.BAD_REQUEST,
  ShareNotFoundError: HttpStatus.NOT_FOUND,
};

// The services speak in domain errors and know nothing about HTTP; the mapping
// lives here once instead of in a try/catch per route.
@Catch(
  NodeMoveIntoOwnSubtreeError,
  NodeNameConflictError,
  NodeNotFoundError,
  RootNodeError,
  TreeTooDeepError,
  UploadNotFoundError,
  ShareNotFoundError,
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
