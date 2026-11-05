package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class AdventureRecord(id: AdventureId, difficulty: Difficulty, createdAt: String)
object AdventureRecord:
  given Encoder[AdventureRecord] = deriveEncoder
  given Decoder[AdventureRecord] = deriveDecoder
