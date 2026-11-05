package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class GameSnapshot(schemaVersion: Int, contentVersion: String, difficulty: Difficulty, mapId: String, position: Position, checkpoint: String, stage: ProgressStage, completed: List[String], unlocked: List[Partner], supports: List[Partner], hp: Double, mp: Double, cooldowns: Cooldowns, playSeconds: Double)
object GameSnapshot:
  given Encoder[GameSnapshot] = deriveEncoder
  given Decoder[GameSnapshot] = deriveDecoder
