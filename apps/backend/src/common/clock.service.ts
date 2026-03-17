import { Injectable } from "@nestjs/common";

@Injectable()
export class ClockService {
  public now(): Date {
    return new Date();
  }

  public nowIso(): string {
    return this.now().toISOString();
  }
}
