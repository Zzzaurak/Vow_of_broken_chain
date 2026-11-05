package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class AdventureId(value: String)
object AdventureId:
  given Encoder[AdventureId] = deriveEncoder
  given Decoder[AdventureId] = deriveDecoder
