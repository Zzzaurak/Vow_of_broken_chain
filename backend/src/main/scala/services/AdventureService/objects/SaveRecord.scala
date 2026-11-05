package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class SaveRecord(id: SaveId, adventureId: AdventureId, kind: SaveKind, slot: Int, savedAt: String, snapshot: GameSnapshot)
object SaveRecord:
  given Encoder[SaveRecord] = deriveEncoder
  given Decoder[SaveRecord] = deriveDecoder
