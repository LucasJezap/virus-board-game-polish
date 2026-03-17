import { Injectable } from "@nestjs/common";
import {
  applyAction,
  createBaseDeck,
  createGame,
  listValidPlays,
  type GameAction,
  type ResolvedMoveAction,
  type PlayCardTarget,
} from "@wirus/game-engine";
import type { ClientGameIntent, PlayerId } from "@wirus/shared-types";

import type { MatchAggregate, RoomAggregate } from "../backend.types";
import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { RandomService } from "../common/random.service";

@Injectable()
export class GameService {
  public constructor(
    private readonly clockService: ClockService,
    private readonly idFactory: IdFactory,
    private readonly randomService: RandomService,
  ) {}

  public startMatch(room: RoomAggregate): MatchAggregate {
    const orderedPlayers = room.players
      .filter((player) => player.role === "PLAYER")
      .sort((left, right) => (left.seatIndex ?? 0) - (right.seatIndex ?? 0))
      .map((player) => player.playerId);

    const state = createGame({
      playerIds: orderedPlayers,
      orderedPlayerIds: orderedPlayers,
      orderedDeck: createBaseDeck(),
    });

    return {
      id: this.idFactory.createId("match"),
      startedAtIso: this.clockService.nowIso(),
      state,
      turnDeadlineIso: null,
      actionLog: [],
    };
  }

  public applyIntent(match: MatchAggregate, intent: ClientGameIntent): MatchAggregate {
    const action = this.toEngineAction(intent);
    return this.applyAction(match, action);
  }

  public applyAutoMove(match: MatchAggregate, playerId: PlayerId, mode: "AUTO_MOVE" | "BOT_MOVE"): MatchAggregate {
    const resolvedAction = this.pickSemiRandomMove(match, playerId);
    return this.applyAction(match, {
      type: mode,
      playerId,
      resolvedAction,
    });
  }

  private applyAction(match: MatchAggregate, action: GameAction): MatchAggregate {
    const result = applyAction(match.state, action);

    return {
      ...match,
      state: result.state,
      actionLog: [
        ...match.actionLog,
        {
          type: action.type,
          playerId: this.actionPlayerId(action),
          createdAtIso: this.clockService.nowIso(),
        },
      ],
    };
  }

  private pickSemiRandomMove(match: MatchAggregate, playerId: PlayerId): ResolvedMoveAction {
    const validPlays = listValidPlays(match.state, playerId);
    if (validPlays.length > 0) {
      const chosen = this.randomService.pickOne(validPlays);
      return {
        type: "PLAY_CARD",
        playerId,
        cardId: chosen.cardId,
        target: chosen.target,
      };
    }

    const player = match.state.players.find((candidate) => candidate.id === playerId);
    if (!player || player.hand.length === 0) {
      return {
        type: "DISCARD_CARDS",
        playerId,
        cardIds: [],
      };
    }

    const chosenCard = this.randomService.pickOne(player.hand);
    return {
      type: "DISCARD_CARDS",
      playerId,
      cardIds: [chosenCard.id],
    };
  }

  private toEngineAction(intent: ClientGameIntent): GameAction {
    switch (intent.type) {
      case "play_card":
        return {
          type: "PLAY_CARD",
          playerId: intent.playerId,
          cardId: intent.cardId,
          target: intent.target as PlayCardTarget,
        };
      case "discard_cards":
        return {
          type: "DISCARD_CARDS",
          playerId: intent.playerId,
          cardIds: intent.cardIds,
        };
      case "draw_card":
        return {
          type: "DRAW_CARD",
          playerId: intent.playerId,
        };
      case "end_turn":
        return {
          type: "END_TURN",
          playerId: intent.playerId,
        };
      case "request_rematch":
        throw new Error("Rematch is handled at room level");
    }
  }

  private actionPlayerId(action: GameAction): PlayerId {
    switch (action.type) {
      case "PLAY_CARD":
      case "DISCARD_CARDS":
      case "DRAW_CARD":
      case "END_TURN":
      case "AUTO_MOVE":
      case "BOT_MOVE":
        return action.playerId;
    }
  }
}
