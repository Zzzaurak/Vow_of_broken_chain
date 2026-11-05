package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class SaveId(value: String)
object SaveId:
  given Encoder[SaveId] = deriveEncoder
  given Decoder[SaveId] = deriveDecoder
