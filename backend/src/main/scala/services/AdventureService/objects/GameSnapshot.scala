package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
final case class GameSnapshot(schemaVersion: Int, contentVersion: String, difficulty: Difficulty, mapId: String, position: Position, checkpoint: String, stage: ProgressStage, completed: List[String], unlocked: List[Partner], supports: List[Partner], hp: Double, mp: Double, cooldowns: Cooldowns, playSeconds: Double, exploration: ExplorationProgress = ExplorationProgress(Nil, Nil, Nil))
object GameSnapshot:
  given Encoder[GameSnapshot] = deriveEncoder
  given Decoder[GameSnapshot] = deriveDecoder[GameSnapshot].prepare(_.withFocus(_.mapObject { obj =>
    if obj.contains("exploration") then obj
    else obj.add("exploration", ExplorationProgress(Nil, Nil, Nil).asJson)
  }))
