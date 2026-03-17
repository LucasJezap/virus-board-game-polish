import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";

@Injectable()
export class IdFactory {
  public createId(prefix: string): string {
    return `${prefix}_${randomBytes(6).toString("hex")}`;
  }

  public createRoomCode(): string {
    return randomBytes(3).toString("hex").toUpperCase();
  }

  public createInviteToken(): string {
    return randomBytes(12).toString("base64url");
  }
}
